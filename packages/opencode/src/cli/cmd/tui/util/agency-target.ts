import { displayAgentName } from "@/agent/display"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import {
  hasAgencyHandoffEvidence,
  isAgencyAgentUpdatedHandoffMetadata,
  isTopLevelAgencyHandoffMetadata,
} from "@/session/agency-swarm-utils"
import * as Locale from "@/util/locale"

export type AgencyHandoffMessage = {
  id: string
  role: string
  providerID?: string
  agent?: string
  time: {
    created?: number
    completed?: number
  }
}

export type AgencyHandoffPart = {
  type: string
  tool?: string
  metadata?: Record<string, unknown>
  state?: {
    status?: string
    output?: string
    metadata?: Record<string, unknown>
  }
}

export type AgencyProviderOptions = {
  baseURL: string
  token?: string
  configToken?: string
  agency?: string
  recipientAgent?: string
  recipientAgentSelectedAt?: number
  discoveryTimeoutMs: number
  rawOptions: Record<string, unknown>
}

export type AgencyTargetSelection = {
  agency: string
  agencyLabel?: string
  recipientAgent?: string
  label: string
}

export function readAgencyProviderOptions(input: {
  configuredProvider?: { options?: Record<string, unknown> }
  connectedProvider?: { key?: string }
}): AgencyProviderOptions {
  const options = input.configuredProvider?.options
  const baseURL =
    readString(options?.["baseURL"]) ?? readString(options?.["base_url"]) ?? AgencySwarmAdapter.DEFAULT_BASE_URL
  const configToken = readString(options?.["token"])
  const token = readString(input.connectedProvider?.key) ?? configToken
  const agency = readString(options?.["agency"])
  const recipientAgent = readString(options?.["recipientAgent"]) ?? readString(options?.["recipient_agent"])
  const recipientAgentSelectedAt =
    readPositiveNumber(options?.["recipientAgentSelectedAt"]) ??
    readPositiveNumber(options?.["recipient_agent_selected_at"])
  const discoveryTimeoutMs =
    readPositiveNumber(options?.["discoveryTimeoutMs"]) ??
    readPositiveNumber(options?.["discovery_timeout_ms"]) ??
    AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS

  return {
    baseURL: AgencySwarmAdapter.normalizeBaseURL(baseURL),
    token,
    configToken,
    agency,
    recipientAgent,
    recipientAgentSelectedAt,
    discoveryTimeoutMs,
    rawOptions: (options && typeof options === "object" ? options : {}) as Record<string, unknown>,
  }
}

export function resolveAgencyTargetSelection(input: {
  agencies: AgencySwarmAdapter.AgencyDescriptor[]
  configuredAgency?: string
  configuredRecipient?: string
}): AgencyTargetSelection | undefined {
  const agency = resolveSelectableAgency(input.agencies, input.configuredAgency)
  if (!agency) return undefined

  if (!input.configuredRecipient) {
    return {
      agency: agency.id,
      agencyLabel: agency.name,
      label: agency.name,
    }
  }

  const recipient = agency.agents.find((agent) => agent.id === input.configuredRecipient)
  if (!recipient) {
    return {
      agency: agency.id,
      agencyLabel: agency.name,
      recipientAgent: input.configuredRecipient,
      label: input.configuredRecipient,
    }
  }

  return {
    agency: agency.id,
    agencyLabel: agency.name,
    recipientAgent: recipient.id,
    label: recipient.name,
  }
}

export function cycleAgencyTargetSelection(input: {
  agencies: AgencySwarmAdapter.AgencyDescriptor[]
  configuredAgency?: string
  configuredRecipient?: string
  direction: 1 | -1
}): AgencyTargetSelection | undefined {
  const agency = resolveSelectableAgency(input.agencies, input.configuredAgency)
  if (!agency || agency.agents.length === 0) return undefined

  const fallback = defaultAgencyRecipient(agency)
  if (!fallback) return undefined

  const currentID = agency.agents.some((agent) => agent.id === input.configuredRecipient)
    ? input.configuredRecipient!
    : fallback.id
  const index = agency.agents.findIndex((agent) => agent.id === currentID)
  const next = agency.agents[(index + input.direction + agency.agents.length) % agency.agents.length]
  if (!next) return undefined

  return {
    agency: agency.id,
    agencyLabel: agency.name,
    recipientAgent: next.id,
    label: next.name,
  }
}

export function resolveAgencyTargetFromPicker(input: {
  agencies: AgencySwarmAdapter.AgencyDescriptor[]
  selectedAgency: string
  selectedRecipient?: string
}): AgencyTargetSelection | undefined {
  const agency = input.agencies.find((item) => item.id === input.selectedAgency)
  if (!agency) return undefined

  if (!input.selectedRecipient) {
    return {
      agency: agency.id,
      agencyLabel: agency.name,
      label: agency.name,
    }
  }

  const recipient = agency.agents.find((agent) => agent.id === input.selectedRecipient)
  if (!recipient) return undefined

  return {
    agency: agency.id,
    agencyLabel: agency.name,
    recipientAgent: recipient.id,
    label: recipient.name,
  }
}

export function buildAgencyTargetOptions(input: {
  providerOptions: AgencyProviderOptions
  agency: string
  recipientAgent?: string | null
}) {
  const nextOptions: Record<string, unknown> = {
    ...input.providerOptions.rawOptions,
    baseURL: input.providerOptions.baseURL,
    discoveryTimeoutMs: input.providerOptions.discoveryTimeoutMs,
    agency: input.agency,
    recipientAgent: input.recipientAgent ?? null,
    recipientAgentSelectedAt: Date.now(),
    recipient_agent: null,
    recipient_agent_selected_at: null,
  }

  if (input.providerOptions.configToken) {
    nextOptions["token"] = input.providerOptions.configToken
  }

  return nextOptions
}

