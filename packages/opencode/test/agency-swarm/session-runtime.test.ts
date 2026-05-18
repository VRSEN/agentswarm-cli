import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { CODEX_API_BASE_URL } from "../../src/plugin/codex"
import { Session } from "../../src/session"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"

describe("session.agency-swarm runtime history", () => {
  const originalStreamRun = AgencySwarmAdapter.streamRun
  const originalCancel = AgencySwarmAdapter.cancel
  const originalLoad = AgencySwarmHistory.load
  const originalAppendMessages = AgencySwarmHistory.appendMessages
  const originalSetLastRunID = AgencySwarmHistory.setLastRunID

  afterEach(() => {
    mock.restore()
    AgencySwarmAdapter.streamRun = originalStreamRun
    AgencySwarmAdapter.cancel = originalCancel
    AgencySwarmHistory.load = originalLoad
    AgencySwarmHistory.appendMessages = originalAppendMessages
    AgencySwarmHistory.setLastRunID = originalSetLastRunID
  })

  test("buildAgencyHistoryFromMessages reconstructs tool calls and outputs", () => {
    const msgs = [
      userMessage("user_1", "first question", 1, "openai"),
      {
        info: assistantInfo("assistant_1", 2),
        parts: [
          {
            type: "tool",
            callID: "call_search",
            tool: "search_docs",
            metadata: { agency_handoff_event: "tool" },
            state: {
              status: "completed",
              input: { query: "runtime" },
              output: "found runtime notes",
              title: "",
              metadata: { parent_run_id: "run_parent" },
              time: { start: 2, end: 3 },
            },
          },
          { type: "text", text: "Use the runtime notes.", ignored: false },
        ],
      },
      userMessage("current", "follow up", 4),
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
        type: "function_call",
        name: "search_docs",
        call_id: "call_search",
        arguments: '{\n  "query": "runtime"\n}',
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
        metadata: { parent_run_id: "run_parent", agency_handoff_event: "tool" },
      },
      {
        type: "function_call_output",
        call_id: "call_search",
        output: "found runtime notes",
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
        metadata: { parent_run_id: "run_parent", agency_handoff_event: "tool" },
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Use the runtime notes." }],
        agent: "Reviewer",
        callerAgent: null,
        timestamp: 2,
      },
    ])
  })

  test("buildAgencyHistoryFromMessages still rejects non-agency assistant history", () => {
    const msgs = [
      userMessage("user_1", "first question", 1, "openai"),
      {
        info: {
          ...assistantInfo("assistant_1", 2),
          providerID: "openai",
        },
        parts: [{ type: "text", text: "native answer", ignored: false }],
      },
      userMessage("current", "follow up", 3),
    ] as any

    expect(SessionAgencySwarm.buildAgencyHistoryFromMessages({ msgs, currentID: "current" })).toBeUndefined()
  })

  test("stream rebuilds local history when stored history lags queued user messages", async () => {
    const localMessages = [
      userMessage("user_1", "first question", 1),
      { info: assistantInfo("assistant_1", 2), parts: [{ type: "text", text: "first answer", ignored: false }] },
      userMessage("user_2", "queued follow up", 3),
      { info: assistantInfo("assistant_2", 4), parts: [{ type: "text", text: "queued answer", ignored: false }] },
      userMessage("current", "next prompt", 5),
    ] as any
    let sentHistory: Array<Record<string, unknown>> | undefined

    stubSessionMessages(localMessages)
    mockHistory([{ type: "message", role: "user", content: [{ type: "input_text", text: "first question" }] }])
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory as Array<Record<string, unknown>>
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    await consumeStream(makeInput("current", "next prompt").input)

    expect(sentHistory?.map((item) => (item.type === "message" ? item.content : item.type))).toEqual([
      [{ type: "input_text", text: "first question" }],
      [{ type: "output_text", text: "first answer" }],
      [{ type: "input_text", text: "queued follow up" }],
      [{ type: "output_text", text: "queued answer" }],
    ])
  })

  test("stream rebuilds local history when queued user message repeats earlier prompt", async () => {
    const localMessages = [
      userMessage("user_1", "same prompt", 1),
      { info: assistantInfo("assistant_1", 2), parts: [{ type: "text", text: "first answer", ignored: false }] },
      userMessage("user_2", "same prompt", 3),
      { info: assistantInfo("assistant_2", 4), parts: [{ type: "text", text: "second answer", ignored: false }] },
      userMessage("current", "next prompt", 5),
    ] as any
    let sentHistory: Array<Record<string, unknown>> | undefined

    stubSessionMessages(localMessages)
    mockHistory([
      { type: "message", role: "user", content: [{ type: "input_text", text: "same prompt" }] },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "first answer" }] },
    ])
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory as Array<Record<string, unknown>>
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    await consumeStream(makeInput("current", "next prompt").input)

    expect(sentHistory?.map((item) => (item.type === "message" ? item.content : item.type))).toEqual([
      [{ type: "input_text", text: "same prompt" }],
      [{ type: "output_text", text: "first answer" }],
      [{ type: "input_text", text: "same prompt" }],
      [{ type: "output_text", text: "second answer" }],
    ])
  })

  test("stream rebuilds local history after a previous agency assistant errored", async () => {
    const localMessages = [
      userMessage("user_1", "first question", 1),
      {
        info: { ...assistantInfo("assistant_1", 2), error: { name: "Error", message: "boom" } },
        parts: [{ type: "text", text: "partial answer", ignored: false }],
      },
      userMessage("current", "retry", 3),
    ] as any
    let sentHistory: Array<Record<string, unknown>> | undefined

    stubSessionMessages(localMessages)
    mockHistory([
      { type: "message", role: "user", content: [{ type: "input_text", text: "first question" }] },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "stale stored answer" }] },
    ])
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory as Array<Record<string, unknown>>
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    await consumeStream(makeInput("current", "retry").input)

    expect(sentHistory?.[1]).toMatchObject({
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "partial answer" }],
    })
  })

  test("stream bounds transport history and rewrites hosted-tool preservation only for Codex", async () => {
    const largeOutput = "x".repeat(13_000)
    let sentHistory: Array<Record<string, unknown>> | undefined

    stubSessionMessages([userMessage("current", "next prompt", 2)] as any)
    mockHistory([
      {
        type: "message",
        role: "system",
        message_origin: "file_search_preservation",
        content: [{ type: "input_text", text: "keep hosted tool context" }],
      },
      { type: "function_call", name: "search_docs", call_id: "call_1", arguments: '{"q":"docs"}', extra: "drop" },
      { type: "function_call_output", call_id: "call_1", output: largeOutput, metadata: { keep: "storage-only" } },
    ])
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentHistory = args.chatHistory as Array<Record<string, unknown>>
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const { input } = makeInput("current", "next prompt")
    input.options.clientConfig = { base_url: CODEX_API_BASE_URL }
    await consumeStream(input)

    expect(sentHistory?.[0]).toMatchObject({ role: "developer", message_origin: "file_search_preservation" })
    expect(sentHistory?.[1]).toEqual({
      type: "function_call",
      name: "search_docs",
      call_id: "call_1",
      arguments: '{"q":"docs"}',
    })
    expect(String(sentHistory?.[2]?.output)).toContain("[tool output truncated: omitted 1000 characters")
  })

  test("stream persists cancel response messages before finishing", async () => {
    const { input, triggerCancel } = makeInput("current", "cancel me")
    const appended = mockHistory([])
    let acceptMeta = () => {}
    const metaAccepted = new Promise<void>((resolve) => {
      acceptMeta = resolve
    })

    stubSessionMessages([userMessage("current", "cancel me", 1)] as any)
    AgencySwarmAdapter.streamRun = async function* (args) {
      yield { type: "meta", runID: "run_cancel" }
      acceptMeta()
      await new Promise<void>((resolve) => args.abort?.addEventListener("abort", () => resolve(), { once: true }))
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun
    AgencySwarmAdapter.cancel = (async () => ({
      ok: true,
      status: 200,
      cancelled: true,
      notFound: false,
      data: {
        new_messages: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "cancelled on backend" }],
          },
        ],
      },
    })) as typeof AgencySwarmAdapter.cancel

    const stream = await SessionAgencySwarm.stream(input)
    const consume = consumeStreamFromResult(stream)
    await metaAccepted
    triggerCancel()
    await consume

    expect(appended).toContainEqual([
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "cancelled on backend" }],
      },
    ])
  })

  function makeInput(currentID: string, text: string) {
    const abort = new AbortController()
    const input = {
      sessionID: "session_1" as any,
      assistantMessage: {
        id: "assistant_current",
        parentID: currentID,
        role: "assistant",
        mode: "Default",
        agent: "Default",
        path: { cwd: "/", root: "/" },
        cost: 0,
        tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: "default",
        providerID: "agency-swarm",
        time: { created: 10 },
        sessionID: "session_1",
      },
      userMessage: userMessage(currentID, text, 10),
      options: {
        baseURL: "http://127.0.0.1:8000",
        agency: "builder",
        discoveryTimeoutMs: 5000,
      },
      abort: abort.signal,
    } as Parameters<typeof SessionAgencySwarm.stream>[0]
    return {
      input,
      triggerCancel: () => abort.abort(),
    }
  }

  function userMessage(id: string, text: string, created: number, providerID = "agency-swarm") {
    return {
      info: {
        id,
        role: "user",
        agent: "build",
        model: { providerID, modelID: "default" },
        time: { created },
      },
      parts: [{ type: "text", text, ignored: false }],
    }
  }

  function assistantInfo(id: string, created: number) {
    return {
      id,
      role: "assistant",
      parentID: "user_1",
      providerID: "agency-swarm",
      modelID: "default",
      mode: "Default",
      agent: "Reviewer",
      path: { cwd: "/", root: "/" },
      cost: 0,
      tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created },
      sessionID: "session_1",
    }
  }

  function stubSessionMessages(messages: any[]) {
    spyOn(Session, "messages").mockResolvedValue(messages)
  }

  function mockHistory(initialChatHistory: unknown[]) {
    const appended: unknown[][] = []
    const chatHistory = [...initialChatHistory]
    AgencySwarmHistory.load = (async () => ({
      scope: "scope",
      chat_history: chatHistory,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async (_scope, newMessages) => {
      const messages = Array.isArray(newMessages) ? newMessages : []
      appended.push(messages)
      chatHistory.push(...messages)
      return { scope: "scope", chat_history: chatHistory, updated_at: Date.now() }
    }) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async (_scope, runID) => ({
      scope: "scope",
      chat_history: chatHistory,
      last_run_id: runID,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
    return appended
  }

  async function consumeStream(input: Parameters<typeof SessionAgencySwarm.stream>[0]) {
    return consumeStreamFromResult(await SessionAgencySwarm.stream(input))
  }

  async function consumeStreamFromResult(stream: Awaited<ReturnType<typeof SessionAgencySwarm.stream>>) {
    const events: any[] = []
    for await (const event of stream.fullStream) {
      events.push(event)
    }
    return events
  }
})
