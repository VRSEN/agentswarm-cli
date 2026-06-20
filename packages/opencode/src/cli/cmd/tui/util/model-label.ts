import type { Provider } from "@opencode-ai/sdk/v2"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import * as Model from "./model"

export type ModelLabelContext = {
  providers?: Provider[] | ReadonlyMap<string, Provider>
  agencies?: readonly AgencySwarmAdapter.AgencyDescriptor[]
  agencyID?: string
  agentID?: string
}

export type ModelLabelScope = "agent" | "agency"

type ModelRef = {
  providerID: string
  modelID: string
}

type AssistantModelLabelInput = ModelLabelContext & {
  providerID: string
  modelID: string
  fallback?: string
  scope?: ModelLabelScope
  recipientAgent?: string
  submittedModel?: ModelRef
  frameworkMode?: boolean
}

export function resolveModelLabel(
  input: ModelLabelContext & { providerID: string; modelID: string; fallback?: string; scope?: ModelLabelScope },
) {
  const fallback = input.fallback ?? Model.name(input.providers, input.providerID, input.modelID)
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return fallback
  if (input.modelID !== AgencySwarmAdapter.DEFAULT_MODEL_ID) return fallback
  return resolveAgencyModelLabel(input) ?? fallback
}

export function resolveAssistantModelLabel(input: AssistantModelLabelInput) {
  const submitted = resolveSubmittedModelLabel(input)
  if (submitted) return submitted
  const agentID =
    input.scope === "agency"
      ? undefined
      : resolveAgencyModelAgentID({
          providerID: input.providerID,
          modelID: input.modelID,
          agentID: input.agentID,
          recipientAgent: input.recipientAgent,
          frameworkMode: input.frameworkMode,
        })
  return resolveModelLabel({
    ...input,
    agentID,
    scope: input.scope ?? (agentID ? "agent" : "agency"),
  })
}

function resolveSubmittedModelLabel(input: ModelLabelContext & ModelRef & { submittedModel?: ModelRef }) {
  if (!input.submittedModel) return undefined
  if (!isAgencyDefaultModel(input)) return undefined
  if (isAgencyDefaultModel(input.submittedModel)) return undefined
  return resolveModelLabel({
    providers: input.providers,
    agencies: input.agencies,
    agencyID: input.agencyID,
    agentID: input.agentID,
    providerID: input.submittedModel.providerID,
    modelID: input.submittedModel.modelID,
  })
}

function resolveAgencyModelAgentID(input: {
  providerID: string
  modelID: string
  agentID?: string
  recipientAgent?: string
  frameworkMode?: boolean
}) {
  if (input.frameworkMode === false) return input.agentID
  if (!isAgencyDefaultModel(input)) return input.agentID
  if (input.agentID && input.agentID !== "build") return input.agentID
  return input.recipientAgent
}

function isAgencyDefaultModel(input: ModelRef) {
  return input.providerID === AgencySwarmAdapter.PROVIDER_ID && input.modelID === AgencySwarmAdapter.DEFAULT_MODEL_ID
}

function resolveAgencyModelLabel(input: {
  agencies?: readonly AgencySwarmAdapter.AgencyDescriptor[]
  agencyID?: string
  agentID?: string
  scope?: ModelLabelScope
}) {
  const agency = resolveAgency(input.agencies ?? [], input.agencyID)
  if (!agency) return undefined
  const model = resolveAgencyAgentModelLabel(agency, input.agentID)
  if (model) return model
  const scope = input.scope ?? (input.agentID ? "agent" : "agency")
  if (scope === "agent") return undefined
  return formatAgencyModelLabel(agency)
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
  const first = labels[0]
  if (!first) return undefined
  const label = labels.length === 1 ? first : `${first} +${labels.length - 1}`
  if (labels.length === 1) return label
  return `Swarm models: ${label}`
}

function resolveAgency(agencies: readonly AgencySwarmAdapter.AgencyDescriptor[], agencyID: string | undefined) {
  if (agencyID) return agencies.find((item) => item.id === agencyID)
  if (agencies.length === 1) return agencies[0]
  return undefined
}
