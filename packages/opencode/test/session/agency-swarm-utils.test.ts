import { describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir as osTmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import {
  asRawString,
  asString,
  buildOutgoingMessage,
  localFileMaterializationRoot,
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

  test("collectFileURLs keeps valid file parts and materializes local data URL files", async () => {
    const imageContent = Buffer.from("inline image")
    const pdfContent = Buffer.from("%PDF-1.4\n")
    const materializedFilePaths: string[] = []
    const result = collectFileURLs(
      msg([
        file("part-1", {
          type: "file",
          mime: "application/pdf",
          url: "https://example.com/plan.pdf",
        }),
        file("part-2", {
          type: "file",
          mime: "text/plain",
          url: "not-a-url",
        }),
        file("part-3", {
          type: "file",
          mime: "image/png",
          url: `data:image/png;base64,${imageContent.toString("base64")}`,
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
        file("part-4", {
          type: "file",
          mime: "application/pdf",
          url: `data:application/pdf;base64,${pdfContent.toString("base64")}`,
          filename: "report.pdf",
          source: {
            type: "file",
            path: "/tmp/report.pdf",
            text: {
              value: "[PDF 1]",
              start: 10,
              end: 17,
            },
          },
        }),
      ]),
      {
        allowLocalFilePaths: true,
        materializeLocalFilePaths: true,
        materializedFilePaths,
      },
    )

    const inline = result?.["inline.png"]
    const pdf = result?.["report.pdf"]
    expect(inline).toBeDefined()
    expect(pdf).toBeDefined()
    const inlinePath = inline!
    const pdfPath = pdf!
    expect(inlinePath.startsWith(`${path.resolve(localFileMaterializationRoot())}${path.sep}`)).toBeTrue()
    expect(pdfPath.startsWith(`${path.resolve(localFileMaterializationRoot())}${path.sep}`)).toBeTrue()
    expect(path.basename(inlinePath)).toBe("inline.png")
    expect(path.basename(pdfPath)).toBe("report.pdf")
    expect(materializedFilePaths).toEqual([inlinePath, pdfPath])

    try {
      expect(result).toEqual({
        "plan.pdf": "https://example.com/plan.pdf",
        "inline.png": inlinePath,
        "report.pdf": pdfPath,
      })
      await expect(readFile(inlinePath)).resolves.toEqual(imageContent)
      await expect(readFile(pdfPath)).resolves.toEqual(pdfContent)
    } finally {
      await Promise.all([
        rm(path.dirname(inlinePath), { recursive: true, force: true }),
        rm(path.dirname(pdfPath), { recursive: true, force: true }),
      ])
    }
  })

  test("collectFileURLs preserves local data URL source paths without materialization", () => {
    const sourcePath = "/tmp/report.pdf"
    const result = collectFileURLs(
      msg([
        file("part-1", {
          type: "file",
          mime: "application/pdf",
          url: `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n").toString("base64")}`,
          filename: "report.pdf",
          source: {
            type: "file",
            path: sourcePath,
            text: {
              value: "[PDF 1]",
              start: 0,
              end: 7,
            },
          },
        }),
      ]),
      {
        allowLocalFilePaths: true,
      },
    )

    expect(result).toEqual({
      "report.pdf": sourcePath,
    })
  })

  test("collectFileURLs preserves file URL attachments for manually connected local Agency servers", async () => {
    const sourceDir = await mkdtemp(path.join(osTmpdir(), "agentswarm-file-url-source-"))
    const sourcePath = path.join(sourceDir, "outside-project.txt")
    const content = Buffer.from("outside project")
    await Bun.write(sourcePath, content)

    const materializedFilePaths: string[] = []
    try {
      const result = collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "text/plain",
            url: pathToFileURL(sourcePath).href,
            filename: "outside-project.txt",
          }),
        ]),
        {
          allowLocalFilePaths: true,
          materializedFilePaths,
        },
      )

      expect(result).toEqual({
        "outside-project.txt": sourcePath,
      })
      expect(materializedFilePaths).toEqual([])
      await expect(readFile(sourcePath)).resolves.toEqual(content)
    } finally {
      await rm(sourceDir, { recursive: true, force: true })
    }
  })

  test("collectFileURLs materializes file URL attachments for launcher Agency servers", async () => {
    const sourceDir = await mkdtemp(path.join(osTmpdir(), "agentswarm-file-url-source-"))
    const sourcePath = path.join(sourceDir, "outside-project.txt")
    const content = Buffer.from("outside project")
    await Bun.write(sourcePath, content)

    const materializedFilePaths: string[] = []
    let filepath: string | undefined
    try {
      const result = collectFileURLs(
        msg([
          file("part-1", {
            type: "file",
            mime: "text/plain",
            url: pathToFileURL(sourcePath).href,
            filename: "outside-project.txt",
          }),
        ]),
        {
          allowLocalFilePaths: true,
          materializeLocalFilePaths: true,
          materializedFilePaths,
        },
      )

      filepath = result?.["outside-project.txt"]
      expect(filepath).toBeDefined()
      expect(filepath).not.toBe(sourcePath)
      expect(filepath!.startsWith(`${path.resolve(localFileMaterializationRoot())}${path.sep}`)).toBeTrue()
      expect(path.basename(filepath!)).toBe("outside-project.txt")
      expect(materializedFilePaths).toEqual([filepath!])
      await expect(readFile(filepath!)).resolves.toEqual(content)
    } finally {
      await Promise.all([
        rm(sourceDir, { recursive: true, force: true }),
        filepath && filepath !== sourcePath
          ? rm(path.dirname(filepath), { recursive: true, force: true })
          : Promise.resolve(),
      ])
    }
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
    ).toThrow("Agent Swarm Run mode cannot send local files to a remote Agency server")
  })

  test("collectFileURLs materializes clipboard images for manually connected local Agency servers", async () => {
    const content = Buffer.from("clipboard image")
    const materializedFilePaths: string[] = []
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
        materializedFilePaths,
      },
    )

    const filepath = result?.["clipboard"]
    expect(filepath).toBeDefined()
    expect(path.isAbsolute(filepath!)).toBeTrue()
    expect(filepath!.startsWith(`${path.resolve(localFileMaterializationRoot())}${path.sep}`)).toBeTrue()
    expect(path.basename(filepath!)).toBe("clipboard-image.png")
    expect(materializedFilePaths).toEqual([filepath!])

    try {
      await expect(readFile(filepath!)).resolves.toEqual(content)
    } finally {
      await rm(path.dirname(filepath!), { recursive: true, force: true })
    }
  })

  test("collectFileURLs materializes clipboard images for launcher-managed local Agency servers", async () => {
    const content = Buffer.from("clipboard image")
    const materializedFilePaths: string[] = []
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
        materializeLocalFilePaths: true,
        materializedFilePaths,
      },
    )

    const filepath = result?.["clipboard"]
    expect(filepath).toBeDefined()
    expect(path.isAbsolute(filepath!)).toBeTrue()
    expect(filepath!.startsWith(`${path.resolve(localFileMaterializationRoot())}${path.sep}`)).toBeTrue()
    expect(path.basename(filepath!)).toBe("clipboard-image.png")
    expect(materializedFilePaths).toEqual([filepath!])

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
