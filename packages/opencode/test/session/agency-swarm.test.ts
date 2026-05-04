import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Auth } from "../../src/auth"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { Env } from "../../src/env"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"
import { MessageID, PartID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"

describe("session.agency-swarm", () => {
  const originalDiscover = AgencySwarmAdapter.discover
  const originalGetMetadata = AgencySwarmAdapter.getMetadata
  const originalStreamRun = AgencySwarmAdapter.streamRun
  const originalCancel = AgencySwarmAdapter.cancel
  const originalLoad = AgencySwarmHistory.load
  const originalAppendMessages = AgencySwarmHistory.appendMessages
  const originalSetLastRunID = AgencySwarmHistory.setLastRunID
  const originalFetch = globalThis.fetch

  afterEach(() => {
    mock.restore()
    AgencySwarmAdapter.discover = originalDiscover
    AgencySwarmAdapter.getMetadata = originalGetMetadata
    AgencySwarmAdapter.streamRun = originalStreamRun
    AgencySwarmAdapter.cancel = originalCancel
    AgencySwarmHistory.load = originalLoad
    AgencySwarmHistory.appendMessages = originalAppendMessages
    AgencySwarmHistory.setLastRunID = originalSetLastRunID
    globalThis.fetch = originalFetch
  })

  const helper = () => {
    const abort = new AbortController()
    const options: SessionAgencySwarm.RuntimeOptions = {
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      discoveryTimeoutMs: 5000,
    }
    const input = {
      sessionID: "session_1" as any,
      assistantMessage: {
        id: "message_assistant_1",
        parentID: "message_user_1",
        role: "assistant",
        mode: "Default",
        agent: "Default",
        path: {
          cwd: "/",
          root: "/",
        },
        cost: 0,
        tokens: {
          total: 0,
          input: 0,
          output: 0,
          reasoning: 0,
          cache: { read: 0, write: 0 },
        },
        modelID: "default",
        providerID: "agency-swarm",
        time: {
          created: Date.now(),
        },
        sessionID: "session_1",
      } as any,
      userMessage: {
        info: {
          id: "message_user_1",
          role: "user",
        },
        parts: [
          {
            type: "text",
            text: "hello",
            ignored: false,
          },
        ],
      } as any,
      options,
      abort: abort.signal,
    } as Parameters<typeof SessionAgencySwarm.stream>[0]

    return {
      input,
      triggerCancel: () => abort.abort(),
      triggerAbort: () => abort.abort(),
    }
  }

  const mockHistory = (lastRunID?: string, initialChatHistory: unknown[] = []) => {
    const appended: unknown[][] = []
    const runs: (string | undefined)[] = []
    const chatHistory: unknown[] = [...initialChatHistory]
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: chatHistory,
      last_run_id: lastRunID,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async (_scope, newMessages) => {
      const messages = Array.isArray(newMessages) ? newMessages : []
      appended.push(messages)
      chatHistory.push(...messages)
      return {
        scope: "scope",
        chat_history: chatHistory,
        updated_at: Date.now(),
      }
    }) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async (_scope, runID) => {
      runs.push(runID)
      return {
        scope: "scope",
        chat_history: [],
        last_run_id: runID,
        updated_at: Date.now(),
      }
    }) as typeof AgencySwarmHistory.setLastRunID
    return { appended, runs }
  }

  const mockAgencyVersion = (version: string) => {
    AgencySwarmAdapter.getMetadata = (async () => ({
      agency_swarm_version: version,
      metadata: {
        agents: ["AgentA"],
      },
      nodes: [],
    })) as typeof AgencySwarmAdapter.getMetadata
  }

  const addCompletedTransferPart = async (input: {
    sessionID: string
    messageID: string
    tool: string
    output?: string
    start?: number
    end?: number
  }) => {
    await Session.updatePart({
      id: PartID.ascending(),
      messageID: input.messageID as any,
      sessionID: input.sessionID as any,
      type: "tool",
      callID: "call_handoff",
      tool: input.tool,
      state: {
        status: "completed",
        input: {},
        output: input.output ?? "{}",
        title: "",
        metadata: {},
        time: {
          start: input.start ?? Date.now(),
          end: input.end ?? Date.now(),
        },
      },
    })
  }

  test("optionsFromProvider applies defaults", () => {
    const options = SessionAgencySwarm.optionsFromProvider(undefined)

    expect(options.baseURL).toBe(AgencySwarmAdapter.DEFAULT_BASE_URL)
    expect(options.discoveryTimeoutMs).toBe(AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS)
    expect(options.agency).toBeUndefined()
  })

  test("optionsFromProvider reads manual recipient selection timestamp", () => {
    const options = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm",
      name: "agency-swarm",
      key: undefined,
      models: {},
      options: {
        recipientAgent: "slides_agent",
        recipientAgentSelectedAt: 123,
      },
    } as any)

    expect(options.recipientAgent).toBe("slides_agent")
    expect(options.recipientAgentSelectedAt).toBe(123)
  })

  test("resolveAgency returns configured agency without discovery", async () => {
    let called = false
    AgencySwarmAdapter.discover = (async () => {
      called = true
      return { agencies: [], rawOpenAPI: {} }
    }) as typeof AgencySwarmAdapter.discover

    const agency = await SessionAgencySwarm.resolveAgency({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      discoveryTimeoutMs: 5000,
    })

    expect(agency).toBe("builder")
    expect(called).toBeFalse()
  })

  const droppedImageParts = (content: Buffer) =>
    [
      {
        type: "text",
        text: "[Image 1] inspect this image",
        ignored: false,
      },
      {
        type: "file",
        mime: "image/png",
        filename: "red-dot.png",
        url: `data:image/png;base64,${content.toString("base64")}`,
        source: {
          type: "file",
          path: "/tmp/red-dot.png",
          text: {
            value: "[Image 1]",
            start: 0,
            end: 9,
          },
        },
      },
    ] as any

  test("stream forwards dropped data URL images as structured message content", async () => {
    mockHistory()
    mockAgencyVersion("1.9.6")
    const content = Buffer.from("red dot image")
    let captured: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.message
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = droppedImageParts(content)

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:image/png;base64,${content.toString("base64")}`,
            detail: "auto",
          },
          {
            type: "input_text",
            text: "[Image 1] inspect this image",
          },
        ],
      },
    ])
  })

  test("stream sends legacy attachment payloads when metadata predates structured messages", async () => {
    mockHistory()
    mockAgencyVersion("1.9.4")
    let capturedMessage: unknown
    let capturedFileURLs: Record<string, string> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      capturedFileURLs = input.fileURLs
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "[PDF 1] Which phrase appears here?",
        ignored: false,
      },
      {
        type: "file",
        mime: "application/pdf",
        filename: "proof.pdf",
        url: "https://example.com/proof.pdf",
        source: {
          type: "file",
          path: "/tmp/proof.pdf",
          text: {
            value: "[PDF 1]",
            start: 0,
            end: 7,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toBe("[PDF 1] Which phrase appears here?")
    expect(capturedFileURLs).toEqual({
      "proof.pdf": "https://example.com/proof.pdf",
    })
  })

  test("stream keeps local directory attachments on legacy transport when metadata predates structured messages", async () => {
    await using tmp = await tmpdir()
    mockHistory()
    mockAgencyVersion("1.9.4")
    let capturedMessage: unknown
    let capturedFileURLs: Record<string, string> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      capturedFileURLs = input.fileURLs
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "[Directory 1] List the project files.",
        ignored: false,
      },
      {
        type: "file",
        mime: "application/octet-stream",
        filename: "project-dir",
        url: pathToFileURL(tmp.path).href,
        source: {
          type: "file",
          path: tmp.path,
          text: {
            value: "[Directory 1]",
            start: 0,
            end: 13,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toBe("[Directory 1] List the project files.")
    expect(capturedFileURLs).toEqual({
      "project-dir": tmp.path,
    })
  })

  test("stream skips directory file data on structured transport and sends expanded text", async () => {
    await using tmp = await tmpdir()
    mockHistory()
    mockAgencyVersion("1.9.6")
    let capturedMessage: unknown
    let capturedFileURLs: Record<string, string> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      capturedFileURLs = input.fileURLs
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "[Directory 1]\n- src\n- package.json",
        ignored: false,
      },
      {
        type: "file",
        mime: "application/x-directory",
        filename: "project-dir",
        url: pathToFileURL(tmp.path).href,
        source: {
          type: "file",
          path: tmp.path,
          text: {
            value: "[Directory 1]",
            start: 0,
            end: 13,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toEqual([
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
    expect(capturedFileURLs).toBeUndefined()
  })

  test("stream skips expanded local text file data on structured transport", async () => {
    await using tmp = await tmpdir()
    mockHistory()
    mockAgencyVersion("1.9.6")
    const filepath = path.join(tmp.path, "notes.txt")
    await writeFile(filepath, "visible text file contents")
    let capturedMessage: unknown
    let capturedFileURLs: Record<string, string> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      capturedFileURLs = input.fileURLs
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        synthetic: true,
        text: 'Called the Read tool with the following input: {"filePath":"notes.txt"}',
        ignored: false,
      },
      {
        type: "text",
        synthetic: true,
        text: "visible text file contents",
        ignored: false,
      },
      {
        type: "text",
        text: "Summarize it.",
        ignored: false,
      },
      {
        type: "file",
        mime: "text/plain",
        filename: "notes.txt",
        url: pathToFileURL(filepath).href,
        source: {
          type: "file",
          path: filepath,
          text: {
            value: "[notes.txt](file:///tmp/notes.txt)",
            start: 0,
            end: 32,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: 'Called the Read tool with the following input: {"filePath":"notes.txt"}\n\nvisible text file contents\n\nSummarize it.',
          },
        ],
      },
    ])
    expect(capturedFileURLs).toBeUndefined()
  })

  test("stream keeps local PDF file data on structured transport", async () => {
    await using tmp = await tmpdir()
    mockHistory()
    mockAgencyVersion("1.9.6")
    const content = Buffer.from("%PDF proof")
    const filepath = path.join(tmp.path, "proof.pdf")
    await writeFile(filepath, content)
    let capturedMessage: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "[PDF 1] Which phrase appears here?",
        ignored: false,
      },
      {
        type: "file",
        mime: "application/pdf",
        filename: "proof.pdf",
        url: pathToFileURL(filepath).href,
        source: {
          type: "file",
          path: filepath,
          text: {
            value: "[PDF 1]",
            start: 0,
            end: 7,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_data: `data:application/pdf;base64,${content.toString("base64")}`,
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

  test("stream keeps browser auth client_config while forwarding attachments inline", async () => {
    mockHistory()
    mockAgencyVersion("1.9.6")
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)

    const content = Buffer.from("red dot image")
    let capturedClientConfig: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedClientConfig = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    try {
      const { input } = helper()
      input.userMessage.parts = droppedImageParts(content)

      const stream = await SessionAgencySwarm.stream(input)
      for await (const _event of stream.fullStream) {
        // consume
      }

      expect(capturedClientConfig).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: {
          "ChatGPT-Account-Id": "acct_123",
        },
      })
    } finally {
      await Auth.remove("openai")
    }
  })

  test("stream replays stored attachment content into follow-up requests without duplicating history", async () => {
    mockAgencyVersion("1.9.6")
    const filePart = {
      type: "input_file",
      file_data: `data:application/pdf;base64,${Buffer.from("Attachment proof phrase one: cobalt lantern.").toString("base64")}`,
      filename: "proof.pdf",
    }
    const priorUser = {
      type: "message",
      role: "user",
      content: [
        filePart,
        {
          type: "input_text",
          text: "[PDF 1] In the attached PDF, what is the exact value of phrase two?",
        },
      ],
    }
    const priorAssistant = {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "silver compass" }],
    }
    const { appended } = mockHistory(undefined, [priorUser, priorAssistant])
    let capturedMessage: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      yield {
        type: "messages",
        payload: {
          new_messages: [
            {
              type: "message",
              role: "user",
              content: [
                filePart,
                {
                  type: "input_text",
                  text: "Without re-attaching the file, what is the exact value of phrase one?",
                },
              ],
            },
            {
              type: "message",
              id: "msg_follow_up",
              role: "assistant",
              content: [{ type: "output_text", text: "cobalt lantern" }],
            },
          ],
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "Without re-attaching the file, what is the exact value of phrase one?",
        ignored: false,
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toEqual([
      {
        role: "user",
        content: [
          filePart,
          {
            type: "input_text",
            text: "Without re-attaching the file, what is the exact value of phrase one?",
          },
        ],
      },
    ])
    expect(appended.at(-1)?.[0]).toEqual({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Without re-attaching the file, what is the exact value of phrase one?",
        },
      ],
    })
  })

  test("stream replays stored attachment content when the follow-up has a new attachment", async () => {
    mockAgencyVersion("1.9.6")
    const priorFilePart = {
      type: "input_file",
      file_data: `data:application/pdf;base64,${Buffer.from("Prior attachment phrase: cobalt lantern.").toString("base64")}`,
      filename: "prior.pdf",
    }
    const newFilePart = {
      type: "input_file",
      file_data: `data:application/pdf;base64,${Buffer.from("New attachment phrase: silver compass.").toString("base64")}`,
      filename: "new.pdf",
    }
    const priorUser = {
      type: "message",
      role: "user",
      content: [
        priorFilePart,
        {
          type: "input_text",
          text: "[PDF 1] What phrase appears here?",
        },
      ],
    }
    const priorAssistant = {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "cobalt lantern" }],
    }
    const { appended } = mockHistory(undefined, [priorUser, priorAssistant])
    let capturedMessage: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      yield {
        type: "messages",
        payload: {
          new_messages: [
            {
              type: "message",
              role: "user",
              content: [
                priorFilePart,
                newFilePart,
                {
                  type: "input_text",
                  text: "[PDF 2] Compare this new file with the previous one.",
                },
              ],
            },
            {
              type: "message",
              id: "msg_compare",
              role: "assistant",
              content: [{ type: "output_text", text: "compared" }],
            },
          ],
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = [
      {
        type: "text",
        text: "[PDF 2] Compare this new file with the previous one.",
        ignored: false,
      },
      {
        type: "file",
        mime: "application/pdf",
        filename: "new.pdf",
        url: newFilePart.file_data,
        source: {
          type: "file",
          path: "/tmp/new.pdf",
          text: {
            value: "[PDF 2]",
            start: 0,
            end: 7,
          },
        },
      },
    ] as any

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(capturedMessage).toEqual([
      {
        role: "user",
        content: [
          priorFilePart,
          newFilePart,
          {
            type: "input_text",
            text: "[PDF 2] Compare this new file with the previous one.",
          },
        ],
      },
    ])
    expect(appended.at(-1)?.[0]).toEqual({
      type: "message",
      role: "user",
      content: [
        newFilePart,
        {
          type: "input_text",
          text: "[PDF 2] Compare this new file with the previous one.",
        },
      ],
    })
  })

  test("stream replays compacted-session attachment content into follow-up requests", async () => {
    mockHistory()
    mockAgencyVersion("1.9.6")
    const fileData = `data:application/pdf;base64,${Buffer.from("Compacted proof phrase: amber beacon.").toString("base64")}`
    const currentID = MessageID.ascending()
    const compactedMessages = [
      {
        info: {
          id: "compact_user",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "compaction", auto: true, overflow: true }],
      },
      {
        info: {
          id: "summary",
          role: "assistant",
          parentID: "compact_user",
          providerID: "agency-swarm",
          agent: "Planner",
          summary: true,
          finish: "end_turn",
          time: { created: 2 },
        },
        parts: [{ type: "text", text: "summary body" }],
      },
      {
        info: {
          id: "user_after_compaction",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [
          { type: "text", text: "[PDF 1] What phrase is in this file?", ignored: false },
          {
            type: "file",
            mime: "application/pdf",
            filename: "proof.pdf",
            url: fileData,
            source: {
              type: "file",
              path: "/tmp/proof.pdf",
              text: {
                value: "[PDF 1]",
                start: 0,
                end: 7,
              },
            },
          },
        ],
      },
      {
        info: {
          id: "assistant_after_compaction",
          role: "assistant",
          parentID: "user_after_compaction",
          providerID: "agency-swarm",
          agent: "Reviewer",
          time: { created: 4 },
        },
        parts: [{ type: "text", text: "amber beacon" }],
      },
      {
        info: {
          id: currentID,
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "Without re-attaching it, repeat the phrase.", ignored: false }],
      },
    ] as any

    let capturedMessage: unknown
    let capturedHistory: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      capturedMessage = input.message
      capturedHistory = input.chatHistory
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const messagesSpy = spyOn(Session, "messages").mockResolvedValue(compactedMessages)
    try {
      const { input } = helper()
      input.userMessage.info.id = currentID
      input.userMessage.parts = [
        { type: "text", text: "Without re-attaching it, repeat the phrase.", ignored: false },
      ] as any

      const stream = await SessionAgencySwarm.stream(input)
      for await (const _event of stream.fullStream) {
        // consume
      }
    } finally {
      messagesSpy.mockRestore()
    }

    const filePart = {
      type: "input_file",
      file_data: fileData,
      filename: "proof.pdf",
    }
    expect(capturedHistory).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "summary body" }],
        agent: "Planner",
        callerAgent: null,
        timestamp: 2,
      },
      {
        type: "message",
        role: "user",
        content: [
          filePart,
          {
            type: "input_text",
            text: "[PDF 1] What phrase is in this file?",
          },
        ],
        agent: "build",
        callerAgent: null,
        timestamp: 3,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "amber beacon" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 4,
      },
    ])
    expect(capturedMessage).toEqual([
      {
        role: "user",
        content: [
          filePart,
          {
            type: "input_text",
            text: "Without re-attaching it, repeat the phrase.",
          },
        ],
      },
    ])
  })

  const clipboardImageParts = (content: Buffer) =>
    [
      {
        type: "text",
        text: "[Image 1] inspect this image",
        ignored: false,
      },
      {
        type: "file",
        mime: "image/png",
        filename: "clipboard",
        url: `data:image/png;base64,${content.toString("base64")}`,
        source: {
          type: "file",
          path: "clipboard",
          text: {
            value: "[Image 1]",
            start: 0,
            end: 9,
          },
        },
      },
    ] as any

  test("stream forwards clipboard data URL images as structured message content", async () => {
    mockHistory()
    mockAgencyVersion("1.9.6")
    const content = Buffer.from("clipboard image")
    let captured: unknown
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.message
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.userMessage.parts = clipboardImageParts(content)

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:image/png;base64,${content.toString("base64")}`,
            detail: "auto",
          },
          {
            type: "input_text",
            text: "[Image 1] inspect this image",
          },
        ],
      },
    ])
  })

  test("optionsFromProvider maps supported FastAPI request options", () => {
    const options = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm" as any,
      name: "Agency Swarm",
      source: "config",
      env: [],
      models: {},
      options: {
        baseURL: "http://127.0.0.1:8080",
        agency: "builder",
        recipientAgent: "Planner",
        additionalInstructions: "reply with short updates",
        userContext: {
          tenant: "acme",
        },
        fileIDs: ["file_1", "file_2"],
        generateChatName: true,
        clientConfig: {
          base_url: "https://proxy.example.com/v1",
        },
        discoveryTimeoutMs: 12000,
      },
    })

    expect(options.baseURL).toBe("http://127.0.0.1:8080")
    expect(options.agency).toBe("builder")
    expect(options.recipientAgent).toBe("Planner")
    expect(options.additionalInstructions).toBe("reply with short updates")
    expect(options.userContext).toEqual({ tenant: "acme" })
    expect(options.fileIDs).toEqual(["file_1", "file_2"])
    expect(options.generateChatName).toBeTrue()
    expect(options.clientConfig).toEqual({ base_url: "https://proxy.example.com/v1" })
    expect(options.discoveryTimeoutMs).toBe(12000)
  })

  test("optionsFromProvider maps forwardUpstreamCredentials", () => {
    const on = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm" as any,
      name: "Agency Swarm",
      source: "config",
      env: [],
      models: {},
      options: {
        baseURL: "http://192.168.1.10:8000",
        forwardUpstreamCredentials: true,
      },
    })
    expect(on.forwardUpstreamCredentials).toBe(true)
    const off = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm" as any,
      name: "Agency Swarm",
      source: "config",
      env: [],
      models: {},
      options: {
        baseURL: "http://192.168.1.10:8000",
      },
    })
    expect(off.forwardUpstreamCredentials).toBeUndefined()
  })

  test("optionsFromProvider prefers auth key token over config token", () => {
    const options = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm" as any,
      name: "Agency Swarm",
      source: "config",
      env: [],
      models: {},
      key: "auth-token",
      options: {
        token: "config-token",
      },
    })

    expect(options.token).toBe("auth-token")
  })

  test("stream preserves explicit client_config without auto-merging LiteLLM auth", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "sk-openai" } as any,
      anthropic: { type: "api", key: "sk-ant" } as any,
      nova: { type: "api", key: "nova-key" } as any,
      friendli: { type: "api", key: "friendli-key" } as any,
      lmstudio: { type: "api", key: "lmstudio-key" } as any,
      togetherai: { type: "api", key: "together-key" } as any,
      vercel: { type: "api", key: "vercel-key" } as any,
      "github-models": { type: "api", key: "github-models-key" } as any,
      "google-vertex": { type: "api", key: "vertex-key" } as any,
      "amazon-bedrock": { type: "api", key: "bedrock-key" } as any,
      "agency-swarm": { type: "api", key: "server-token" } as any,
      openrouter: { type: "api", key: "openrouter-key" } as any,
      github: { type: "oauth", access: "oauth-token" } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.clientConfig = {
      apiKey: "manual-openai",
      base_url: "https://proxy.example.com/v1",
      litellm_keys: {
        anthropic: "manual-ant",
        groq: "manual-groq",
      },
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "manual-openai",
      base_url: "https://proxy.example.com/v1",
      litellm_keys: {
        anthropic: "manual-ant",
        groq: "manual-groq",
      },
    })
  })

  test("stream does not forward stored API auth to remote agency-swarm servers", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "sk-openai" } as any,
      anthropic: { type: "api", key: "sk-ant" } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "https://agency.example.com"
    input.options.clientConfig = {
      base_url: "https://proxy.example.com/v1",
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      base_url: "https://proxy.example.com/v1",
    })
  })

  test("stream skips local auth loading for remote agency-swarm servers without credential forwarding", async () => {
    mockHistory()
    const authSpy = spyOn(Auth, "all").mockImplementation(async () => {
      throw new Error("auth store should not be loaded")
    }) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "https://agency.example.com"
    input.options.clientConfig = {
      base_url: "https://proxy.example.com/v1",
    }

    const stream = await SessionAgencySwarm.stream(input)
    const events: unknown[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(authSpy).not.toHaveBeenCalled()
    expect(events.some((event) => (event as any).type === "error")).toBeFalse()
    expect(captured).toEqual({
      base_url: "https://proxy.example.com/v1",
    })
  })

  test("stream skips metadata lookup when remote non-openai sessions have no generated auth payload", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      anthropic: { type: "api", key: "sk-ant" } as any,
    })) as typeof Auth.all

    let metadataCalls = 0
    AgencySwarmAdapter.getMetadata = (async () => {
      metadataCalls += 1
      throw new Error("metadata should not be fetched")
    }) as typeof AgencySwarmAdapter.getMetadata

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "https://agency.example.com"
    input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-6" }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(metadataCalls).toBe(0)
    expect(captured).toEqual({
      model: "litellm/anthropic/claude-sonnet-4-6",
    })
  })

  test("stream forwards stored API auth to remote URL when forwardUpstreamCredentials is true", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "sk-openai" } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "https://agency.example.com"
    input.options.forwardUpstreamCredentials = true

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "sk-openai",
    })
  })

  test("stream forwards stored API auth to 0.0.0.0 local agency-swarm servers", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "sk-openai" } as any,
      anthropic: { type: "api", key: "sk-ant" } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "http://0.0.0.0:8000"

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "sk-openai",
      litellm_keys: {
        anthropic: "sk-ant",
      },
    })
  })

  test("stream forwards stored API auth to host.docker.internal (Docker Desktop)", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "sk-openai" } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.baseURL = "http://host.docker.internal:8000"

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "sk-openai",
    })
  })

  test("stream sends stored OpenAI OAuth auth to a real local agency server", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      const stream = await SessionAgencySwarm.stream(input)
      const text: string[] = []
      for await (const event of stream.fullStream) {
        if (event.type === "text-delta") text.push(event.text)
      }

      expect(text).toEqual(["ok"])
      expect(body?.["client_config"]).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: {
          "ChatGPT-Account-Id": "acct_123",
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream forwards Codex OAuth when metadata reports agency-swarm 1.9.3+", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let forwardedClientConfig: Record<string, unknown> | undefined
    let downstreamAnthropicCall:
      | {
          apiKey?: string
          baseURL?: string
        }
      | undefined
    const server = createServer(async (request, response) => {
      if (request.url === "/builder/get_metadata") {
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(
          JSON.stringify({
            agency_swarm_version: "1.9.3",
            metadata: { agents: ["AgentA"] },
            nodes: [],
          }),
        )
        return
      }
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      forwardedClientConfig = body["client_config"] as Record<string, unknown> | undefined
      const litellmKeys =
        forwardedClientConfig &&
        typeof forwardedClientConfig["litellm_keys"] === "object" &&
        forwardedClientConfig["litellm_keys"] !== null
          ? (forwardedClientConfig["litellm_keys"] as Record<string, unknown>)
          : undefined
      const forwardedBaseURL =
        forwardedClientConfig && typeof forwardedClientConfig["base_url"] === "string"
          ? forwardedClientConfig["base_url"]
          : undefined
      downstreamAnthropicCall = {
        apiKey: typeof litellmKeys?.["anthropic"] === "string" ? litellmKeys["anthropic"] : undefined,
        // Mirrors the merged agency-swarm 1.9.3 contract from PR #630.
        baseURL: forwardedBaseURL === "https://chatgpt.com/backend-api/codex" ? undefined : forwardedBaseURL,
      }
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      const stream = await SessionAgencySwarm.stream(input)
      const text: string[] = []
      for await (const event of stream.fullStream) {
        if (event.type === "text-delta") text.push(event.text)
      }

      expect(text).toEqual(["ok"])
      expect(forwardedClientConfig).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: { "ChatGPT-Account-Id": "acct_123" },
        litellm_keys: { anthropic: "env-anthropic" },
      })
      expect(downstreamAnthropicCall).toEqual({
        apiKey: "env-anthropic",
        baseURL: undefined,
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream keeps Codex OAuth triplet when explicit client_config reveals non-OpenAI routing on 1.9.3+", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({})) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url === "/builder/get_metadata") {
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(
          JSON.stringify({
            agency_swarm_version: "1.9.3",
            metadata: { agents: ["AgentA"] },
            nodes: [],
          }),
        )
        return
      }
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.options.clientConfig = {
        litellm_keys: { anthropic: "manual-ant" },
      }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      const cfg = body?.["client_config"] as Record<string, unknown> | undefined
      expect(cfg).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: { "ChatGPT-Account-Id": "acct_123" },
        litellm_keys: { anthropic: "manual-ant" },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream keeps Codex OAuth triplet when a non-OpenAI session model targets 1.9.3+", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url === "/builder/get_metadata") {
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(
          JSON.stringify({
            agency_swarm_version: "1.9.3",
            metadata: { agents: ["AgentA"] },
            nodes: [],
          }),
        )
        return
      }
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-6" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: { "ChatGPT-Account-Id": "acct_123" },
        litellm_keys: { anthropic: "env-anthropic" },
        model: "litellm/anthropic/claude-sonnet-4-6",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream strips Codex OAuth triplet when metadata reports agency-swarm 1.9.2", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url === "/builder/get_metadata") {
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(
          JSON.stringify({
            agency_swarm_version: "1.9.2",
            metadata: { agents: ["AgentA"] },
            nodes: [],
          }),
        )
        return
      }
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-6" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        litellm_keys: { anthropic: "env-anthropic" },
        model: "litellm/anthropic/claude-sonnet-4-6",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream strips Codex OAuth triplet when metadata reports agency-swarm 1.9.3.dev1", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url === "/builder/get_metadata") {
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(
          JSON.stringify({
            agency_swarm_version: "1.9.3.dev1",
            metadata: { agents: ["AgentA"] },
            nodes: [],
          }),
        )
        return
      }
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-6" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        litellm_keys: { anthropic: "env-anthropic" },
        model: "litellm/anthropic/claude-sonnet-4-6",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream keeps Codex OAuth triplet when session model is a bare OpenAI id", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "oauth",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, { "Content-Type": "text/event-stream" })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "openai", modelID: "gpt-4o" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        api_key: "oauth-access",
        base_url: "https://chatgpt.com/backend-api/codex",
        default_headers: { "ChatGPT-Account-Id": "acct_123" },
        litellm_keys: { anthropic: "env-anthropic" },
        model: "gpt-4o",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream keeps stored OpenAI auth working when an Anthropic env key exists", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "stored-openai" } as any,
    })) as typeof Auth.all
    spyOn(Env, "all").mockImplementation(() => ({
      ANTHROPIC_API_KEY: "env-anthropic",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "api",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>

      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      const stream = await SessionAgencySwarm.stream(input)
      const text: string[] = []
      for await (const event of stream.fullStream) {
        if (event.type === "text-delta") text.push(event.text)
      }

      expect(text).toEqual(["ok"])
      expect(body?.["client_config"]).toEqual({
        api_key: "stored-openai",
        litellm_keys: {
          anthropic: "env-anthropic",
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  test("stream forwards session UI model as client_config.model (litellm/ for non-OpenAI)", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({})) as typeof Auth.all
    spyOn(Env, "all").mockImplementation(() => ({})) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({})) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>

      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-5" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        model: "litellm/anthropic/claude-sonnet-4-5",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  test("stream forwards session UI OpenAI model as bare model id", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({})) as typeof Auth.all
    spyOn(Env, "all").mockImplementation(() => ({})) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({})) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>

      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.sessionModel = { providerID: "openai", modelID: "gpt-4o" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        model: "gpt-4o",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  test("explicit client_config.model overrides session-derived model", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({})) as typeof Auth.all
    spyOn(Env, "all").mockImplementation(() => ({})) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({})) as typeof Provider.list

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>

      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.options.clientConfig = {
        model: "gpt-4o",
      }
      input.sessionModel = { providerID: "anthropic", modelID: "claude-sonnet-4-5" }
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
        /* drain */
      }

      expect(body?.["client_config"]).toEqual({
        model: "gpt-4o",
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  test("stream sends explicit LiteLLM client_config to a real local agency server", async () => {
    mockHistory()

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.options.clientConfig = {
        litellm_keys: {
          anthropic: "manual-ant",
        },
      }
      const stream = await SessionAgencySwarm.stream(input)
      const text: string[] = []
      for await (const event of stream.fullStream) {
        if (event.type === "text-delta") text.push(event.text)
      }

      expect(text).toEqual(["ok"])
      expect(body?.["client_config"]).toEqual({
        litellm_keys: {
          anthropic: "manual-ant",
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  test("stream sends explicit header-based client_config to a real local agency server", async () => {
    mockHistory()
    await Auth.set("openai", {
      type: "oauth",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 60_000,
      accountId: "acct_123",
    } as any)

    let body: Record<string, unknown> | undefined
    const server = createServer(async (request, response) => {
      if (request.url !== "/builder/get_response_stream") {
        response.writeHead(404)
        response.end("not found")
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of request) {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk)
        else chunks.push(Buffer.from(chunk))
      }
      body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
      })
      response.end(
        [
          'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"delta":"ok"}}}\n\n',
          "event: end\ndata: [DONE]\n\n",
        ].join(""),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === "string") {
      server.close()
      throw new Error("Expected local test server address")
    }

    try {
      const { input } = helper()
      input.options.baseURL = `http://127.0.0.1:${(address as AddressInfo).port}`
      input.options.clientConfig = {
        base_url: "https://proxy.example.com/v1",
        default_headers: {
          Authorization: "Bearer proxy-token",
        },
      }
      const stream = await SessionAgencySwarm.stream(input)
      const text: string[] = []
      for await (const event of stream.fullStream) {
        if (event.type === "text-delta") text.push(event.text)
      }

      expect(text).toEqual(["ok"])
      expect(body?.["client_config"]).toEqual({
        base_url: "https://proxy.example.com/v1",
        default_headers: {
          Authorization: "Bearer proxy-token",
        },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await Auth.remove("openai")
    }
  })

  test("stream prefers env OpenAI auth and forwards stored non-openai keys as litellm_keys", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: { type: "api", key: "stored-openai" } as any,
      anthropic: { type: "api", key: "stored-anthropic" } as any,
      azure: { type: "api", key: "stored-azure" } as any,
    })) as typeof Auth.all
    spyOn(Env, "all").mockImplementation(() => ({
      OPENAI_API_KEY: "env-openai",
      AZURE_RESOURCE_NAME: "azure-resource",
      AZURE_API_KEY: "env-azure",
      GOOGLE_GENERATIVE_AI_API_KEY: "env-google",
    })) as typeof Env.all
    spyOn(Provider, "list").mockImplementation(async () => ({
      openai: {
        id: "openai",
        name: "OpenAI",
        source: "api",
        env: ["OPENAI_API_KEY"],
        options: {},
        models: {},
      },
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        source: "api",
        env: ["ANTHROPIC_API_KEY"],
        options: {},
        models: {},
      },
      azure: {
        id: "azure",
        name: "Azure",
        source: "api",
        env: ["AZURE_RESOURCE_NAME", "AZURE_API_KEY"],
        options: {},
        models: {},
      },
      google: {
        id: "google",
        name: "Google",
        source: "api",
        env: ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
        options: {},
        models: {},
      },
      "agency-swarm": {
        id: "agency-swarm",
        name: "Agency Swarm",
        source: "config",
        env: [],
        options: {},
        models: {},
      },
    })) as typeof Provider.list

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "env-openai",
      litellm_keys: {
        anthropic: "stored-anthropic",
        azure: "stored-azure",
        gemini: "env-google",
      },
    })
  })

  test("stream does not refresh stored OpenAI OAuth when explicit OpenAI client_config exists", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: {
        type: "oauth",
        access: "expired-access",
        refresh: "expired-refresh",
        expires: 1,
      } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.clientConfig = {
      api_key: "manual-openai",
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "manual-openai",
    })
  })

  test("stream keeps explicit base_url when stored OpenAI OAuth exists", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: {
        type: "oauth",
        access: "oauth-access",
        refresh: "oauth-refresh",
        expires: Date.now() + 60_000,
      } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.clientConfig = {
      base_url: "https://proxy.example.com/v1",
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      base_url: "https://proxy.example.com/v1",
    })
  })

  test("stream preserves stored OpenAI OAuth when explicit base_url still targets Codex", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: {
        type: "oauth",
        access: "oauth-access",
        refresh: "oauth-refresh",
        expires: Date.now() + 60_000,
        accountId: "acct_123",
      } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.clientConfig = {
      base_url: "https://chatgpt.com/backend-api/codex/",
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      api_key: "oauth-access",
      base_url: "https://chatgpt.com/backend-api/codex/",
      default_headers: {
        "ChatGPT-Account-Id": "acct_123",
      },
    })
  })

  test("stream skips failing stored OpenAI OAuth refresh but still forwards non-OpenAI litellm keys", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: {
        type: "oauth",
        access: "expired-access",
        refresh: "expired-refresh",
        expires: 1,
      } as any,
      anthropic: { type: "api", key: "stored-anthropic" } as any,
    })) as typeof Auth.all
    globalThis.fetch = (async () => new Response("{}", { status: 401 })) as unknown as typeof globalThis.fetch

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      litellm_keys: {
        anthropic: "stored-anthropic",
      },
    })
  })

  test("stream preserves explicit header-based OpenAI auth without merging stored OAuth", async () => {
    mockHistory()
    spyOn(Auth, "all").mockImplementation(async () => ({
      openai: {
        type: "oauth",
        access: "oauth-access",
        refresh: "oauth-refresh",
        expires: Date.now() + 60_000,
      } as any,
    })) as typeof Auth.all

    let captured: Record<string, unknown> | undefined
    AgencySwarmAdapter.streamRun = async function* (input) {
      captured = input.clientConfig
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.clientConfig = {
      base_url: "https://proxy.example.com/v1",
      default_headers: {
        Authorization: "Bearer proxy-token",
      },
    }

    const stream = await SessionAgencySwarm.stream(input)
    for await (const _event of stream.fullStream) {
      // consume
    }

    expect(captured).toEqual({
      base_url: "https://proxy.example.com/v1",
      default_headers: {
        Authorization: "Bearer proxy-token",
      },
    })
  })

  test("resolveAgency uses single discovered agency", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [{ id: "builder", name: "Builder", agents: [], metadata: {} }],
      rawOpenAPI: {},
    })) as typeof AgencySwarmAdapter.discover

    const agency = await SessionAgencySwarm.resolveAgency({
      baseURL: "http://127.0.0.1:8000",
      discoveryTimeoutMs: 5000,
    })

    expect(agency).toBe("builder")
  })

  test("resolveAgency falls back to openapi agency ids when metadata discovery is empty", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [],
      rawOpenAPI: {
        paths: {
          "/builder/get_metadata": {},
        },
      },
    })) as typeof AgencySwarmAdapter.discover

    const agency = await SessionAgencySwarm.resolveAgency({
      baseURL: "http://127.0.0.1:8000",
      discoveryTimeoutMs: 5000,
    })

    expect(agency).toBe("builder")
  })

  test("normalizeCallerAgent converts string None to null", () => {
    expect(SessionAgencySwarm.normalizeCallerAgent("None")).toBeNull()
    expect(SessionAgencySwarm.normalizeCallerAgent("Main")).toBe("Main")
    expect(SessionAgencySwarm.normalizeCallerAgent(undefined)).toBeUndefined()
  })

  test("extractFunctionCallOutputs pulls tool outputs from messages payload", () => {
    const outputs = SessionAgencySwarm.extractFunctionCallOutputs([
      { type: "message", id: "m1" },
      { type: "function_call_output", call_id: "call_1", output: { value: 42 } },
      { type: "function_call_output", call_id: "call_2", output: "done" },
      {
        type: "handoff_output_item",
        call_id: "call_3",
        metadata: {
          caller_agent: "SupportAgent",
          parentRunID: "run_parent",
        },
        output: { assistant: "MathAgent" },
      },
    ])

    expect(outputs).toEqual([
      { callID: "call_1", output: '{\n  "value": 42\n}', metadata: {}, itemType: "function_call_output" },
      { callID: "call_2", output: "done", metadata: {}, itemType: "function_call_output" },
      {
        callID: "call_3",
        output: '{\n  "assistant": "MathAgent"\n}',
        metadata: {
          callerAgent: "SupportAgent",
          parentRunID: "run_parent",
        },
        itemType: "handoff_output_item",
      },
    ])
  })

  test("resolveAgency throws when multiple agencies are discovered", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [
        { id: "builder", name: "Builder", agents: [], metadata: {} },
        { id: "research", name: "Research", agents: [], metadata: {} },
      ],
      rawOpenAPI: {},
    })) as typeof AgencySwarmAdapter.discover

    await expect(
      SessionAgencySwarm.resolveAgency({
        baseURL: "http://127.0.0.1:8000",
        discoveryTimeoutMs: 5000,
      }),
    ).rejects.toThrow("Multiple agencies")
  })

  test("stream maps responses text, reasoning, and tool lifecycle into processor stream parts", async () => {
    const { appended, runs } = mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield { type: "meta", runID: "run_1" }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_1" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_1",
            output_index: "0",
            delta: "Hello",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.done",
            item_id: "msg_1",
            output_index: "0",
            text: "Hello",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: { type: "reasoning", id: "rs_1" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.delta",
            item_id: "rs_1",
            summary_index: "0",
            output_index: "1",
            delta: "Think",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.done",
            item_id: "rs_1",
            summary_index: "0",
            output_index: "1",
            text: "Think",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_1",
              call_id: "call_1",
              name: "lookup",
              arguments: '{"query":"test"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_1",
              call_id: "call_1",
              name: "lookup",
              arguments: '{"query":"test"}',
            },
          },
        },
      }
      yield {
        type: "messages",
        payload: {
          run_id: "run_1",
          usage: {
            input_tokens: 2,
            output_tokens: 3,
            output_tokens_details: { reasoning_tokens: 1 },
            input_tokens_details: { cached_tokens: 1 },
          },
          new_messages: [{ type: "function_call_output", call_id: "call_1", output: "done" }],
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []

    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "reasoning-start",
      "reasoning-delta",
      "reasoning-end",
      "tool-input-start",
      "tool-input-delta",
      "tool-call",
      "tool-result",
      "finish-step",
      "finish",
    ])
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("stop")
    expect(events.find((event) => event.type === "finish-step")?.usage).toMatchObject({
      inputTokens: 2,
      outputTokens: 3,
      reasoningTokens: 1,
      cachedInputTokens: 1,
    })
    expect(runs).toEqual(["run_1", "run_1"])
    expect(appended[0]).toEqual([{ type: "function_call_output", call_id: "call_1", output: "done" }])
  })

  test("stream maps non-function responses tool calls from response.*_call.* events", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: {
              type: "file_search_call",
              id: "fs_1",
              status: "in_progress",
              queries: [],
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.file_search_call.in_progress",
            item_id: "fs_1",
            output_index: "1",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.file_search_call.completed",
            item_id: "fs_1",
            output_index: "1",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "1",
            item: {
              type: "file_search_call",
              id: "fs_1",
              status: "completed",
              queries: [],
              results: [{ file_id: "file_1" }],
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const types = events.map((event) => event.type)
    expect(types).toContain("tool-input-start")
    expect(types).toContain("tool-call")
    expect(types).toContain("tool-result")
    expect(events.find((event) => event.type === "tool-result")?.output?.output).toContain("file_1")
    expect(types.at(-2)).toBe("finish-step")
  })

  test("stream skips stale configured recipient agent based on live metadata", async () => {
    mockHistory()
    let sentRecipient: string | undefined
    AgencySwarmAdapter.getMetadata = (async () => ({
      metadata: {
        agents: ["UserSupportAgent", "MathAgent"],
      },
    })) as typeof AgencySwarmAdapter.getMetadata
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentRecipient = args.recipientAgent ?? undefined
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.recipientAgent = "ExampleAgent2"
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(sentRecipient).toBeUndefined()
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("stop")
  })

  test("stream clears stale handoff routing for later swarm selection and honors ExampleAgent2 selection", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        const sentRecipients: Array<string | undefined> = []
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["ExampleAgent", "ExampleAgent2"],
          },
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipients.push(args.recipientAgent ?? undefined)
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "swarm selection clears stale handoff" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "ExampleAgent",
          agent: "ExampleAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
            completed: created + 2,
          },
        } as any)

        const swarmSelection = helper()
        swarmSelection.input.sessionID = session.id
        swarmSelection.input.assistantMessage.sessionID = session.id
        swarmSelection.input.options.recipientAgent = undefined
        ;(swarmSelection.input.options as any).recipientAgentSelectedAt = created + 3
        swarmSelection.input.userMessage.info.id = MessageID.ascending()
        swarmSelection.input.userMessage.parts = [{ type: "text", text: "use the swarm", ignored: false }] as any

        const swarmStream = await SessionAgencySwarm.stream(swarmSelection.input)
        for await (const _ of swarmStream.fullStream) {
        }

        const agentSelection = helper()
        agentSelection.input.sessionID = session.id
        agentSelection.input.assistantMessage.sessionID = session.id
        agentSelection.input.options.recipientAgent = "ExampleAgent2"
        ;(agentSelection.input.options as any).recipientAgentSelectedAt = created + 4
        agentSelection.input.userMessage.info.id = MessageID.ascending()
        agentSelection.input.userMessage.parts = [{ type: "text", text: "use agent 2", ignored: false }] as any

        const agentStream = await SessionAgencySwarm.stream(agentSelection.input)
        for await (const _ of agentStream.fullStream) {
        }

        expect(sentRecipients).toEqual([undefined, "ExampleAgent2"])
      },
    })
  })

  test("stream does not route to a normal prior assistant agent after local cache reset", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["ExampleAgent", "ExampleAgent2"],
          },
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "normal assistant after cache reset" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "ExampleAgent",
          agent: "ExampleAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
            completed: created + 2,
          },
        } as any)

        const followUp = helper()
        followUp.input.sessionID = session.id
        followUp.input.assistantMessage.sessionID = session.id
        followUp.input.options.recipientAgent = undefined
        followUp.input.userMessage.info.id = MessageID.ascending()
        followUp.input.userMessage.parts = [
          { type: "text", text: "first prompt after cache reset", ignored: false },
        ] as any

        const stream = await SessionAgencySwarm.stream(followUp.input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBeUndefined()
      },
    })
  })

  test("compactHistory rebuilds request history from the compacted session slice", () => {
    const msgs = [
      {
        info: {
          id: "compact_user",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "compaction", auto: true, overflow: true }],
      },
      {
        info: {
          id: "summary",
          role: "assistant",
          parentID: "compact_user",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Planner",
          path: { cwd: "/", root: "/" },
          cost: 0,
          summary: true,
          finish: "end_turn",
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "summary body" }],
      },
      {
        info: {
          id: "user_2",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "next question", ignored: false }],
      },
      {
        info: {
          id: "assistant_2",
          role: "assistant",
          parentID: "user_2",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 4 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "next answer" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "current prompt", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current" })).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "summary body" }],
        agent: "Planner",
        callerAgent: null,
        timestamp: 2,
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "next question" }],
        agent: "build",
        callerAgent: null,
        timestamp: 3,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "next answer" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 4,
      },
    ])
  })

  test("compactHistory preserves assistant caller agent metadata", () => {
    const msgs = [
      {
        info: {
          id: "compact_user",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "compaction", auto: true, overflow: true }],
      },
      {
        info: {
          id: "summary",
          role: "assistant",
          parentID: "compact_user",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Planner",
          path: { cwd: "/", root: "/" },
          cost: 0,
          summary: true,
          finish: "end_turn",
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "summary body", metadata: { agent: "Planner", callerAgent: null } }],
      },
      {
        info: {
          id: "user_2",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "next question", ignored: false }],
      },
      {
        info: {
          id: "assistant_2",
          role: "assistant",
          parentID: "user_2",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 4 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "next answer", metadata: { agent: "Reviewer", callerAgent: "Planner" } }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "current prompt", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current" })).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "summary body" }],
        agent: "Planner",
        callerAgent: null,
        timestamp: 2,
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "next question" }],
        agent: "build",
        callerAgent: null,
        timestamp: 3,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "next answer" }],
        agent: "Reviewer",
        callerAgent: "Planner",
        timestamp: 4,
      },
    ])
  })

  test("compactHistory preserves historical local file read text when the source file is gone", async () => {
    await using tmp = await tmpdir()
    const filepath = path.join(tmp.path, "proof.txt")
    await Bun.write(filepath, "current bytes")
    await rm(filepath)

    const msgs = [
      {
        info: {
          id: "compact_user",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "compaction", auto: true, overflow: true }],
      },
      {
        info: {
          id: "summary",
          role: "assistant",
          parentID: "compact_user",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Planner",
          path: { cwd: "/", root: "/" },
          cost: 0,
          summary: true,
          finish: "end_turn",
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "summary body" }],
      },
      {
        info: {
          id: "user_after_compaction",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [
          { type: "text", text: "[File 1]\noriginal bytes", ignored: false, synthetic: true },
          {
            type: "file",
            mime: "text/plain",
            filename: "proof.txt",
            url: pathToFileURL(filepath).href,
          },
        ],
      },
      {
        info: {
          id: "assistant_after_compaction",
          role: "assistant",
          parentID: "user_after_compaction",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 4 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "original bytes" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "repeat the file", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current", structuredAttachments: true })).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "summary body" }],
        agent: "Planner",
        callerAgent: null,
        timestamp: 2,
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "[File 1]\noriginal bytes" }],
        agent: "build",
        callerAgent: null,
        timestamp: 3,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "original bytes" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 4,
      },
    ])
  })

  test("compactHistory preserves same-turn attachments when skipping expanded local file replay", () => {
    const imageData = "data:image/png;base64,aW1hZ2U="
    const msgs = [
      {
        info: {
          id: "compact_user",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "compaction", auto: true, overflow: true }],
      },
      {
        info: {
          id: "summary",
          role: "assistant",
          parentID: "compact_user",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Planner",
          path: { cwd: "/", root: "/" },
          cost: 0,
          summary: true,
          finish: "end_turn",
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "summary body" }],
      },
      {
        info: {
          id: "user_after_compaction",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [
          { type: "text", text: "[File 1]\nold bytes", ignored: false, synthetic: true },
          {
            type: "file",
            mime: "text/plain",
            filename: "proof.txt",
            url: "file:///tmp/proof.txt",
          },
          {
            type: "file",
            mime: "image/png",
            filename: "diagram.png",
            url: imageData,
          },
        ],
      },
      {
        info: {
          id: "assistant_after_compaction",
          role: "assistant",
          parentID: "user_after_compaction",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 4 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "saw both" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "repeat the inputs", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current", structuredAttachments: true })).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "summary body" }],
        agent: "Planner",
        callerAgent: null,
        timestamp: 2,
      },
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_image", image_url: imageData, detail: "auto" },
          { type: "input_text", text: "[File 1]\nold bytes" },
        ],
        agent: "build",
        callerAgent: null,
        timestamp: 3,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "saw both" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 4,
      },
    ])
  })

  test("compactHistory falls back when no compaction summary exists", () => {
    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "first question", ignored: false }],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "first answer" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "current prompt", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current" })).toBeUndefined()
  })

  test("compactHistory falls back when visible history mixes providers", () => {
    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "openai", modelID: "gpt-5" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "first question", ignored: false }],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "openai",
          modelID: "gpt-5",
          mode: "Default",
          agent: "Assistant",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "first answer" }],
      },
      {
        info: {
          id: "user_2",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "agency prompt", ignored: false }],
      },
      {
        info: {
          id: "assistant_2",
          role: "assistant",
          parentID: "user_2",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 4 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "agency answer" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 5 },
        },
        parts: [{ type: "text", text: "current prompt", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.compactHistory({ msgs, currentID: "current" })).toBeUndefined()
  })

  test("buildAgencyHistoryFromMessages rebuilds bridge history from cloned messages", () => {
    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "first question", ignored: false }],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "first answer" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "follow up", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.buildAgencyHistoryFromMessages({ msgs, currentID: "current" })).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "first question" }],
        agent: "build",
        callerAgent: null,
        timestamp: 1,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "first answer" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
      },
    ])
  })

  test("buildAgencyHistoryFromMessages preserves historical local file read text after the file changes", async () => {
    await using tmp = await tmpdir()
    const filepath = path.join(tmp.path, "proof.txt")
    await Bun.write(filepath, "new bytes")

    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [
          { type: "text", text: "[File 1]\nold bytes", ignored: false, synthetic: true },
          {
            type: "file",
            mime: "text/plain",
            filename: "proof.txt",
            url: pathToFileURL(filepath).href,
          },
        ],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "old bytes" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "follow up", ignored: false }],
      },
    ] as any

    expect(
      SessionAgencySwarm.buildAgencyHistoryFromMessages({
        msgs,
        currentID: "current",
        structuredAttachments: true,
      }),
    ).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "[File 1]\nold bytes" }],
        agent: "build",
        callerAgent: null,
        timestamp: 1,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "old bytes" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
      },
    ])
  })

  test("buildAgencyHistoryFromMessages preserves same-turn attachments when skipping expanded local file replay", () => {
    const pdfData = "data:application/pdf;base64,cGRm"
    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [
          { type: "text", text: "[File 1]\nold bytes", ignored: false, synthetic: true },
          {
            type: "file",
            mime: "text/plain",
            filename: "proof.txt",
            url: "file:///tmp/proof.txt",
          },
          {
            type: "file",
            mime: "application/pdf",
            filename: "brief.pdf",
            url: pdfData,
          },
        ],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "saw both" }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "follow up", ignored: false }],
      },
    ] as any

    expect(
      SessionAgencySwarm.buildAgencyHistoryFromMessages({
        msgs,
        currentID: "current",
        structuredAttachments: true,
      }),
    ).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_file", file_data: pdfData, filename: "brief.pdf" },
          { type: "input_text", text: "[File 1]\nold bytes" },
        ],
        agent: "build",
        callerAgent: null,
        timestamp: 1,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "saw both" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
      },
    ])
  })

  test("buildAgencyHistoryFromMessages returns undefined when only the current user message exists", () => {
    const msgs = [
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "first prompt", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.buildAgencyHistoryFromMessages({ msgs, currentID: "current" })).toBeUndefined()
  })

  test("buildAgencyHistoryFromMessages bails out when prior messages are not all agency-swarm", () => {
    const msgs = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "openai", modelID: "gpt-5" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "openai prompt", ignored: false }],
      },
      {
        info: {
          id: "current",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 2 },
        },
        parts: [{ type: "text", text: "follow up", ignored: false }],
      },
    ] as any

    expect(SessionAgencySwarm.buildAgencyHistoryFromMessages({ msgs, currentID: "current" })).toBeUndefined()
  })

  test("stream resolves configured recipient alias to live agent id from metadata", async () => {
    mockHistory()
    let sentRecipient: string | undefined
    AgencySwarmAdapter.getMetadata = (async () => ({
      metadata: {
        agents: ["support_agent"],
      },
      nodes: [
        {
          id: "support_agent",
          type: "agent",
          data: {
            label: "UserSupportAgent",
          },
        },
      ],
    })) as typeof AgencySwarmAdapter.getMetadata
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentRecipient = args.recipientAgent ?? undefined
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.recipientAgent = "UserSupportAgent"
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentRecipient).toBe("support_agent")
  })

  test("stream resolves mentioned recipient alias to live agent id from metadata", async () => {
    mockHistory()
    let sentRecipient: string | undefined
    AgencySwarmAdapter.getMetadata = (async () => ({
      metadata: {
        agents: ["support_agent", "MathAgent"],
      },
      nodes: [
        {
          id: "support_agent",
          type: "agent",
          data: {
            label: "UserSupportAgent",
          },
        },
      ],
    })) as typeof AgencySwarmAdapter.getMetadata
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentRecipient = args.recipientAgent ?? undefined
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.recipientAgent = "MathAgent"
    input.userMessage.parts.push({
      type: "agent",
      name: "UserSupportAgent",
    } as any)
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentRecipient).toBe("support_agent")
  })

  test("stream falls back to valid configured recipient when mentioned recipient is stale", async () => {
    mockHistory()
    let sentRecipient: string | undefined
    AgencySwarmAdapter.getMetadata = (async () => ({
      metadata: {
        agents: ["MathAgent"],
      },
    })) as typeof AgencySwarmAdapter.getMetadata
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentRecipient = args.recipientAgent ?? undefined
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    input.options.recipientAgent = "MathAgent"
    input.userMessage.parts.push({
      type: "agent",
      name: "ExampleAgent2",
    } as any)
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentRecipient).toBe("MathAgent")
  })

  test("stream reuses stored history when compactHistory falls back", async () => {
    const storedHistory = [{ type: "message", role: "assistant", content: "kept memory" }]
    const mixedProviderMessages = [
      {
        info: {
          id: "user_1",
          role: "user",
          agent: "build",
          model: { providerID: "openai", modelID: "gpt-5" },
          time: { created: 1 },
        },
        parts: [{ type: "text", text: "first question", ignored: false }],
      },
      {
        info: {
          id: "assistant_1",
          role: "assistant",
          parentID: "user_1",
          providerID: "openai",
          modelID: "gpt-5",
          mode: "Default",
          agent: "Assistant",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "first answer" }],
      },
      {
        info: {
          id: "message_user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "current prompt", ignored: false }],
      },
    ] as any

    let sentHistory: unknown
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: storedHistory as any,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const messagesSpy = spyOn(Session, "messages").mockResolvedValue(mixedProviderMessages)
    try {
      const { input } = helper()
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
      }
    } finally {
      messagesSpy.mockRestore()
    }

    expect(sentHistory).toEqual(storedHistory)
  })

  test("stream strips stored Responses item ids while pruning handoff-only transport items", async () => {
    const storedHistory = [
      {
        type: "message",
        id: "msg_kept",
        role: "assistant",
        content: [{ type: "output_text", text: "HANDOFF_AGENT_ACTIVE" }],
      },
      {
        type: "message",
        id: "rs_message_kept",
        role: "assistant",
        content: [{ type: "output_text", text: "normal message with backend rs id" }],
      },
      {
        type: "reasoning",
        id: "rs_stale",
        summary: [{ type: "summary_text", text: "private chain state" }],
      },
      {
        type: "item_reference",
        id: "rs_ref_rejected",
      },
      {
        type: "handoff_output_item",
        output: { assistant: "HandoffAgent" },
      },
    ]
    let sentHistory: unknown
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: storedHistory as any,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentHistory).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "HANDOFF_AGENT_ACTIVE" }],
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "normal message with backend rs id" }],
      },
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "private chain state" }],
      },
    ])
  })

  test("stream strips stored Responses item ids after handoff", async () => {
    const storedHistory = [
      {
        type: "message",
        id: "msg_before_handoff",
        role: "assistant",
        content: [{ type: "output_text", text: "Preparing transfer." }],
      },
      {
        type: "reasoning",
        id: "rs_required",
        summary: [{ type: "summary_text", text: "choose handoff target" }],
      },
      {
        type: "function_call",
        id: "fc_handoff",
        call_id: "call_handoff",
        name: "transfer_to_math_agent",
        arguments: "{}",
      },
      {
        type: "handoff_output_item",
        call_id: "call_handoff",
        output: { assistant: "MathAgent" },
      },
      {
        type: "reasoning",
        id: "rs_required_message",
        summary: [{ type: "summary_text", text: "start handoff response" }],
      },
      {
        type: "message",
        id: "msg_after_handoff",
        role: "assistant",
        agent: "MathAgent",
        content: [{ type: "output_text", text: "Math agent now has control." }],
      },
      {
        type: "reasoning",
        id: "rs_orphan",
        summary: [{ type: "summary_text", text: "stale private state" }],
      },
    ]
    let sentHistory: unknown
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: storedHistory as any,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentHistory).toEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Preparing transfer." }],
      },
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "choose handoff target" }],
      },
      {
        type: "function_call",
        call_id: "call_handoff",
        name: "transfer_to_math_agent",
        arguments: "{}",
      },
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "start handoff response" }],
      },
      {
        type: "message",
        role: "assistant",
        agent: "MathAgent",
        content: [{ type: "output_text", text: "Math agent now has control." }],
      },
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "stale private state" }],
      },
    ])
  })

  test("stream rebuilds chat history from cloned messages when bridge history is empty", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const filepath = path.join(dir, "proof.txt")
        await Bun.write(filepath, "forked proof")
        return filepath
      },
    })
    mockAgencyVersion("1.9.6")
    const fileData = `data:text/plain;base64,${Buffer.from("forked proof").toString("base64")}`
    const clonedAgencyMessages = [
      {
        info: {
          id: "user_clone_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 1 },
        },
        parts: [
          { type: "text", text: "[File 1] before fork", ignored: false },
          {
            type: "file",
            mime: "text/plain",
            filename: "proof.txt",
            url: pathToFileURL(tmp.extra).href,
            source: {
              type: "file",
              path: tmp.extra,
              text: {
                value: "[File 1]",
                start: 0,
                end: 8,
              },
            },
          },
        ],
      },
      {
        info: {
          id: "assistant_clone_1",
          role: "assistant",
          parentID: "user_clone_1",
          providerID: "agency-swarm",
          modelID: "default",
          mode: "Default",
          agent: "Reviewer",
          path: { cwd: "/", root: "/" },
          cost: 0,
          tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 2 },
          sessionID: "session_1",
        },
        parts: [{ type: "text", text: "answer before fork" }],
      },
      {
        info: {
          id: "message_user_1",
          role: "user",
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          time: { created: 3 },
        },
        parts: [{ type: "text", text: "follow up after fork", ignored: false }],
      },
    ] as any

    let sentHistory: unknown
    const appendedHistory: unknown[] = []
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async (_scope, messages) => {
      appendedHistory.push(...(Array.isArray(messages) ? messages : []))
      return {
        scope: "scope",
        chat_history: appendedHistory as Record<string, unknown>[],
        updated_at: Date.now(),
      }
    }) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const messagesSpy = spyOn(Session, "messages").mockResolvedValue(clonedAgencyMessages)
    try {
      const { input } = helper()
      const stream = await SessionAgencySwarm.stream(input)
      for await (const _ of stream.fullStream) {
      }
    } finally {
      messagesSpy.mockRestore()
    }

    const rebuiltHistory = [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_file", file_data: fileData, filename: "proof.txt" },
          { type: "input_text", text: "[File 1] before fork" },
        ],
        agent: "build",
        callerAgent: null,
        timestamp: 1,
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "answer before fork" }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
      },
    ]
    expect(sentHistory).toEqual(rebuiltHistory)
    expect(appendedHistory).toEqual(rebuiltHistory)
  })

  test("stream persists handed off recipient from session history", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "handoff recipient" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        const assistant = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: Date.now(),
            completed: Date.now(),
          },
        } as any)
        await addCompletedTransferPart({
          sessionID: session.id,
          messageID: assistant.id,
          tool: "transfer_to_support_agent",
          output: '{"assistant":"support_agent"}',
        })

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream persists handed off recipient from final messages payload over stale configured selection", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let turn = 0
        let sentRecipient: string | undefined
        const sentHistories: unknown[][] = []
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          turn++
          sentRecipient = args.recipientAgent ?? undefined
          sentHistories.push(args.chatHistory)
          if (turn === 1) {
            yield {
              type: "data",
              payload: {
                type: "raw_response_event",
                data: {
                  type: "response.output_item.added",
                  output_index: "1",
                  item: {
                    type: "function_call",
                    id: "fc_handoff",
                    call_id: "call_handoff",
                    name: "transfer_to_support_agent",
                    arguments: "{}",
                  },
                },
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    type: "handoff_output_item",
                    call_id: "call_handoff",
                    output: '{"assistant":"support_agent"}',
                  },
                ],
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    id: "agency_message_1",
                    type: "message",
                    role: "assistant",
                    agent: "support_agent",
                    content: [{ type: "output_text", text: "Transferred." }],
                  },
                ],
              },
            }
          }
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "messages handoff recipient" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })

        const first = helper()
        first.input.sessionID = session.id
        first.input.assistantMessage.sessionID = session.id
        first.input.assistantMessage.id = MessageID.ascending()
        first.input.assistantMessage.parentID = user.id
        first.input.userMessage.info.id = user.id
        first.input.options.recipientAgent = "MathAgent"

        const firstStream = await SessionAgencySwarm.stream(first.input)
        for await (const _ of firstStream.fullStream) {
        }

        const second = helper()
        second.input.sessionID = session.id
        second.input.assistantMessage.sessionID = session.id
        second.input.assistantMessage.id = MessageID.ascending()
        second.input.userMessage.info.id = MessageID.ascending()
        second.input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        second.input.options.recipientAgent = "MathAgent"
        ;(second.input.options as any).recipientAgentSelectedAt = 1

        const secondStream = await SessionAgencySwarm.stream(second.input)
        for await (const _ of secondStream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
        expect(sentHistories[1]?.some((item) => (item as any)?.type === "handoff_output_item")).toBeFalse()
      },
    })
  })

  test("stream restores handoff recipient from transfer tool when assistant agent is stale", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "tool handoff recipient" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        const assistant = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "MathAgent",
          agent: "MathAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
            completed: created + 2,
          },
        } as any)
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: assistant.id,
          sessionID: session.id,
          type: "tool",
          callID: "call_handoff",
          tool: "transfer_to_support_agent",
          state: {
            status: "completed",
            input: {},
            output: '{"assistant":"support_agent"}',
            title: "",
            metadata: {},
            time: {
              start: created + 1,
              end: created + 2,
            },
          },
        } as any)

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any

        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream prefers prompt handoff recipient over stale configured recipient", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "prompt handoff recipient" })
        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        input.recipientAgent = "support_agent"
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any

        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream routes next message to agent_updated handoff id", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["orchestrator", "slides_agent"],
          },
          nodes: [
            {
              id: "slides_agent",
              type: "agent",
              data: {
                label: "Slides Agent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        let turn = 0
        AgencySwarmAdapter.streamRun = async function* (args) {
          turn++
          if (turn === 1) {
            yield {
              type: "data",
              payload: {
                type: "agent_updated_stream_event",
                new_agent: {
                  id: "slides_agent",
                  label: "Slides Agent",
                },
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    id: "msg_slides_handoff",
                    type: "message",
                    role: "assistant",
                    agent: "slides_agent",
                    content: [{ type: "output_text", text: "Slides agent has control." }],
                  },
                ],
              },
            }
            yield { type: "end" }
            return
          }
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "handoff event recipient" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "make slides",
        })
        const first = helper()
        first.input.sessionID = session.id
        first.input.assistantMessage.sessionID = session.id
        first.input.assistantMessage.parentID = user.id
        first.input.assistantMessage.id = MessageID.ascending()
        first.input.userMessage.info.id = user.id

        const firstStream = await SessionAgencySwarm.stream(first.input)
        const firstEvents: any[] = []
        for await (const event of firstStream.fullStream) {
          firstEvents.push(event)
        }

        expect(first.input.assistantMessage.agent).toBe("slides_agent")
        expect(
          firstEvents.some(
            (event) =>
              event.providerMetadata?.agency_handoff_event === "agent_updated_stream_event" &&
              event.providerMetadata?.assistant === "slides_agent",
          ),
        ).toBeTrue()

        const second = helper()
        second.input.sessionID = session.id
        second.input.assistantMessage.sessionID = session.id
        second.input.assistantMessage.id = MessageID.ascending()
        second.input.userMessage.info.id = MessageID.ascending()
        second.input.userMessage.parts = [{ type: "text", text: "continue", ignored: false }] as any

        const secondStream = await SessionAgencySwarm.stream(second.input)
        for await (const _ of secondStream.fullStream) {
        }

        expect(sentRecipient).toBe("slides_agent")
      },
    })
  })

  test("stream does not restore recipient from nested forwarded agent_updated_stream_event", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        const sentRecipients: Array<string | undefined> = []
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["UserSupportAgent", "MathAgent"],
          },
          nodes: [
            {
              id: "UserSupportAgent",
              type: "agent",
              data: {
                label: "User Support Agent",
              },
            },
            {
              id: "MathAgent",
              type: "agent",
              data: {
                label: "Math Agent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        let turn = 0
        AgencySwarmAdapter.streamRun = async function* (args) {
          turn++
          sentRecipients.push(args.recipientAgent ?? undefined)
          if (turn === 1) {
            yield {
              type: "data",
              payload: {
                type: "agent_updated_stream_event",
                caller_agent: "UserSupportAgent",
                parentRunID: "run_parent",
                new_agent: {
                  id: "MathAgent",
                  label: "Math Agent",
                },
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    id: "msg_nested_delegate",
                    type: "message",
                    role: "assistant",
                    agent: "MathAgent",
                    content: [{ type: "output_text", text: "Nested delegation replied." }],
                  },
                ],
              },
            }
          }
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "nested delegated handoff event" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "delegate with nested metadata",
        })

        const first = helper()
        first.input.sessionID = session.id
        first.input.assistantMessage.sessionID = session.id
        first.input.assistantMessage.id = MessageID.ascending()
        first.input.assistantMessage.parentID = user.id
        first.input.userMessage.info.id = user.id
        first.input.options.recipientAgent = "UserSupportAgent"
        ;(first.input.options as any).recipientAgentSelectedAt = 1

        const firstStream = await SessionAgencySwarm.stream(first.input)
        for await (const _ of firstStream.fullStream) {
        }

        const second = helper()
        second.input.sessionID = session.id
        second.input.assistantMessage.sessionID = session.id
        second.input.assistantMessage.id = MessageID.ascending()
        second.input.userMessage.info.id = MessageID.ascending()
        second.input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        second.input.options.recipientAgent = "UserSupportAgent"
        ;(second.input.options as any).recipientAgentSelectedAt = 1

        const secondStream = await SessionAgencySwarm.stream(second.input)
        for await (const _ of secondStream.fullStream) {
        }

        expect(sentRecipients).toEqual(["UserSupportAgent", "UserSupportAgent"])
      },
    })
  })

  test("stream restores top-level handoff over later nested forwarded metadata", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        const sentRecipients: Array<string | undefined> = []
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["UserSupportAgent", "support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "UserSupportAgent",
              type: "agent",
              data: {
                label: "User Support Agent",
              },
            },
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "Support Agent",
              },
            },
            {
              id: "MathAgent",
              type: "agent",
              data: {
                label: "Math Agent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        let turn = 0
        AgencySwarmAdapter.streamRun = async function* (args) {
          turn++
          sentRecipients.push(args.recipientAgent ?? undefined)
          if (turn === 1) {
            yield {
              type: "data",
              payload: {
                type: "raw_response_event",
                data: {
                  type: "response.output_item.added",
                  output_index: 1,
                  item: {
                    type: "function_call",
                    id: "fc_handoff",
                    call_id: "call_handoff",
                    name: "transfer_to_support_agent",
                    arguments: "{}",
                  },
                },
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    type: "handoff_output_item",
                    call_id: "call_handoff",
                    output: '{"assistant":"support_agent"}',
                  },
                ],
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    type: "handoff_output_item",
                    call_id: "call_nested_handoff",
                    metadata: {
                      caller_agent: "support_agent",
                      parentRunID: "run_parent",
                    },
                    output: {
                      assistant: "MathAgent",
                    },
                  },
                ],
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    id: "msg_mixed_nested_delegate",
                    type: "message",
                    role: "assistant",
                    agent: "MathAgent",
                    content: [{ type: "output_text", text: "Nested delegation replied after handoff." }],
                  },
                ],
              },
            }
          }
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "mixed handoff nested delegate" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "handoff then delegate",
        })

        const first = helper()
        first.input.sessionID = session.id
        first.input.assistantMessage.sessionID = session.id
        first.input.assistantMessage.id = MessageID.ascending()
        first.input.assistantMessage.parentID = user.id
        first.input.userMessage.info.id = user.id
        first.input.options.recipientAgent = "UserSupportAgent"
        ;(first.input.options as any).recipientAgentSelectedAt = 1

        const firstStream = await SessionAgencySwarm.stream(first.input)
        for await (const _ of firstStream.fullStream) {
        }

        const second = helper()
        second.input.sessionID = session.id
        second.input.assistantMessage.sessionID = session.id
        second.input.assistantMessage.id = MessageID.ascending()
        second.input.userMessage.info.id = MessageID.ascending()
        second.input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        second.input.options.recipientAgent = "UserSupportAgent"
        ;(second.input.options as any).recipientAgentSelectedAt = 1

        const secondStream = await SessionAgencySwarm.stream(second.input)
        for await (const _ of secondStream.fullStream) {
        }

        expect(sentRecipients).toEqual(["UserSupportAgent", "support_agent"])
      },
    })
  })

  test("stream keeps agent_updated handoff metadata when raw text is replayed by messages", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["orchestrator", "slides_agent"],
          },
          nodes: [
            {
              id: "slides_agent",
              type: "agent",
              data: {
                label: "Slides Agent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        let turn = 0
        AgencySwarmAdapter.streamRun = async function* (args) {
          turn++
          if (turn === 1) {
            yield {
              type: "data",
              payload: {
                type: "agent_updated_stream_event",
                new_agent: {
                  id: "slides_agent",
                  label: "Slides Agent",
                },
              },
            }
            yield {
              type: "data",
              payload: {
                type: "raw_response_event",
                data: {
                  type: "response.output_item.added",
                  output_index: 0,
                  item: {
                    id: "msg_slides_handoff",
                    type: "message",
                  },
                },
              },
            }
            yield {
              type: "data",
              payload: {
                type: "raw_response_event",
                data: {
                  type: "response.output_text.delta",
                  item_id: "msg_slides_handoff",
                  output_index: 0,
                  content_index: 0,
                  delta: "Slides agent has control.",
                },
              },
            }
            yield {
              type: "data",
              payload: {
                type: "raw_response_event",
                data: {
                  type: "response.output_text.done",
                  item_id: "msg_slides_handoff",
                  output_index: 0,
                  content_index: 0,
                  text: "Slides agent has control.",
                },
              },
            }
            yield {
              type: "messages",
              payload: {
                new_messages: [
                  {
                    id: "msg_slides_handoff",
                    type: "message",
                    role: "assistant",
                    agent: "slides_agent",
                    content: [{ type: "output_text", text: "Slides agent has control." }],
                  },
                ],
              },
            }
            yield { type: "end" }
            return
          }
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "handoff replay metadata" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "make slides",
        })
        const first = helper()
        first.input.sessionID = session.id
        first.input.assistantMessage.sessionID = session.id
        first.input.assistantMessage.parentID = user.id
        first.input.assistantMessage.id = MessageID.ascending()
        first.input.userMessage.info.id = user.id

        const firstStream = await SessionAgencySwarm.stream(first.input)
        const firstEvents: any[] = []
        for await (const event of firstStream.fullStream) {
          firstEvents.push(event)
        }

        expect(
          firstEvents.some(
            (event) =>
              event.type === "text-end" &&
              event.providerMetadata?.agency_handoff_event === "agent_updated_stream_event" &&
              event.providerMetadata?.assistant === "slides_agent",
          ),
        ).toBeTrue()

        const second = helper()
        second.input.sessionID = session.id
        second.input.assistantMessage.sessionID = session.id
        second.input.assistantMessage.id = MessageID.ascending()
        second.input.userMessage.info.id = MessageID.ascending()
        second.input.userMessage.parts = [{ type: "text", text: "continue", ignored: false }] as any

        const secondStream = await SessionAgencySwarm.stream(second.input)
        for await (const _ of secondStream.fullStream) {
        }

        expect(sentRecipient).toBe("slides_agent")
      },
    })
  })

  test("stream prefers persisted handed off recipient over unmarked configured recipient", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "handoff recipient over default config" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        const assistant = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
            completed: created + 2,
          },
        } as any)
        await addCompletedTransferPart({
          sessionID: session.id,
          messageID: assistant.id,
          tool: "transfer_to_support_agent",
          output: '{"assistant":"support_agent"}',
          start: created + 1,
          end: created + 2,
        })

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream prefers later manual recipient selection over persisted handed off recipient", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "manual recipient override" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
            completed: created + 2,
          },
        } as any)

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        ;(input.options as any).recipientAgentSelectedAt = created + 3
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any
        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("MathAgent")
      },
    })
  })

  test("stream prefers completed handoff over recipient selected during that response", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "completed handoff override" })
        const handoffStartedAt = Date.now()
        const handoffCompletedAt = handoffStartedAt + 10
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: handoffStartedAt - 1,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        const assistant = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: handoffStartedAt,
            completed: handoffCompletedAt,
          },
        } as any)
        await addCompletedTransferPart({
          sessionID: session.id,
          messageID: assistant.id,
          tool: "transfer_to_support_agent",
          output: '{"assistant":"support_agent"}',
          start: handoffStartedAt,
          end: handoffCompletedAt,
        })

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        ;(input.options as any).recipientAgentSelectedAt = handoffStartedAt + 1
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any

        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream prefers in-progress handoff over recipient selected before completion", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "in-progress handoff override" })
        const created = Date.now()
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created,
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        const assistant = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: created + 1,
          },
        } as any)
        await addCompletedTransferPart({
          sessionID: session.id,
          messageID: assistant.id,
          tool: "transfer_to_support_agent",
          output: '{"assistant":"support_agent"}',
          start: created + 1,
          end: created + 1,
        })

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.options.recipientAgent = "MathAgent"
        ;(input.options as any).recipientAgentSelectedAt = created + 2
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [{ type: "text", text: "follow up", ignored: false }] as any

        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("support_agent")
      },
    })
  })

  test("stream prefers explicit mention over persisted handed off recipient", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        mockHistory()
        let sentRecipient: string | undefined
        AgencySwarmAdapter.getMetadata = (async () => ({
          metadata: {
            agents: ["support_agent", "MathAgent"],
          },
          nodes: [
            {
              id: "support_agent",
              type: "agent",
              data: {
                label: "UserSupportAgent",
              },
            },
          ],
        })) as typeof AgencySwarmAdapter.getMetadata
        AgencySwarmAdapter.streamRun = async function* (args) {
          sentRecipient = args.recipientAgent ?? undefined
          yield { type: "end" }
        } as typeof AgencySwarmAdapter.streamRun

        const session = await Session.create({ title: "handoff mention override" })
        const user = await Session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: ProviderID.make("agency-swarm"),
            modelID: ModelID.make("default"),
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          messageID: user.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })
        await Session.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          sessionID: session.id,
          parentID: user.id,
          modelID: "default",
          providerID: "agency-swarm",
          mode: "UserSupportAgent",
          agent: "UserSupportAgent",
          path: {
            cwd: "/",
            root: "/",
          },
          cost: 0,
          tokens: {
            total: 0,
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          time: {
            created: Date.now(),
            completed: Date.now(),
          },
        } as any)

        const { input } = helper()
        input.sessionID = session.id
        input.assistantMessage.sessionID = session.id
        input.userMessage.info.id = MessageID.ascending()
        input.userMessage.parts = [
          { type: "text", text: "follow up", ignored: false },
          { type: "agent", name: "MathAgent" },
        ] as any
        const stream = await SessionAgencySwarm.stream(input)
        for await (const _ of stream.fullStream) {
        }

        expect(sentRecipient).toBe("MathAgent")
      },
    })
  })

  test("stream reconciles non-function tool input from response.output_item.done", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: {
              type: "file_search_call",
              id: "fs_args",
              status: "in_progress",
              queries: [],
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "1",
            item: {
              type: "file_search_call",
              id: "fs_args",
              status: "completed",
              queries: ["final-query"],
              results: [{ file_id: "file_1" }],
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const toolCall = events.find((event) => event.type === "tool-call")
    expect(toolCall?.input).toEqual({ queries: ["final-query"] })
    expect(events.find((event) => event.type === "tool-result")?.output?.output).toContain("file_1")
  })

  test("stream reconciles web search input from response.output_item.done", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: {
              type: "web_search_call",
              id: "ws_args",
              status: "in_progress",
              action: "None",
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "1",
            item: {
              type: "web_search_call",
              id: "ws_args",
              status: "completed",
              query: "None",
              queries: ["agency swarm events", "None"],
              action: {
                type: "search",
                query: "show latest agency swarm release",
              },
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const toolCall = events.find((event) => event.type === "tool-call")
    expect(toolCall?.input).toEqual({
      query: "show latest agency swarm release",
      queries: ["agency swarm events", "show latest agency swarm release"],
      action: {
        type: "search",
        query: "show latest agency swarm release",
      },
    })
  })

  test("stream does not cancel stale last_run_id before current run metadata arrives", async () => {
    mockHistory("run_stale")
    const cancelled: string[] = []
    AgencySwarmAdapter.cancel = (async ({ runID }) => {
      cancelled.push(runID)
      return {
        ok: true,
        status: 200,
        cancelled: true,
        notFound: false,
      }
    }) as typeof AgencySwarmAdapter.cancel
    AgencySwarmAdapter.streamRun = async function* (args) {
      yield { type: "meta", runID: "run_current" }
      if (args.abort?.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input, triggerCancel } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    await triggerCancel?.()

    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(cancelled).toEqual(["run_current"])
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("cancelled")
  })

  test("stream marks unfinished tool calls as error instead of tool-calls", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_unfinished",
              call_id: "call_unfinished",
              name: "lookup",
              arguments: '{"query":"test"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_unfinished",
              call_id: "call_unfinished",
              name: "lookup",
              arguments: '{"query":"test"}',
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.some((event) => event.type === "tool-error")).toBeTrue()
    expect(events.some((event) => event.type === "finish-step")).toBeFalse()
    expect(events.some((event) => event.type === "finish")).toBeFalse()
    expect(events.at(-1)?.type).toBe("error")
  })

  test("stream completes Agency Swarm handoff output items instead of leaving transfer tools aborted", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_handoff",
              call_id: "call_handoff",
              name: "transfer_to_slides_agent",
              arguments: "{}",
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_handoff",
              call_id: "call_handoff",
              name: "transfer_to_slides_agent",
              arguments: "{}",
            },
          },
        },
      }
      yield {
        type: "messages",
        payload: {
          new_messages: [
            {
              type: "handoff_output_item",
              call_id: "call_handoff",
              output: '{"assistant":"Slides Agent"}',
            },
          ],
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.some((event) => event.type === "tool-error")).toBeFalse()
    expect(events.some((event) => event.type === "error")).toBeFalse()
    expect(events.find((event) => event.type === "tool-result")?.toolCallId).toBe("call_handoff")
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("stop")
  })

  test("stream sends cancel after meta when user cancels before run id is known", async () => {
    mockHistory()
    const cancelled: string[] = []
    AgencySwarmAdapter.cancel = (async ({ runID }) => {
      cancelled.push(runID)
      return {
        ok: true,
        status: 200,
        cancelled: true,
        notFound: false,
      }
    }) as typeof AgencySwarmAdapter.cancel
    AgencySwarmAdapter.streamRun = async function* (args) {
      yield { type: "meta", runID: "run_cancel" }
      if (args.abort?.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input, triggerCancel } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    await triggerCancel?.()

    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(cancelled).toEqual(["run_cancel"])
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("cancelled")
  })

  test("stream treats external abort as cancelled without error event", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* (args) {
      await new Promise<void>((resolve, reject) => {
        if (args.abort?.aborted) {
          reject(new DOMException("Aborted", "AbortError"))
          return
        }
        args.abort?.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Aborted", "AbortError"))
          },
          { once: true },
        )
        setTimeout(resolve, 20)
      })
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input, triggerAbort } = helper()
    triggerAbort()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual(["start", "start-step", "finish-step", "finish"])
    expect(events.find((event) => event.type === "finish-step")?.finishReason).toBe("cancelled")
    expect(events.some((event) => event.type === "error")).toBeFalse()
  })

  test("stream does not duplicate text when message_output_created follows output_text events", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_dup" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_dup",
            output_index: "0",
            delta: "Hi, there!",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.done",
            item_id: "msg_dup",
            output_index: "0",
            text: "Hi, there!",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "message_output_created",
          item: {
            raw_item: {
              type: "message",
              id: "msg_dup",
              content: [{ type: "output_text", text: "Hi, there!" }],
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const deltas: string[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "text-delta") {
        deltas.push(event.text)
      }
    }

    expect(deltas).toEqual(["Hi, there!"])
  })

  test("stream keeps both distinct short assistant messages in the same run (no body-only dedupe)", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield { type: "meta", runID: "run_1" }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_a" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_a",
            output_index: "0",
            delta: "Done",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.done",
            item_id: "msg_a",
            output_index: "0",
            text: "Done",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: { type: "message", id: "msg_b" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_b",
            output_index: "1",
            delta: "Done",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.done",
            item_id: "msg_b",
            output_index: "1",
            text: "Done",
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const deltas: string[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "text-delta") {
        deltas.push(event.text)
      }
    }

    expect(deltas).toEqual(["Done", "Done"])
  })

  test("stream does not duplicate reasoning when reasoning_item_created follows summary events", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: { type: "reasoning", id: "rs_dup" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.delta",
            item_id: "rs_dup",
            summary_index: "0",
            output_index: "1",
            delta: "Find the right file first.",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.done",
            item_id: "rs_dup",
            summary_index: "0",
            output_index: "1",
            text: "Find the right file first.",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "reasoning_item_created",
          item: {
            raw_item: {
              type: "reasoning",
              id: "rs_dup",
              summary: [{ text: "Find the right file first." }],
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const deltas: string[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "reasoning-delta") deltas.push(event.text)
    }

    expect(deltas).toEqual(["Find the right file first."])
  })

  test("stream does not duplicate tool input when tool_called follows output_item.added", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: {
              type: "function_call",
              id: "call_item_1",
              call_id: "call_1",
              name: "search",
              arguments: '{"query":"hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_called",
          item: {
            raw_item: {
              type: "function_call",
              id: "call_item_1",
              call_id: "call_1",
              name: "search",
              arguments: '{"query":"hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "0",
            item: {
              type: "function_call",
              id: "call_item_1",
              call_id: "call_1",
              name: "search",
              arguments: '{"query":"hello"}',
            },
          },
        },
      }
      yield {
        type: "messages",
        payload: {
          new_messages: [{ type: "function_call_output", call_id: "call_1", output: "ok" }],
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const deltas: string[] = []
    const calls: any[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "tool-input-delta") deltas.push(event.delta)
      if (event.type === "tool-call") calls.push(event)
    }

    expect(deltas).toEqual(['{"query":"hello"}'])
    expect(calls).toHaveLength(1)
  })

  test("stream accepts tool_output events even when raw_item.type is not an _output item", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: {
              type: "function_call",
              id: "call_item_tool_output",
              call_id: "call_tool_output",
              name: "greet",
              arguments: '{"name":"hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_called",
          item: {
            raw_item: {
              type: "function_call",
              id: "call_item_tool_output",
              call_id: "call_tool_output",
              name: "greet",
              arguments: '{"name":"hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_output",
          item: {
            raw_item: {
              type: "function_call",
              id: "call_item_tool_output",
              call_id: "call_tool_output",
              output: "hi there",
            },
            output: "hi there",
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "tool-input-start",
      "tool-input-delta",
      "tool-call",
      "tool-result",
      "finish-step",
      "finish",
    ])
    expect(events.some((event) => event.type === "error")).toBeFalse()
    expect(events.find((event) => event.type === "tool-result")?.output?.output).toBe("hi there")
  })

  test("stream resolves tool_output events from prior tool item ids when call_id is omitted", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: {
              type: "function_call",
              id: "call_item_litellm_tool_output",
              call_id: "call_litellm_tool_output",
              name: "ExampleTool",
              arguments: '{"name":"hi","greeting_type":"Hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "0",
            item: {
              type: "function_call",
              id: "call_item_litellm_tool_output",
              call_id: "call_litellm_tool_output",
              name: "ExampleTool",
              arguments: '{"name":"hi","greeting_type":"Hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_called",
          item: {
            raw_item: {
              type: "function_call",
              id: "call_item_litellm_tool_output",
              call_id: "call_litellm_tool_output",
              name: "ExampleTool",
              arguments: '{"name":"hi","greeting_type":"Hello"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_output",
          item: {
            raw_item: {
              type: "function_call_output",
              id: "call_item_litellm_tool_output",
              output: "Hello, hi!",
            },
            output: "Hello, hi!",
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "tool-input-start",
      "tool-input-delta",
      "tool-call",
      "tool-result",
      "finish-step",
      "finish",
    ])
    expect(events.some((event) => event.type === "error")).toBeFalse()
    expect(events.find((event) => event.type === "tool-result")?.output?.output).toBe("Hello, hi!")
  })

  test("stream prefers wrapper call_id before raw_item.id for tool_output after argument deltas", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.function_call_arguments.delta",
            call_id: "call_wrapper_preferred",
            name: "ExampleTool",
            delta: '{"name":"hi","greeting_type":"Hello"}',
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "run_item_stream_event",
          name: "tool_output",
          item: {
            call_id: "call_wrapper_preferred",
            raw_item: {
              type: "function_call_output",
              id: "call_item_wrapper_preferred",
              output: "Hello, hi!",
            },
            output: "Hello, hi!",
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "tool-input-start",
      "tool-input-delta",
      "tool-call",
      "tool-result",
      "finish-step",
      "finish",
    ])
    expect(events.some((event) => event.type === "tool-error")).toBeFalse()
    expect(events.find((event) => event.type === "tool-call")?.toolCallId).toBe("call_wrapper_preferred")
    expect(events.find((event) => event.type === "tool-result")?.toolCallId).toBe("call_wrapper_preferred")
    expect(events.find((event) => event.type === "tool-result")?.output?.output).toBe("Hello, hi!")
  })

  test("stream closes prior text part before switching content_index", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_multi" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_multi",
            output_index: "0",
            content_index: "0",
            delta: "First",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.content_part.added",
            item_id: "msg_multi",
            output_index: "0",
            content_index: "1",
            part: { type: "output_text" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_multi",
            output_index: "0",
            content_index: "1",
            delta: "Second",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.done",
            item_id: "msg_multi",
            output_index: "0",
            content_index: "1",
            text: "Second",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "0",
            item: { type: "message", id: "msg_multi" },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "finish",
    ])
  })

  test("stream preserves teardown before surfacing adapter error", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_err" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_err",
            output_index: "0",
            delta: "partial",
          },
        },
      }
      yield {
        type: "error",
        error: "stream failed",
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "error",
    ])
    expect(events.some((event) => event.type === "finish-step")).toBeFalse()
    expect(events.some((event) => event.type === "finish")).toBeFalse()
  })

  test("stream preserves teardown when raw_response_event emits type=error", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "0",
            item: { type: "message", id: "msg_err2" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_text.delta",
            item_id: "msg_err2",
            output_index: "0",
            delta: "partial",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "error",
            message: "nested stream error",
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "error",
    ])
    expect(events.some((event) => event.type === "finish-step")).toBeFalse()
    expect(events.some((event) => event.type === "finish")).toBeFalse()
  })

  test("stream surfaces bridge data-frame error payloads instead of silently dropping them", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "error",
          content: "Error code: 400 - The 'gpt-5' model is not supported when using Codex with a ChatGPT account.",
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const errorEvent = events.find((event) => event.type === "error")
    expect(errorEvent).toBeDefined()
    expect(String(errorEvent.error?.message ?? errorEvent.error ?? "")).toContain(
      "The 'gpt-5' model is not supported when using Codex with a ChatGPT account.",
    )
    expect(events.some((event) => event.type === "finish-step")).toBeFalse()
    expect(events.some((event) => event.type === "finish")).toBeFalse()
  })

  test("stream does not complete function_call on response.function_call.completed before output", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_done",
              call_id: "call_done",
              name: "lookup",
              arguments: '{"query":"test"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.function_call.completed",
            item_id: "fc_done",
            output_index: "2",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call_output",
              id: "fco_done",
              call_id: "call_done",
              output: "real output",
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const resultEvents = events.filter((event) => event.type === "tool-result")
    expect(resultEvents).toHaveLength(1)
    expect(resultEvents[0].output.output).toBe("real output")
  })

  test("stream uses final function_call arguments from response.output_item.done before tool-call", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_args",
              call_id: "call_args",
              name: "lookup",
              arguments: "",
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call",
              id: "fc_args",
              call_id: "call_args",
              name: "lookup",
              arguments: '{"query":"from_done"}',
            },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "2",
            item: {
              type: "function_call_output",
              id: "fco_args",
              call_id: "call_args",
              output: "done",
            },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }

    const toolCall = events.find((event) => event.type === "tool-call")
    expect(toolCall?.input).toEqual({ query: "from_done" })
  })

  test("stream does not reopen reasoning parts on output_item.done after summary done", async () => {
    mockHistory()
    AgencySwarmAdapter.streamRun = async function* () {
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.added",
            output_index: "1",
            item: { type: "reasoning", id: "rs_dup" },
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.delta",
            item_id: "rs_dup",
            summary_index: "0",
            output_index: "1",
            delta: "Thinking",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.reasoning_summary_text.done",
            item_id: "rs_dup",
            summary_index: "0",
            output_index: "1",
            text: "Thinking",
          },
        },
      }
      yield {
        type: "data",
        payload: {
          type: "raw_response_event",
          data: {
            type: "response.output_item.done",
            output_index: "1",
            item: { type: "reasoning", id: "rs_dup" },
          },
        },
      }
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = helper()
    const stream = await SessionAgencySwarm.stream(input)
    const starts: any[] = []
    const ends: any[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "reasoning-start") {
        starts.push(event)
      }
      if (event.type === "reasoning-end") {
        ends.push(event)
      }
    }

    expect(starts).toHaveLength(1)
    expect(ends).toHaveLength(1)
  })
})
