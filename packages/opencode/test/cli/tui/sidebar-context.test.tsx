/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { AssistantMessage, Provider } from "@opencode-ai/sdk/v2"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import { createTuiPluginApi } from "../../fixture/tui-plugin"

type SidebarContent = (ctx: unknown, props: { session_id: string }) => unknown

type ModelSelection = {
  providerID: string
  modelID: string
}

const agencyModel = { providerID: "agency-swarm", modelID: "default" }
const openaiModel = { providerID: "openai", modelID: "gpt-5.1" }

function mockLocal(input: { current?: ModelSelection; agentModel?: ModelSelection } = {}) {
  const current = input.current ?? agencyModel
  spyOn(LocalContext, "useLocal").mockReturnValue({
    model: {
      current: () => current,
    },
    agent: {
      current: () => ({ model: input.agentModel }),
    },
  } as unknown as ReturnType<typeof LocalContext.useLocal>)
}

function assistant(tokens: AssistantMessage["tokens"]): AssistantMessage {
  return {
    id: "message_assistant_1",
    role: "assistant",
    sessionID: "session_1",
    parentID: "message_user_1",
    time: {
      created: 1,
      completed: 2,
    },
    modelID: "default",
    providerID: "agency-swarm",
    mode: "build",
    agent: "build",
    path: {
      cwd: "/tmp/project",
      root: "/tmp/project",
    },
    cost: 0.42,
    tokens,
    finish: "stop",
  } as unknown as AssistantMessage
}

function provider(input: { context: number; model?: ModelSelection; name?: string; modelName?: string }): Provider {
  const model = input.model ?? agencyModel
  return {
    id: model.providerID,
    name: input.name ?? "Agency Swarm",
    source: "config",
    env: [],
    options: {},
    key: "token",
    models: {
      [model.modelID]: {
        id: model.modelID,
        providerID: model.providerID,
        name: input.modelName ?? "Swarm Default",
        api: {
          id: model.modelID,
          npm: "@ai-sdk/openai-compatible",
          url: "http://127.0.0.1:8000",
        },
        status: "active",
        headers: {},
        options: {},
        release_date: "2026-01-01",
        cost: {
          input: 0,
          output: 0,
          cache: {
            read: 0,
            write: 0,
          },
        },
        limit: {
          context: input.context,
          output: 8_192,
        },
        capabilities: {
          toolcall: true,
          attachment: true,
          reasoning: false,
          temperature: false,
          input: { text: true, image: true, audio: false, video: false, pdf: false },
          output: { text: true, image: false, audio: false, video: false, pdf: false },
          interleaved: false,
        },
      },
    },
  }
}

async function renderContext(input: {
  context?: number
  providers?: Provider[]
  messages?: AssistantMessage[]
  cost?: number
  configModel?: string
}) {
  let render: SidebarContent | undefined
  const api = createTuiPluginApi({
    state: {
      config: input.configModel ? ({ model: input.configModel } as never) : undefined,
      provider: input.providers ?? [provider({ context: input.context ?? 3_000 })],
      session: {
        get: () => ({ cost: input.cost ?? 0.42 }) as never,
        messages: () =>
          input.messages ?? [
            assistant({
              total: 1_500,
              input: 1_200,
              output: 0,
              reasoning: 0,
              cache: {
                read: 0,
                write: 0,
              },
            }),
          ],
      },
    },
  })
  const withSlot = {
    ...api,
    slots: {
      register(plugin: { slots: { sidebar_content?: SidebarContent } }) {
        render = plugin.slots.sidebar_content
        return "fixture-slot"
      },
    },
  } as typeof api

  const plugin = (await import("../../../src/cli/cmd/tui/feature-plugins/sidebar/context")).default
  await plugin.tui(withSlot, undefined, {
    state: "same",
    id: "internal:sidebar-context",
    source: "internal",
    spec: "internal:sidebar-context",
    target: "internal:sidebar-context",
    first_time: 0,
    last_time: 0,
    time_changed: 0,
    load_count: 1,
    fingerprint: "internal:sidebar-context",
  })
  const rendered = await testRender(() => render?.({}, { session_id: "session_1" }) ?? null, {
    width: 80,
    height: 8,
  })
  await rendered.renderOnce()
  return rendered.captureCharFrame()
}

describe("sidebar context plugin", () => {
  afterEach(() => {
    mock.restore()
  })

  test("shows zero percent for fresh non-Run-mode sessions without assistant usage", async () => {
    mockLocal({ current: openaiModel })
    const frame = await renderContext({
      providers: [provider({ context: 3_000, model: openaiModel, name: "OpenAI", modelName: "GPT-5.1" })],
      messages: [],
      cost: 0,
    })

    expect(frame).toContain("0 tokens")
    expect(frame).toContain("0% used")
    expect(frame).toContain("$0.00 spent")
    expect(frame).not.toContain("Usage percent unavailable")
  })

  test("hides percent for fresh Run-mode sessions with visible OpenAI model state", async () => {
    mockLocal({ current: openaiModel, agentModel: agencyModel })
    const frame = await renderContext({
      configModel: "agency-swarm/default",
      providers: [
        provider({ context: 128_000, model: openaiModel, name: "OpenAI", modelName: "GPT-5.1" }),
        provider({ context: Number.MAX_SAFE_INTEGER, model: agencyModel }),
      ],
      messages: [],
      cost: 0,
    })

    expect(frame).toContain("0 tokens")
    expect(frame).toContain("$0.00 spent")
    expect(frame).not.toContain("Usage percent unavailable")
    expect(frame).not.toContain("% used")
  })

  test("hides percent for fresh sessions with placeholder Agency Swarm context limits", async () => {
    mockLocal()
    const frame = await renderContext({ context: Number.MAX_SAFE_INTEGER, messages: [], cost: 0 })

    expect(frame).toContain("0 tokens")
    expect(frame).toContain("$0.00 spent")
    expect(frame).not.toContain("Usage percent unavailable")
    expect(frame).not.toContain("% used")
  })

  test("shows real usage totals and spend when output tokens are zero", async () => {
    mockLocal()
    const frame = await renderContext({ context: 3_000 })
    const lines = frame.split("\n").map((line) => line.trim())

    expect(frame).toContain("1,500 tokens")
    expect(frame).toContain("50% used")
    expect(frame).toContain("$0.42 spent")
    expect(lines).not.toContain("0% used")
    expect(frame).not.toContain("$0.00 spent")
  })

  test("shows positive sub-cent spend as less than one cent", async () => {
    mockLocal()
    const frame = await renderContext({ context: 3_000, cost: 0.006 })

    expect(frame).toContain("1,500 tokens")
    expect(frame).toContain("50% used")
    expect(frame).not.toContain("$0.00 spent")
    expect(frame).toContain("<$0.01 spent")
  })

  test("hides percent for placeholder Agency Swarm context limits", async () => {
    mockLocal()
    const frame = await renderContext({ context: Number.MAX_SAFE_INTEGER })
    const lines = frame.split("\n").map((line) => line.trim())

    expect(frame).toContain("1,500 tokens")
    expect(frame).not.toContain("Usage percent unavailable")
    expect(lines).not.toContain("0% used")
    expect(frame).not.toContain("% used")
  })
})
