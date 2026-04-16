import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
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

function hasClientConfigCredential(config: Record<string, unknown>) {
  if (typeof config["api_key"] === "string" && config["api_key"]) return true
  if (typeof config["apiKey"] === "string" && config["apiKey"]) return true
  const litellmKeys = config["litellm_keys"] ?? config["litellmKeys"]
  if (!litellmKeys || typeof litellmKeys !== "object" || Array.isArray(litellmKeys)) return false
  return Object.values(litellmKeys).some((item) => typeof item === "string" && item.length > 0)
}

export function shouldOpenStartupAuthDialog(input: { providers: Provider[]; frameworkMode: boolean }) {
  if (!input.frameworkMode) return !hasUsableProvider(input.providers)

  const agencyProvider = input.providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  if (hasExplicitAgencyClientConfig(agencyProvider)) return false

  return !hasUsableProvider(
    input.providers.filter((provider) => provider.id !== AgencySwarmAdapter.PROVIDER_ID),
    true,
  )
}

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return /cannot reach agency-swarm backend/i.test(input.message)
}
