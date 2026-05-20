import { AgencySwarmAdapter } from "./adapter"

export type AgencySwarmRunModeInput = {
  currentProviderID?: string
  configuredModel?: string
  agentModel?: { providerID: string; modelID: string }
}

export function isAgencySwarmModel(model?: string) {
  return model?.split("/")[0] === AgencySwarmAdapter.PROVIDER_ID
}

export function resolveAgencySwarmRunMode(input: AgencySwarmRunModeInput) {
  if (isAgencySwarmModel(input.configuredModel)) return { active: true, reason: "config" as const }
  if (input.agentModel?.providerID === AgencySwarmAdapter.PROVIDER_ID) {
    return { active: true, reason: "agent" as const }
  }
  if (input.currentProviderID === AgencySwarmAdapter.PROVIDER_ID) {
    return { active: true, reason: "provider" as const }
  }
  return { active: false, reason: undefined }
}

export function isAgencySwarmRunMode(input: AgencySwarmRunModeInput) {
  return resolveAgencySwarmRunMode(input).active
}
