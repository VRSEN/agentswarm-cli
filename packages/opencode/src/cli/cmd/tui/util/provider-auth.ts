import type { Provider, ProviderAuthMethod } from "@opencode-ai/sdk/v2"

export const OAUTH_DUMMY_KEY = "opencode-oauth-dummy-key"

export type StoredProviderAuthMethod = "oauth" | "api" | "env" | "config"

export function hasStoredProviderCredential(
  providers: Provider[],
  _methods: Record<string, ProviderAuthMethod[]>,
  providerID: string,
) {
  const provider = providers.find((item) => item.id === providerID)
  if (!provider) return false
  if (provider.source === "api") return true
  if (provider.source !== "custom") return false
  const options = provider.options ?? {}
  if (provider.id === "opencode" && options["apiKey"] === "public") return false
  return Object.keys(options).length > 0
}

export function getVisibleProviderAuthMethods(
  providerID: string,
  methods: ProviderAuthMethod[],
  options?: { frameworkMode?: boolean },
) {
  if (!options?.frameworkMode) return methods
  if (providerID === "openai") {
    return methods.filter((item) => !(item.type === "oauth" && /headless/i.test(item.label)))
  }
  return methods
}

export function getStoredProviderAuthMethod(provider: Provider): StoredProviderAuthMethod | undefined {
  const options = provider.options ?? {}
  if (provider.source === "api") return "api"
  if (provider.source === "env" && (provider.env?.length ?? 0) > 0) return "env"
  if (provider.source === "config" && typeof options["apiKey"] === "string" && options["apiKey"]) return "config"
  if (provider.source === "custom") {
    if (provider.id === "opencode" && options["apiKey"] === "public") return undefined
    if (options["apiKey"] === OAUTH_DUMMY_KEY) return "oauth"
    if (Object.keys(options).length > 0) return "oauth"
  }
  return undefined
}

export function getProviderAuthMethodSuffix(
  method: ProviderAuthMethod,
  current?: StoredProviderAuthMethod,
): string | undefined {
  if (!current) return undefined
  if (current === "oauth") return method.type === "oauth" ? "<- current" : undefined
  if (current === "api" || current === "env" || current === "config") {
    return method.type === "api" ? "<- current" : undefined
  }
  return undefined
}
