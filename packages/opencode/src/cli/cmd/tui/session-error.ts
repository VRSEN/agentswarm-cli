import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import type { Provider } from "@opencode-ai/sdk/v2"

export function hasUsableProvider(providers: Provider[]) {
  return providers.some((provider) => {
    if (provider.id !== "opencode") return true
    return Object.values(provider.models).some((model) => model.cost?.input !== 0)
  })
}

function hasExplicitAgencyClientConfig(provider: Provider | undefined) {
  const raw = provider?.options?.["clientConfig"] ?? provider?.options?.["client_config"]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false
  return Object.keys(raw).length > 0
}

export function shouldOpenStartupAuthDialog(input: { providers: Provider[]; frameworkMode: boolean }) {
  if (!input.frameworkMode) return !hasUsableProvider(input.providers)

  const agencyProvider = input.providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  if (hasExplicitAgencyClientConfig(agencyProvider)) return false

  return !hasUsableProvider(input.providers.filter((provider) => provider.id !== AgencySwarmAdapter.PROVIDER_ID))
}

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return /cannot reach agency-swarm backend/i.test(input.message)
}
