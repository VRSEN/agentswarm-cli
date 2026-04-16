import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { hasClientConfigCredential } from "@/agency-swarm/client-config"
import type { Provider } from "@opencode-ai/sdk/v2"

export function hasUsableProvider(providers: Provider[], credentialed = false) {
  return providers.some((provider) => {
    if (provider.id !== "opencode") return credentialed ? hasCredential(provider) : true
    return Object.values(provider.models).some((model) => model.cost?.input !== 0)
  })
}

function hasCredential(provider: Provider) {
  if (provider.key) return true
  if (provider.source === "api" || provider.source === "env") return true
  const options = provider.options ?? {}
  return [options["apiKey"], options["api_key"], options["key"], options["token"]].some(
    (item) => typeof item === "string" && item.length > 0,
  )
}

function hasExplicitAgencyClientConfig(provider: Provider | undefined) {
  const raw = provider?.options?.["clientConfig"] ?? provider?.options?.["client_config"]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false
  return hasClientConfigCredential(raw as Record<string, unknown>)
}

export function isAgencySwarmFrameworkMode(input: { currentProviderID?: string; configuredModel?: string }) {
  if (input.currentProviderID === AgencySwarmAdapter.PROVIDER_ID) return true
  return input.configuredModel?.split("/")[0] === AgencySwarmAdapter.PROVIDER_ID
}

export function shouldOpenStartupAuthDialog(input: { providers: Provider[]; frameworkMode: boolean }) {
  if (!input.frameworkMode) return !hasUsableProvider(input.providers)

  const agencyProvider = input.providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  if (agencyProvider && (hasCredential(agencyProvider) || hasExplicitAgencyClientConfig(agencyProvider))) return false

  return !hasUsableProvider(
    input.providers.filter((provider) => provider.id !== AgencySwarmAdapter.PROVIDER_ID),
    true,
  )
}

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return /cannot reach agency-swarm backend/i.test(input.message)
}
