import type { Provider } from "@opencode-ai/sdk/v2"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import * as Model from "./model"

export type ModelLabelContext = {
  providers?: Provider[] | ReadonlyMap<string, Provider>
  agencies?: readonly AgencySwarmAdapter.AgencyDescriptor[]
  agencyID?: string
  agentID?: string
}

export function resolveModelLabel(
  input: ModelLabelContext & { providerID: string; modelID: string; fallback?: string },
) {
  const fallback = input.fallback ?? Model.name(input.providers, input.providerID, input.modelID)
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return fallback
  if (input.modelID !== AgencySwarmAdapter.DEFAULT_MODEL_ID) return fallback
  return resolveAgencyModelLabel(input) ?? fallback
}

export function resolveAgencyDefaultModelLabel(input: {
  agencies?: readonly AgencySwarmAdapter.AgencyDescriptor[]
  agencyID?: string
}) {
  const agency = resolveAgency(input.agencies ?? [], input.agencyID)
  if (!agency) return undefined
  return formatAgencyModelLabel(agency)
}

function resolveAgencyModelLabel(input: {
  agencies?: readonly AgencySwarmAdapter.AgencyDescriptor[]
  agencyID?: string
  agentID?: string
}) {
  const agency = resolveAgency(input.agencies ?? [], input.agencyID)
  if (!agency) return undefined
  return resolveAgencyAgentModelLabel(agency, input.agentID) ?? formatAgencyModelLabel(agency)
}

function resolveAgencyAgentModelLabel(agency: AgencySwarmAdapter.AgencyDescriptor, agentID: string | undefined) {
  if (!agentID) return undefined
  const agent = agency.agents.find((item) => item.id === agentID) ?? agency.agents.find((item) => item.name === agentID)
  return agent?.model
}

function formatAgencyModelLabel(agency: AgencySwarmAdapter.AgencyDescriptor) {
  const seen = new Set<string>()
  const agents = [
    ...agency.agents.filter((agent) => agent.isEntryPoint),
    ...agency.agents.filter((agent) => !agent.isEntryPoint),
  ]
  const labels = agents.flatMap((agent) => {
    if (!agent.model) return []
    if (seen.has(agent.model)) return []
    seen.add(agent.model)
    return [agent.model]
  })
  return AgencySwarmAdapter.formatModelLabels(labels)
}

function resolveAgency(agencies: readonly AgencySwarmAdapter.AgencyDescriptor[], agencyID: string | undefined) {
  if (agencyID) return agencies.find((item) => item.id === agencyID)
  if (agencies.length === 1) return agencies[0]
  return undefined
}
