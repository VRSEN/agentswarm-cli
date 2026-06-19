/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { AssistantMessage, Provider } from "@opencode-ai/sdk/v2"
import { createTuiPluginApi } from "../../fixture/tui-plugin"

type SidebarContent = (ctx: unknown, props: { session_id: string }) => unknown

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

function provider(context: number): Provider {
  return {
    id: "agency-swarm",
    name: "Agency Swarm",
    source: "config",
    env: [],
    options: {},
    key: "token",
    models: {
      default: {
        id: "default",
        providerID: "agency-swarm",
        name: "Swarm Default",
        api: {
          id: "default",
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
          context,
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

async function renderContext(input: { context: number; messages?: AssistantMessage[]; cost?: number }) {
  let render: SidebarContent | undefined
  const api = createTuiPluginApi({
    state: {
      provider: [provider(input.context)],
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
  test("shows zero percent for fresh sessions without assistant usage", async () => {
    const frame = await renderContext({ context: 3_000, messages: [], cost: 0 })

    expect(frame).toContain("0 tokens")
    expect(frame).toContain("0% used")
    expect(frame).toContain("$0.00 spent")
    expect(frame).not.toContain("Usage percent unavailable")
  })

  test("shows real usage totals and spend when output tokens are zero", async () => {
    const frame = await renderContext({ context: 3_000 })
    const lines = frame.split("\n").map((line) => line.trim())

    expect(frame).toContain("1,500 tokens")
    expect(frame).toContain("50% used")
    expect(frame).toContain("$0.42 spent")
    expect(lines).not.toContain("0% used")
    expect(frame).not.toContain("$0.00 spent")
  })

  test("does not show a false zero percent for placeholder Agency Swarm context limits", async () => {
    const frame = await renderContext({ context: Number.MAX_SAFE_INTEGER })
    const lines = frame.split("\n").map((line) => line.trim())

    expect(frame).toContain("1,500 tokens")
    expect(frame).toContain("Usage percent unavailable")
    expect(lines).not.toContain("0% used")
  })
})
