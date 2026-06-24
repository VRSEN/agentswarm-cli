/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { RGBA } from "@opentui/core"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import { countAgencyAgents, formatAgencyCounts } from "../../../src/cli/cmd/tui/util/agency-counts"
import { createTuiPluginApi } from "../../fixture/tui-plugin"

type StateMessage = ReturnType<TuiPluginApi["state"]["session"]["messages"]>[number]
type StatePart = ReturnType<TuiPluginApi["state"]["part"]>[number]

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

function agency(input: {
  id: string
  name: string
  agents: AgencySwarmAdapter.AgencyAgentDescriptor[]
}): AgencySwarmAdapter.AgencyDescriptor {
  return {
    id: input.id,
    name: input.name,
    agents: input.agents,
    metadata: {},
  }
}

function main(id: string): AgencySwarmAdapter.AgencyAgentDescriptor {
  return {
    id,
    name: id,
    isEntryPoint: true,
  }
}

function sub(id: string): AgencySwarmAdapter.AgencyAgentDescriptor {
  return {
    id,
    name: id,
    isEntryPoint: false,
  }
}

function assistant(input: { id: string; sessionID: string; agent: string; completed: number }): StateMessage {
  return {
    id: input.id,
    sessionID: input.sessionID,
    role: "assistant",
    time: {
      created: input.completed - 1,
      completed: input.completed,
    },
    parentID: "message_user_1",
    modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
    providerID: AgencySwarmAdapter.PROVIDER_ID,
    mode: "build",
    agent: input.agent,
    path: {
      cwd: "",
      root: "",
    },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0,
      },
    },
  }
}

function transfer(input: { id: string; sessionID: string; messageID: string; agent: string }): StatePart {
  return {
    id: input.id,
    sessionID: input.sessionID,
    messageID: input.messageID,
    type: "tool",
    callID: "call_transfer",
    tool: `transfer_to_${input.agent}`,
    state: {
      status: "completed",
      input: {},
      output: "",
      title: "Transfer",
      metadata: {},
      time: {
        start: 1,
        end: 2,
      },
    },
  }
}

function stubLocal(providerID = AgencySwarmAdapter.PROVIDER_ID) {
  spyOn(LocalContext, "useLocal").mockReturnValue({
    agent: {
      current: () => ({
        name: "build",
        model: {
          providerID,
          modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
        },
      }),
      list: () => [{ name: "build" }],
      set: mock(() => undefined),
      color: () => RGBA.fromHex("#38bdf8"),
    },
    model: {
      current: () => ({
        providerID,
        modelID: providerID === AgencySwarmAdapter.PROVIDER_ID ? AgencySwarmAdapter.DEFAULT_MODEL_ID : "gpt-5.5",
      }),
      variant: {
        current: () => undefined,
        list: () => [],
        set: mock(() => undefined),
      },
    },
  } as unknown as ReturnType<typeof LocalContext.useLocal>)
}

async function renderSidebar(input: {
  agencies?: AgencySwarmAdapter.AgencyDescriptor[]
  error?: Error
  agency?: string
  recipientAgent?: string
  recipientAgentSelectedAt?: number
  sessionID?: string
  messages?: StateMessage[]
  parts?: Record<string, StatePart[]>
  providerID?: string
}) {
  const providerID = input.providerID ?? AgencySwarmAdapter.PROVIDER_ID
  const sessionID = input.sessionID ?? "session_1"
  stubLocal(providerID)
  if (input.error) {
    spyOn(AgencySwarmAdapter, "discover").mockRejectedValue(input.error)
  } else {
    spyOn(AgencySwarmAdapter, "discover").mockResolvedValue({
      agencies: input.agencies ?? [],
      rawOpenAPI: {},
    })
  }

  let render: ((ctx: unknown, props: { session_id: string }) => unknown) | undefined
  const base = createTuiPluginApi({
    state: {
      config: {
        model:
          providerID === AgencySwarmAdapter.PROVIDER_ID
            ? `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`
            : "openai/gpt-5.5",
        provider: {
          [AgencySwarmAdapter.PROVIDER_ID]: {
            options: {
              baseURL: "http://127.0.0.1:8000",
              agency: input.agency,
              recipientAgent: input.recipientAgent,
              recipientAgentSelectedAt: input.recipientAgentSelectedAt,
            },
          },
        },
      },
      provider: [
        {
          id: AgencySwarmAdapter.PROVIDER_ID,
          name: "Agency Swarm",
          source: "config",
          env: [],
          options: {},
          models: {},
          key: "token",
        },
      ],
      session: {
        messages: (id) => (id === sessionID ? (input.messages ?? []) : []),
      },
      part: (id) => input.parts?.[id] ?? [],
    },
  })
  const api = {
    ...base,
    slots: {
      register(plugin: { slots: { sidebar_content?: (ctx: unknown, props: { session_id: string }) => unknown } }) {
        render = plugin.slots.sidebar_content
        return "fixture-slot"
      },
    },
  } as typeof base

  const plugin = (await import("../../../src/cli/cmd/tui/feature-plugins/sidebar/agency")).default
  await plugin.tui(api, undefined, {
    state: "same",
    id: "internal:sidebar-agency",
    source: "internal",
    spec: "internal:sidebar-agency",
    target: "internal:sidebar-agency",
    first_time: 0,
    last_time: 0,
    time_changed: 0,
    load_count: 1,
    fingerprint: "internal:sidebar-agency",
  })
  const rendered = await testRender(() => render?.({}, { session_id: sessionID }) ?? null, { width: 80, height: 16 })
  await flushEffects()
  await Bun.sleep(0)
  await flushEffects()
  await rendered.renderOnce()

  return rendered.captureCharFrame()
}

