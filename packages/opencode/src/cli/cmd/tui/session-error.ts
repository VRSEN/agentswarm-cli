import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { hasClientConfigCredential } from "@/agency-swarm/client-config"
import { Flag } from "@/flag/flag"
import { hasStoredProviderCredential } from "@tui/util/provider-auth"
import type { Provider, ProviderAuthMethod } from "@opencode-ai/sdk/v2"

export const AGENCY_SWARM_PRIMARY_AUTH_PROVIDER_IDS = ["openai", "anthropic"] as const

type ProviderAuthMap = Record<string, ProviderAuthMethod[]>
type AuthProvider = {
  id: string
  env: string[]
  key?: string
  source?: string
  options?: Record<string, unknown>
}

export function hasUsableProvider(providers: Provider[], credentialed = false, providerAuth: ProviderAuthMap = {}) {
  return providers.some((provider) => {
    if (provider.id !== "opencode") return credentialed ? hasCredential(provider, providerAuth) : true
    return Object.values(provider.models).some((model) => model.cost?.input !== 0)
  })
}

function hasCredential(provider: Provider, providerAuth: ProviderAuthMap = {}) {
  if (provider.key) return true
  if (provider.source === "api") return true
  const options = provider.options ?? {}
  if (
    [options["apiKey"], options["api_key"], options["key"], options["token"]].some(
      (item) => typeof item === "string" && item.length > 0,
    )
  ) {
    return true
  }

  return hasStoredProviderCredential([provider], providerAuth, provider.id)
}

function hasConfiguredAPIStyleCredential(provider: AuthProvider | undefined) {
  if (!provider) return false
  if (provider.key) return true
  if (provider.source === "api") return true
  const options = provider.options ?? {}
  return [options["apiKey"], options["api_key"], options["key"], options["token"]].some(
    (item) => typeof item === "string" && item.length > 0,
  )
}

function isLoopbackBaseURL(baseURL: string) {
  try {
    const parsed = new URL(baseURL)
    return (
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "[::1]"
    )
  } catch {
    return false
  }
}

function usesLocalAgencyProviderAuth(providers: Provider[]) {
  const agencyProvider = providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  const rawBaseURL = agencyProvider?.options?.["baseURL"] ?? agencyProvider?.options?.["base_url"]
  const baseURL = typeof rawBaseURL === "string" && rawBaseURL.trim() ? rawBaseURL : AgencySwarmAdapter.DEFAULT_BASE_URL
  return isLoopbackBaseURL(baseURL)
}

/**
 * Forwarding upstream credentials means the agency-swarm call depends on locally stored OpenAI/Anthropic
 * credentials even against non-loopback base URLs (e.g. `host.docker.internal`, remote bridges).
 * Active when the env flag is set, the caller passes the override, or the agency-swarm provider opts in.
 */
function isForwardUpstreamCredentialsActive(providers: Provider[], override?: boolean) {
  if (override === true) return true
  if (Flag.AGENTSWARM_FORWARD_UPSTREAM_CREDENTIALS) return true
  const agency = providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  const opts = agency?.options ?? {}
  return opts["forwardUpstreamCredentials"] === true || opts["forward_upstream_credentials"] === true
}

export function isSupportedAgencyAuthProvider(
  providerID: string,
  _provider?: AuthProvider,
  _methods: ProviderAuthMethod[] = [],
) {
  return (AGENCY_SWARM_PRIMARY_AUTH_PROVIDER_IDS as readonly string[]).includes(providerID)
}

function isAgencyProviderCredentialFailure(message: string) {
  return /missing provider credentials|client_config|invalid api key|api key rejected|authentication failed|auth failed|access token/i.test(
    message,
  )
}

function hasSupportedAgencyCredential(providers: Provider[], providerAuth: ProviderAuthMap = {}) {
  return providers.some((provider) => {
    if (provider.id === AgencySwarmAdapter.PROVIDER_ID) return false
    if (!isSupportedAgencyAuthProvider(provider.id, provider, providerAuth[provider.id] ?? [])) return false
    if (provider.id === "openai") return hasCredential(provider, providerAuth)
    return hasConfiguredAPIStyleCredential(provider)
  })
}

