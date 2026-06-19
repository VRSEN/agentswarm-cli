/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { RGBA } from "@opentui/core"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import { countAgencyAgents, formatAgencyCounts } from "../../../src/cli/cmd/tui/util/agency-counts"
import { createTuiPluginApi } from "../../fixture/tui-plugin"

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
  providerID?: string
}) {
  const providerID = input.providerID ?? AgencySwarmAdapter.PROVIDER_ID
  stubLocal(providerID)
  if (input.error) {
    spyOn(AgencySwarmAdapter, "discover").mockRejectedValue(input.error)
  } else {
    spyOn(AgencySwarmAdapter, "discover").mockResolvedValue({
      agencies: input.agencies ?? [],
      rawOpenAPI: {},
    })
  }

  let render: (() => unknown) | undefined
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
    },
  })
  const api = {
    ...base,
    slots: {
      register(plugin: { slots: { sidebar_content?: () => unknown } }) {
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
  const rendered = await testRender(() => render?.() ?? null, { width: 80, height: 16 })
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
    expect(formatAgencyCounts(countAgencyAgents([]))).toBe("0 main / 0 sub")
    expect(formatAgencyCounts(countAgencyAgents([main("Lead")]))).toBe("1 main / 0 sub")
    expect(formatAgencyCounts(countAgencyAgents([main("Lead"), sub("Review"), sub("Write")]))).toBe("1 main / 2 sub")
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
    expect(frame).toContain("1 main / 2 sub")
    expect(frame).toContain("Active: Review")
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