describe("sidebar agency plugin", () => {
  afterEach(() => {
    mock.restore()
  })

  test("formats main and subagent counts", () => {
    expect(formatAgencyCounts(countAgencyAgents([]))).toBe("0 main / 0 subagents")
    expect(formatAgencyCounts(countAgencyAgents([main("Lead")]))).toBe("1 main / 0 subagents")
    expect(formatAgencyCounts(countAgencyAgents([main("Lead"), sub("Review")]))).toBe("1 main / 1 subagent")
    expect(formatAgencyCounts(countAgencyAgents([main("Lead"), sub("Review"), sub("Write")]))).toBe(
      "1 main / 2 subagents",
    )
  })

  test("does not discover or render outside framework mode", async () => {
    const frame = await renderSidebar({
      providerID: "openai",
    })

    expect(AgencySwarmAdapter.discover).not.toHaveBeenCalled()
    expect(frame).not.toContain("Swarm")
  })

  test("shows selected swarm counts and active agent", async () => {
    const frame = await renderSidebar({
      agency: "live",
      recipientAgent: "Review",
      agencies: [agency({ id: "live", name: "Live Agency", agents: [main("Lead"), sub("Review"), sub("Write")] })],
    })

    expect(frame).toContain("Swarm")
    expect(frame).toContain("Live Agency")
    expect(frame).toContain("1 main / 2 subagents")
    expect(frame).toContain("Active: Review")
  })

  test("shows handed off recipient from session history as active", async () => {
    const sessionID = "session_1"
    const messageID = "message_assistant_1"
    const frame = await renderSidebar({
      agency: "live",
      recipientAgent: "Lead",
      recipientAgentSelectedAt: 1,
      sessionID,
      messages: [assistant({ id: messageID, sessionID, agent: "Lead", completed: 2 })],
      parts: {
        [messageID]: [transfer({ id: "part_transfer", sessionID, messageID, agent: "Review" })],
      },
      agencies: [agency({ id: "live", name: "Live Agency", agents: [main("Lead"), sub("Review")] })],
    })

    expect(frame).toContain("Swarm")
    expect(frame).toContain("Live Agency")
    expect(frame).toContain("Active: Review")
    expect(frame).not.toContain("Active: Lead")
  })

  test("shows handed off recipient as active for default single swarm", async () => {
    const sessionID = "session_1"
    const messageID = "message_assistant_1"
    const frame = await renderSidebar({
      sessionID,
      messages: [assistant({ id: messageID, sessionID, agent: "Lead", completed: 2 })],
      parts: {
        [messageID]: [transfer({ id: "part_transfer", sessionID, messageID, agent: "Review" })],
      },
      agencies: [agency({ id: "live", name: "Live Agency", agents: [main("Lead"), sub("Review")] })],
    })

    expect(frame).toContain("Swarm")
    expect(frame).toContain("Live Agency")
    expect(frame).toContain("Active: Review")
    expect(frame).not.toContain("Active: Lead")
  })

  test("shows concise fallback states", async () => {
    const empty = await renderSidebar({
      agencies: [],
    })
    expect(empty).toContain("No swarms")

    const failed = await renderSidebar({
      error: new Error("offline"),
    })
    expect(failed).toContain("Agents unavailable")
  })
})
