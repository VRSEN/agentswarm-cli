import { describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import {
  asRawString,
  asString,
  buildOutgoingMessage,
  buildStructuredOutgoingMessage,
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
    expect(
      extractEventMeta({
        agent: "Reviewer",
        caller_agent: "Planner",
        agentRunID: "run-2",
        parentRunID: "parent-2",
      }),
    ).toEqual({
      agent: "Reviewer",
      callerAgent: "Planner",
      agentRunID: "run-2",
      parentRunID: "parent-2",
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

  test("collectFileURLs materializes clipboard images for local Agency servers", async () => {
    const content = Buffer.from("clipboard image")
    const result = collectFileURLs(
      msg([
        file("part-1", {
          type: "file",
          mime: "image/png",
          url: `data:image/png;base64,${content.toString("base64")}`,
          filename: "clipboard",
          source: {
            type: "file",
            path: "clipboard",
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
    )

    const filepath = result?.["clipboard"]
    expect(filepath).toBeDefined()
    expect(path.isAbsolute(filepath!)).toBeTrue()
    expect(filepath!.startsWith(path.join(os.tmpdir(), "agentswarm-clipboard-"))).toBeTrue()
    expect(path.basename(filepath!)).toBe("clipboard-image.png")

    try {
      await expect(readFile(filepath!)).resolves.toEqual(content)
    } finally {
      await rm(path.dirname(filepath!), { recursive: true, force: true })
    }
  })

  test("collectFileURLs blocks clipboard images for remote Agency servers", () => {
    expect(() =>
      collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "image/png",
            url: "data:image/png;base64,AAA=",
            filename: "clipboard",
            source: {
              type: "file",
              path: "clipboard",
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
    ).toThrow("Agent Swarm Run mode cannot send inline image data")
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

  test("buildStructuredOutgoingMessage forwards attachments as Responses content", () => {
    const encoded = Buffer.from("pdf content").toString("base64")

    expect(
      buildStructuredOutgoingMessage(
        msg([
          text("part-1", {
            type: "text",
            text: "[PDF 1] Which phrase appears here?",
            ignored: false,
          }),
          file("part-2", {
            type: "file",
            mime: "application/pdf",
            filename: "proof.pdf",
            url: `data:application/pdf;base64,${encoded}`,
            source: {
              type: "file",
              path: "/tmp/proof.pdf",
              text: {
                value: "[PDF 1]",
                start: 0,
                end: 7,
              },
            },
          }),
        ]),
      ),
    ).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_data: `data:application/pdf;base64,${encoded}`,
            filename: "proof.pdf",
          },
          {
            type: "input_text",
            text: "[PDF 1] Which phrase appears here?",
          },
        ],
      },
    ])
  })

  test("buildStructuredOutgoingMessage encodes readable local file attachments", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-structured-file-"))
    const filepath = path.join(dir, "proof.txt")
    const content = Buffer.from("local proof")
    await writeFile(filepath, content)

    try {
      expect(
        buildStructuredOutgoingMessage(
          msg([
            file("part-1", {
              type: "file",
              mime: "text/plain",
              filename: "proof.txt",
              url: pathToFileURL(filepath).href,
            }),
          ]),
        ),
      ).toEqual([
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_data: `data:text/plain;base64,${content.toString("base64")}`,
              filename: "proof.txt",
            },
          ],
        },
      ])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("buildStructuredOutgoingMessage skips expanded local text file data", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-structured-text-"))
    const filepath = path.join(dir, "proof.txt")
    await writeFile(filepath, "expanded proof")

    try {
      expect(
        buildStructuredOutgoingMessage(
          msg([
            text("part-1", {
              type: "text",
              synthetic: true,
              text: 'Called the Read tool with the following input: {"filePath":"proof.txt"}',
              ignored: false,
            }),
            text("part-2", {
              type: "text",
              synthetic: true,
              text: "expanded proof",
              ignored: false,
            }),
            file("part-3", {
              type: "file",
              mime: "text/plain",
              filename: "proof.txt",
              url: pathToFileURL(filepath).href,
              source: {
                type: "file",
                path: filepath,
                text: {
                  value: "[File 1]",
                  start: 0,
                  end: 8,
                },
              },
            }),
          ]),
        ),
      ).toEqual([
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: 'Called the Read tool with the following input: {"filePath":"proof.txt"}\n\nexpanded proof',
            },
          ],
        },
      ])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("buildStructuredOutgoingMessage skips directory file data and keeps expanded text", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-structured-directory-"))

    try {
      expect(
        buildStructuredOutgoingMessage(
          msg([
            text("part-1", {
              type: "text",
              text: "[Directory 1]\n- src\n- package.json",
              ignored: false,
            }),
            file("part-2", {
              type: "file",
              mime: "application/x-directory",
              filename: "project",
              url: pathToFileURL(dir).href,
            }),
          ]),
        ),
      ).toEqual([
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "[Directory 1]\n- src\n- package.json",
            },
          ],
        },
      ])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("buildStructuredOutgoingMessage rejects missing local file attachments", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-missing-file-"))
    const filepath = path.join(dir, "missing.txt")
    await rm(dir, { recursive: true, force: true })

    expect(() =>
      buildStructuredOutgoingMessage(
        msg([
          file("part-1", {
            type: "file",
            mime: "text/plain",
            filename: "missing.txt",
            url: pathToFileURL(filepath).href,
          }),
        ]),
      ),
    ).toThrow('Agent Swarm Run mode cannot read local attachment "missing.txt"')
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

  test("hasAgencyHandoffEvidence rejects nested forwarded handoff metadata", () => {
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "transfer_to_MathAgent",
          metadata: {
            callerAgent: "UserSupportAgent",
            parent_run_id: "run_parent",
          },
        },
        {
          type: "tool",
          tool: "SendMessage",
          state: {
            status: "completed",
            metadata: {
              item_type: "handoff_output_item",
              assistant: "MathAgent",
              callerAgent: "UserSupportAgent",
              parentRunID: "run_parent",
            },
          },
        },
        {
          type: "text",
          text: "Nested agent update.",
          metadata: {
            agency_handoff_event: "agent_updated_stream_event",
            assistant: "MathAgent",
            callerAgent: "UserSupportAgent",
          },
        },
      ]),
    ).toBeFalse()
  })
})
