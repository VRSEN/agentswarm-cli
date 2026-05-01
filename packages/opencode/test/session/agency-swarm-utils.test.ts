import { describe, expect, test } from "bun:test"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import {
  asRawString,
  asString,
  buildOutgoingMessage,
  collectFileURLs,
  compactMetadata,
  extractEventMeta,
  findRecipientAgent,
  hasAgencyHandoffEvidence,
  parseToolInput,
} from "../../src/session/agency-swarm-utils"

const sessionID = SessionID.make("session")
const messageID = MessageID.make("message")
const providerID = ProviderID.make("test")
const modelID = ModelID.make("test")

function msg(parts: MessageV2.WithParts["parts"]): MessageV2.WithParts {
  return {
    info: {
      id: messageID,
      sessionID,
      role: "user",
      time: { created: 1 },
      agent: "build",
      model: {
        providerID,
        modelID,
      },
    },
    parts,
  }
}

function file(id: string, value: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">): MessageV2.FilePart {
  return {
    id: PartID.make(id),
    sessionID,
    messageID,
    ...value,
  }
}

function text(id: string, value: Omit<MessageV2.TextPart, "id" | "sessionID" | "messageID">): MessageV2.TextPart {
  return {
    id: PartID.make(id),
    sessionID,
    messageID,
    ...value,
  }
}

function agent(id: string, value: Omit<MessageV2.AgentPart, "id" | "sessionID" | "messageID">): MessageV2.AgentPart {
  return {
    id: PartID.make(id),
    sessionID,
    messageID,
    ...value,
  }
}

describe("session.agency-swarm-utils", () => {
  test("asRawString preserves whitespace-only deltas", () => {
    expect(asRawString(" hello")).toBe(" hello")
    expect(asRawString("\n\n")).toBe("\n\n")
    expect(asRawString(" ")).toBe(" ")
  })

  test("asString keeps trimmed semantics for identifiers/metadata", () => {
    expect(asString("  agent-name  ")).toBe("agent-name")
    expect(asString("   ")).toBeUndefined()
  })

  test("parseToolInput accepts objects and JSON strings", () => {
    expect(parseToolInput({ foo: "bar" })).toEqual({ foo: "bar" })
    expect(parseToolInput('{ "foo": "bar" }')).toEqual({ foo: "bar" })
    expect(parseToolInput("123")).toEqual({ value: 123 })
    expect(parseToolInput(" hello ")).toEqual({ raw: "hello" })
    expect(parseToolInput(undefined)).toEqual({})
  })

  test("extractEventMeta and compactMetadata normalize caller agent", () => {
    expect(
      extractEventMeta({
        agent: "Planner",
        callerAgent: "None",
        agent_run_id: "run-1",
        parent_run_id: "parent-1",
      }),
    ).toEqual({
      agent: "Planner",
      callerAgent: null,
      agentRunID: "run-1",
      parentRunID: "parent-1",
    })
    expect(
      compactMetadata({
        agent: "Planner",
        callerAgent: null,
        agentRunID: "run-1",
        parentRunID: "parent-1",
      }),
    ).toEqual({
      agent: "Planner",
      callerAgent: null,
      agent_run_id: "run-1",
      parent_run_id: "parent-1",
    })
  })

  test("collectFileURLs keeps valid file parts and normalizes file URLs", () => {
    expect(
      collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "text/plain",
            url: "file:///tmp/spec.md",
            filename: "spec.md",
          }),
          file("part-2", {
            type: "file",
            mime: "application/pdf",
            url: "https://example.com/plan.pdf",
          }),
          file("part-3", {
            type: "file",
            mime: "text/plain",
            url: "not-a-url",
          }),
          file("part-4", {
            type: "file",
            mime: "image/png",
            url: "data:image/png;base64,AAA=",
            filename: "inline.png",
            source: {
              type: "file",
              path: "/tmp/inline.png",
              text: {
                value: "[Image 1]",
                start: 0,
                end: 9,
              },
            },
          }),
        ]),
        {
          allowLocalFilePaths: true,
        },
      ),
    ).toEqual({
      "spec.md": "/tmp/spec.md",
      "plan.pdf": "https://example.com/plan.pdf",
      "inline.png": "/tmp/inline.png",
    })
  })

  test("collectFileURLs blocks data URL attachments without an allowed local file path", () => {
    expect(() =>
      collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "image/png",
            url: "data:image/png;base64,AAA=",
            filename: "inline.png",
          }),
        ]),
      ),
    ).toThrow("Agent Swarm Run mode cannot send inline image data")

    expect(() =>
      collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "image/png",
            url: "data:image/png;base64,AAA=",
            filename: "inline.png",
            source: {
              type: "file",
              path: "/tmp/inline.png",
              text: {
                value: "[Image 1]",
                start: 0,
                end: 9,
              },
            },
          }),
        ]),
        {
          allowLocalFilePaths: false,
        },
      ),
    ).toThrow("Agent Swarm Run mode cannot send local image files to a remote Agency server")
  })

  test("buildOutgoingMessage and findRecipientAgent use the final visible parts", () => {
    expect(
      buildOutgoingMessage(
        msg([
          text("part-1", { type: "text", text: " first " }),
          text("part-2", { type: "text", text: "ignored", ignored: true }),
          text("part-3", { type: "text", text: "<system-reminder>local only</system-reminder>", synthetic: true }),
          text("part-4", {
            type: "text",
            text: "<system-reminder>local only</system-reminder>\n\nhandoff",
            synthetic: true,
          }),
          text("part-5", { type: "text", text: " context ", synthetic: true }),
          text("part-6", { type: "text", text: " second " }),
        ]),
      ),
    ).toBe("first\n\nhandoff\n\ncontext\n\nsecond")
    expect(
      findRecipientAgent(
        msg([
          agent("part-4", { type: "agent", name: "Planner" }),
          agent("part-5", { type: "agent", name: "Reviewer" }),
        ]),
      ),
    ).toBe("Reviewer")
  })

  test("hasAgencyHandoffEvidence accepts handoff output item metadata", () => {
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "tool",
          state: {
            status: "completed",
            metadata: {
              item_type: "handoff_output_item",
            },
          },
        },
      ]),
    ).toBeTrue()
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "tool",
          metadata: {
            type: "handoff_output_item",
          },
        },
      ]),
    ).toBeTrue()
  })

  test("hasAgencyHandoffEvidence accepts agent_updated_stream_event metadata", () => {
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "text",
          text: "Math agent now has control.",
          metadata: {
            agency_handoff_event: "agent_updated_stream_event",
            assistant: "MathAgent",
          },
        },
      ]),
    ).toBeTrue()
  })

  test("hasAgencyHandoffEvidence rejects non-handoff metadata", () => {
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "tool",
          state: {
            status: "completed",
            metadata: {
              item_type: "function_call_output",
            },
          },
        },
        {
          type: "tool",
          tool: "tool",
          metadata: {
            item_type: "tool_call_output_item",
          },
        },
        {
          type: "text",
          text: "assistant response",
          metadata: {
            item_type: "handoff_output_item",
          },
        },
      ]),
    ).toBeFalse()
  })
})
