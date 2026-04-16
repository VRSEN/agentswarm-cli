import type { Provider, ProviderAuthMethod } from "@opencode-ai/sdk/v2"

export function hasStoredProviderCredential(
  providers: Provider[],
  methods: Record<string, ProviderAuthMethod[]>,
  providerID: string,
) {
  const provider = providers.find((item) => item.id === providerID)
  if (!provider) return false
  if (provider.source === "api") return true
  if (provider.source !== "custom") return false
  return (methods[providerID] ?? []).some((item) => item.type === "oauth")
}

export function getVisibleProviderAuthMethods(
  providerID: string,
  methods: ProviderAuthMethod[],
  options?: { frameworkMode?: boolean },
) {
  if (!options?.frameworkMode) return methods
  if (providerID !== "openai") return methods
  return methods.filter((item) => !(item.type === "oauth" && /headless/i.test(item.label)))
}
