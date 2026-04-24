import { displayAgentName } from "@/agent/display"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { Locale } from "@/util/locale"

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
  recipientAgent: string
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

  const current = input.configuredRecipient
    ? agency.agents.find((agent) => agent.id === input.configuredRecipient)
    : undefined
  const recipient = current ?? defaultAgencyRecipient(agency)
  if (!recipient) return undefined

  return {
    agency: agency.id,
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
    recipientAgent: next.id,
    label: next.name,
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
    recipientAgentSelectedAt: input.recipientAgent ? Date.now() : null,
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
  completed?: boolean
}) {
  if (!input.frameworkMode) return false
  if (!input.completed) return false
  if (!input.agency) return false
  if (!input.assistantAgent) return false
  if (input.assistantAgent === "build") return false
  return input.assistantAgent !== input.currentRecipient
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
