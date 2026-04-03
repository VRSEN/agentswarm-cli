import { afterEach, describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { Instance } from "../../src/project/instance"
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

  afterEach(() => {
    AgencySwarmAdapter.discover = originalDiscover
    AgencySwarmAdapter.getMetadata = originalGetMetadata
    AgencySwarmAdapter.streamRun = originalStreamRun
    AgencySwarmAdapter.cancel = originalCancel
    AgencySwarmHistory.load = originalLoad
    AgencySwarmHistory.appendMessages = originalAppendMessages
    AgencySwarmHistory.setLastRunID = originalSetLastRunID
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
    } satisfies Parameters<typeof SessionAgencySwarm.stream>[0]

    return {
      input,
      triggerCancel: () => abort.abort(),
      triggerAbort: () => abort.abort(),
    }
  }

  const mockHistory = (lastRunID?: string) => {
    const appended: unknown[][] = []
    const runs: (string | undefined)[] = []
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: [],
      last_run_id: lastRunID,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async (_scope, newMessages) => {
      appended.push(Array.isArray(newMessages) ? newMessages : [])
      return {
        scope: "scope",
        chat_history: [],
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

  test("optionsFromProvider applies defaults", () => {
    const options = SessionAgencySwarm.optionsFromProvider(undefined)

    expect(options.baseURL).toBe(AgencySwarmAdapter.DEFAULT_BASE_URL)
    expect(options.discoveryTimeoutMs).toBe(AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS)
    expect(options.agency).toBeUndefined()
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
    ])

    expect(outputs).toEqual([
      { callID: "call_1", output: '{\n  "value": 42\n}' },
      { callID: "call_2", output: "done" },
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