export function shouldAdoptAgencyHandoffRecipient(input: {
  frameworkMode: boolean
  agency?: string
  currentRecipient?: string
  assistantAgent?: string
  handoffEvidence: boolean
}) {
  if (!input.frameworkMode) return false
  if (!input.agency) return false
  if (!input.assistantAgent) return false
  if (!input.handoffEvidence) return false
  if (input.assistantAgent === "build") return false
  return input.assistantAgent !== input.currentRecipient
}

export function resolveAgencyHandoffRecipientFromMessages(input: {
  frameworkMode: boolean
  agency?: string
  currentRecipient?: string
  currentRecipientSelectedAt?: number
  sessionID: string
  messages: AgencyHandoffMessage[]
  partsByMessage?: Record<string, AgencyHandoffPart[] | undefined>
}) {
  const assistant = input.messages.findLast((item) => {
    if (item.role !== "assistant") return false
    if (item.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
    const parts = input.partsByMessage?.[item.id] ?? []
    if (!hasAgencyHandoffEvidence(parts)) return false
    const handoffAgent = resolveAgencyHandoffRecipientFromParts(parts)
    return !!(handoffAgent ?? item.agent)
  })
  if (!assistant) return undefined
  const parts = input.partsByMessage?.[assistant.id] ?? []
  const agent = resolveAgencyHandoffRecipientFromParts(parts) ?? assistant.agent
  if (
    input.currentRecipientSelectedAt &&
    assistant.time.completed &&
    input.currentRecipientSelectedAt > assistant.time.completed
  ) {
    return undefined
  }
  if (
    !shouldAdoptAgencyHandoffRecipient({
      frameworkMode: input.frameworkMode,
      agency: input.agency,
      currentRecipient: input.currentRecipient,
      assistantAgent: agent,
      handoffEvidence: hasAgencyHandoffEvidence(parts),
    })
  ) {
    return undefined
  }
  return {
    sessionID: input.sessionID,
    messageID: assistant.id,
    agent: agent!,
    selectedAt: input.currentRecipientSelectedAt,
  }
}

export function resolveAgencyHandoffRecipientFromParts(parts: AgencyHandoffPart[]) {
  for (const part of parts.toReversed()) {
    const partMetadata = part.metadata
    const stateMetadata = part.state?.metadata
    const metadataAgent = isTopLevelAgencyHandoffMetadata(partMetadata)
      ? readAgentUpdatedHandoffMetadataAgent(partMetadata)
      : undefined
    if (metadataAgent) return metadataAgent
    if (part.type !== "tool") continue
    const outputAgent =
      isTopLevelAgencyHandoffMetadata(partMetadata) && isTopLevelAgencyHandoffMetadata(stateMetadata)
        ? (readHandoffOutputAgent(part.state?.output) ?? readHandoffMetadataAgent(stateMetadata))
        : undefined
    if (outputAgent) return outputAgent
    const toolAgent =
      isTopLevelAgencyHandoffMetadata(partMetadata) && isTopLevelAgencyHandoffMetadata(stateMetadata)
        ? readTransferToolAgent(part.tool)
        : undefined
    if (toolAgent) return toolAgent
  }
  return undefined
}

function readTransferToolAgent(tool: string | undefined) {
  const match = /^transfer_to_(.+)$/.exec(tool ?? "")
  return match?.[1]
}

function readHandoffOutputAgent(output: string | undefined) {
  if (!output) return undefined
  try {
    const parsed = JSON.parse(output)
    if (!parsed || typeof parsed !== "object") return undefined
    return readString(
      (parsed as Record<string, unknown>)["assistant"] ??
        (parsed as Record<string, unknown>)["agent"] ??
        (parsed as Record<string, unknown>)["recipientAgent"] ??
        (parsed as Record<string, unknown>)["recipient_agent"],
    )
  } catch {
    return undefined
  }
}

function readHandoffMetadataAgent(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined
  return readString(
    metadata["assistant"] ?? metadata["agent"] ?? metadata["recipientAgent"] ?? metadata["recipient_agent"],
  )
}

function readAgentUpdatedHandoffMetadataAgent(metadata: Record<string, unknown> | undefined) {
  if (!isAgencyAgentUpdatedHandoffMetadata(metadata)) return undefined
  return readHandoffMetadataAgent(metadata)
}

export function displayRunOnlyAgentLabel(input: {
  frameworkMode: boolean
  recipientLabel?: string
  localAgentName: string
}) {
  if (!input.frameworkMode) return displayAgentName(input.localAgentName)
  return input.recipientLabel ?? "Run"
}

export function displayRunOnlyModeLabel(input: { frameworkMode: boolean; mode: string }) {
  if (input.frameworkMode) return "Run"
  return Locale.titlecase(input.mode)
}

function resolveSelectableAgency(agencies: AgencySwarmAdapter.AgencyDescriptor[], configuredAgency?: string) {
  if (configuredAgency) return agencies.find((agency) => agency.id === configuredAgency)
  if (agencies.length === 1) return agencies[0]
  return undefined
}

function defaultAgencyRecipient(agency: AgencySwarmAdapter.AgencyDescriptor) {
  return agency.agents.find((agent) => agent.isEntryPoint) ?? agency.agents[0]
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function readPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined
  if (!Number.isFinite(value)) return undefined
  if (value <= 0) return undefined
  return value
}