function hasExplicitAgencyClientConfig(provider: Provider | undefined) {
  const raw = provider?.options?.["clientConfig"] ?? provider?.options?.["client_config"]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false
  return hasClientConfigCredential(raw as Record<string, unknown>)
}

/**
 * True when the app is running in Agent Swarm mode. Session `currentProviderID` may be `openai` or `anthropic`
 * (upstream LiteLLM) while `config.model` / the agent default still use `agency-swarm` — those must keep framework mode so /auth stays OpenAI+Anthropic only.
 *
 * **Precedence (first match wins):** `configuredModel` → `agentModel` → `currentProviderID`.
 * This differs from checking only `currentProviderID` first: e.g. when the session provider is already `openai`
 * but the configured or agent model still points at `agency-swarm/...`, framework mode stays on so auth and
 * provider UI stay aligned with Agent Swarm.
 */
export function isAgencySwarmFrameworkMode(input: {
  currentProviderID?: string
  configuredModel?: string
  agentModel?: { providerID: string; modelID: string }
}) {
  if (input.configuredModel?.split("/")[0] === AgencySwarmAdapter.PROVIDER_ID) {
    return true
  }
  if (input.agentModel?.providerID === AgencySwarmAdapter.PROVIDER_ID) {
    return true
  }
  if (input.currentProviderID === AgencySwarmAdapter.PROVIDER_ID) {
    return true
  }
  return false
}

export function shouldOpenStartupAuthDialog(input: {
  providers: Provider[]
  providerAuth?: ProviderAuthMap
  frameworkMode: boolean
  /** Override for the upstream-credential forwarding path; when undefined the value is inferred from env + provider options. */
  forwardUpstreamCredentials?: boolean
}) {
  if (!input.frameworkMode) return !hasUsableProvider(input.providers, false, input.providerAuth)

  const agencyProvider = input.providers.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
  if (
    agencyProvider &&
    (hasCredential(agencyProvider, input.providerAuth) || hasExplicitAgencyClientConfig(agencyProvider))
  ) {
    return false
  }
  const forwardingActive = isForwardUpstreamCredentialsActive(input.providers, input.forwardUpstreamCredentials)
  if (!forwardingActive && !usesLocalAgencyProviderAuth(input.providers)) return false

  return !hasSupportedAgencyCredential(input.providers, input.providerAuth)
}

export function shouldBlockAgencyPromptSend(input: {
  currentProviderID?: string
  configuredModel?: string
  agentModel?: { providerID: string; modelID: string }
  providers: Provider[]
  providerAuth?: ProviderAuthMap
}) {
  if (!isAgencySwarmFrameworkMode(input)) return false
  return shouldOpenStartupAuthDialog({
    providers: input.providers,
    providerAuth: input.providerAuth,
    frameworkMode: true,
  })
}

export function shouldBlockAgencyPromptSubmit(input: {
  currentProviderID?: string
  configuredModel?: string
  agentModel?: { providerID: string; modelID: string }
  providers: Provider[]
  providerAuth?: ProviderAuthMap
  mode: "normal" | "shell"
  isSlashCommand: boolean
}) {
  if (input.mode === "shell" || input.isSlashCommand) return false
  return shouldBlockAgencyPromptSend(input)
}

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  if (/cannot reach agency-swarm backend/i.test(input.message)) return true
  if (isAgencyProviderCredentialFailure(input.message)) return false
  return /unauthori[sz]ed|forbidden|\b401\b|\b403\b/i.test(input.message)
}

export function shouldOpenAgencyAuthDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  if (shouldOpenAgencyConnectDialog(input)) return false
  return isAgencyProviderCredentialFailure(input.message)
}

export function describeAgencyAuthFailure(message: string) {
  if (/missing provider credentials|client_config/i.test(message)) {
    return "Add a supported provider credential before sending a message."
  }
  if (/unauthori[sz]ed|forbidden|invalid api key|auth failed|\b401\b|\b403\b/i.test(message)) {
    return "The current provider credential was rejected. Reconnect OpenAI or Anthropic and try again."
  }
  return message
}
