import { describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import { resolveAssistantModelLabel, resolveModelLabel } from "../../../src/cli/cmd/tui/util/model-label"

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

  test("does not use aggregate labels for missing selected-agent metadata", () => {
    const result = resolveModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "missing",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("Swarm Default")
  })

  test("uses clear aggregate label when no selected agent is scoped", () => {
    const result = resolveModelLabel({
      agencies,
      agencyID: "demo",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("Swarm models: gpt-5.4-mini +1")
  })

  test("falls back when agency scope is intentionally unset", () => {
    const result = resolveModelLabel({
      agencies,
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("Swarm Default")
  })

  test("uses sole discovered agency when configured agency is omitted", () => {
    const result = resolveModelLabel({
      agencies,
      allowSingleAgency: true,
      agentID: "reviewer",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("claude-sonnet-4-5")
  })

  test("falls back when configured agency is omitted and discovery is ambiguous", () => {
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
      allowSingleAgency: true,
      agentID: "reviewer",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
    })

    expect(result).toBe("Swarm Default")
  })

  test("uses configured recipient model for visible internal build assistant label", () => {
    const result = resolveAssistantModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "build",
      recipientAgent: "reviewer",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
      frameworkMode: true,
    })

    expect(result).toBe("claude-sonnet-4-5")
  })

  test("uses submitted real model before agency metadata for bridge assistant label", () => {
    const result = resolveAssistantModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "build",
      recipientAgent: "orchestrator",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      submittedModel: {
        providerID: "openrouter",
        modelID: "anthropic/claude-sonnet-4.5",
      },
      fallback: "Swarm Default",
      frameworkMode: true,
    })

    expect(result).toBe("anthropic/claude-sonnet-4.5")
    expect(result).not.toBe("gpt-5.4-mini")
  })

  test("falls back for visible internal build assistant label when recipient is unresolvable", () => {
    const result = resolveAssistantModelLabel({
      agencies,
      agencyID: "demo",
      agentID: "build",
      recipientAgent: "missing",
      providerID: AgencySwarmAdapter.PROVIDER_ID,
      modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
      fallback: "Swarm Default",
      frameworkMode: true,
    })

    expect(result).toBe("Swarm Default")
    expect(result).not.toContain("Swarm models")
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
