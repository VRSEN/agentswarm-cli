import { describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import { resolveAgencyDefaultModelLabel, resolveModelLabel } from "../../../src/cli/cmd/tui/util/model-label"

const agencies: AgencySwarmAdapter.AgencyDescriptor[] = [
  {
    id: "demo",
    name: "Demo Agency",
    agents: [
      {
        id: "orchestrator",
        name: "Orchestrator",
        model: "gpt-5.4-mini",
        isEntryPoint: true,
      },
      {
        id: "reviewer",
        name: "Reviewer",
        model: "claude-sonnet-4-5",
        isEntryPoint: false,
      },
      {
        id: "support",
        name: "Support",
        model: "gpt-5.4-mini",
        isEntryPoint: false,
      },
    ],
    metadata: {},
  },
]

describe("model-label", () => {
  test("formats unique agency default model labels", () => {
    expect(
      resolveAgencyDefaultModelLabel({
        agencies,
        agencyID: "demo",
      }),
    ).toBe("gpt-5.4-mini +1")
  })

  test("uses matched agent model before agency aggregate", () => {
    const result = resolveModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "reviewer",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("claude-sonnet-4-5")
  })

  test("falls back to aggregate when the agent has no metadata model", () => {
    const result = resolveModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "missing",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("gpt-5.4-mini +1")
  })

  test("falls back when configured agency does not match ambiguous discovery", () => {
    const result = resolveModelLabel({
      agencies: [
        ...agencies,
        {
          id: "other",
          name: "Other Agency",
          agents: [
            {
              id: "other-agent",
              name: "Other Agent",
              model: "gpt-5.5-pro",
              isEntryPoint: true,
            },
          ],
          metadata: {},
        },
      ],
      agencyID: "missing",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("Swarm Default")
  })
})
