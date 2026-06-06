import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import {
  hasExplicitOpenAIApiKey,
  hasExplicitOpenAIClientConfig,
  readCredentialHeaders,
  readStringRecord,
} from "@/agency-swarm/client-config"
import {
  isOpenAIBasedLitellmModel,
  isOpenRouterClientConfigModel,
  mapProviderIDToLiteLLMProvider,
  normalizeExplicitClientConfigModel,
  OPENAI_BASED_LITELLM_PROVIDERS,
} from "@/agency-swarm/litellm-provider"
import { Auth } from "@/auth"
import { Env } from "@/env"
import { CODEX_API_BASE_URL, extractAccountId, refreshAccessToken } from "@/plugin/codex"
import { Provider } from "@/provider/provider"
import { Log } from "@opencode-ai/core/util/log"
import { Flag } from "@opencode-ai/core/flag/flag"
import semver from "semver"
import { asRecord, asString } from "./agency-swarm-utils"

const log = Log.create({ service: "session.agency-swarm" })
const STRUCTURED_ATTACHMENT_MESSAGE_MIN_VERSION = "1.9.6"
const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key"
const OPENROUTER_FREE_TIER_MAX_TOKENS = 2500

async function finalizeClientConfig(
  merged: Record<string, unknown> | undefined,
  explicitForModel: Record<string, unknown> | undefined,
  sessionLitellmModel: string | undefined,
  sessionModelSettingsExtraArgs: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | undefined> {
  const explicitModel = explicitForModel && asString(explicitForModel["model"])
  const applySessionSettings = async (out: Record<string, unknown>) => {
    if (sessionModelSettingsExtraArgs && Object.keys(sessionModelSettingsExtraArgs).length > 0) {
      out["model_settings_extra_args"] = {
        ...(asRecord(out["model_settings_extra_args"]) ?? {}),
        ...sessionModelSettingsExtraArgs,
      }
    }
    await applyOpenRouterTokenPolicy(out)
    return out
  }
  if (merged && Object.keys(merged).length > 0) {
    const out = { ...merged }
    if (sessionLitellmModel) {
      out["model"] = sessionLitellmModel
    } else if (explicitModel) {
      out["model"] = normalizeExplicitClientConfigModel(explicitModel)
    }
    return applySessionSettings(out)
  }
  if (explicitModel) {
    return applySessionSettings({ model: normalizeExplicitClientConfigModel(explicitModel) })
  }
  if (sessionLitellmModel) {
    return applySessionSettings({ model: sessionLitellmModel })
  }
  if (sessionModelSettingsExtraArgs && Object.keys(sessionModelSettingsExtraArgs).length > 0) {
    return applySessionSettings({})
  }
  return undefined
}

async function applyOpenRouterTokenPolicy(out: Record<string, unknown>) {
  const model = asString(out["model"])
  if (!model || !isOpenRouterClientConfigModel(model)) return

  const modelSettings = asRecord(out["model_settings_extra_args"])
  if (!modelSettings || modelSettings["__openrouter_default_max_tokens"] !== true) return

  delete modelSettings["__openrouter_default_max_tokens"]
  const apiKey = asString(out["api_key"]) ?? asString(out["apiKey"])
  const freeTier = await isOpenRouterFreeTier(apiKey)
  if (freeTier) {
    modelSettings["max_tokens"] = OPENROUTER_FREE_TIER_MAX_TOKENS
  } else {
    delete modelSettings["max_tokens"]
  }
  if (Object.keys(modelSettings).length === 0) {
    delete out["model_settings_extra_args"]
  }
}

async function isOpenRouterFreeTier(apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) return true
  try {
    const response = await fetch(OPENROUTER_KEY_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return true
    const payload = asRecord(await response.json().catch(() => undefined))
    const data = asRecord(payload?.["data"])
    const isFreeTier = data?.["is_free_tier"]
    return isFreeTier !== false
  } catch (error) {
    log.warn("failed to inspect OpenRouter key tier; using free-tier token cap", {
      error: error instanceof Error ? error.message : String(error),
    })
    return true
  }
}

export async function resolveClientConfig(
  baseURL: string,
  agency: string,
  token: string | undefined,
  timeoutMs: number,
  config: Record<string, unknown> | undefined,
  forwardUpstreamCredentials?: boolean,
  sessionLitellmModel?: string,
  sessionModelSettingsExtraArgs?: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const explicit = asRecord(config)
  const explicitUpstreamBaseURL = readConfiguredBaseURL(explicit)
  const explicitModel = explicit && asString(explicit["model"])
  const requestedModel =
    sessionLitellmModel ?? (explicitModel ? normalizeExplicitClientConfigModel(explicitModel) : undefined)
  const forwardGenerated =
    isLocalAgencyURL(baseURL) || Flag.AGENTSWARM_FORWARD_UPSTREAM_CREDENTIALS || forwardUpstreamCredentials === true
  const targetOpenRouter = isOpenRouterClientConfigModel(requestedModel)
  const skipOpenAIApiKey = hasExplicitOpenAIApiKey(config) || !!readCredentialHeaders(config) || targetOpenRouter
  const rawGenerated = forwardGenerated
    ? await buildAuthClientConfig(await Auth.all(), await listProvidersForEnvCheck(), await getEnvForClientConfig(), {
        skipOpenAIApiKeyInjection: skipOpenAIApiKey,
        skipOpenAIOAuthFromStored: hasExplicitOpenAIClientConfig(config),
        allowStoredOpenAIOAuth: !explicitUpstreamBaseURL || isCodexAPIBaseURL(explicitUpstreamBaseURL),
        targetOpenRouter,
      })
    : undefined
  const generated =
    rawGenerated && !explicitUpstreamBaseURL
      ? (await shouldStripCodexOAuth(requestedModel, rawGenerated, explicit, async () => {
          try {
            return await AgencySwarmAdapter.getMetadata({
              baseURL,
              agency,
              token,
              timeoutMs,
            })
          } catch (error) {
            log.error("unable to load agency metadata while deciding Codex OAuth routing", {
              baseURL,
              agency,
              error: error instanceof Error ? error.message : String(error),
            })
            return undefined
          }
        }))
        ? stripCodexOAuthForNonOpenAI(rawGenerated)
        : rawGenerated
      : rawGenerated
  if (!config) {
    return await finalizeClientConfig(generated, undefined, sessionLitellmModel, sessionModelSettingsExtraArgs)
  }
  if (!generated) {
    return await finalizeClientConfig(explicit, explicit, sessionLitellmModel, sessionModelSettingsExtraArgs)
  }

  if (!explicit) {
    return await finalizeClientConfig(generated, undefined, sessionLitellmModel, sessionModelSettingsExtraArgs)
  }

  const merged: Record<string, unknown> = {
    ...generated,
    ...explicit,
  }

  const explicitAPIKey = asString(explicit["api_key"]) ?? asString(explicit["apiKey"])
  if (explicitAPIKey) {
    merged["api_key"] = explicitAPIKey
  }
  delete merged["apiKey"]

  const explicitBaseURL = asString(explicit["base_url"]) ?? asString(explicit["baseURL"])
  const generatedBaseURL = asString(generated["base_url"])
  if (explicitBaseURL) {
    merged["base_url"] = explicitBaseURL
  } else if (generatedBaseURL) {
    merged["base_url"] = generatedBaseURL
  }
  delete merged["baseURL"]

  const generatedLiteLLMKeys = asRecord(generated["litellm_keys"])
  const explicitLiteLLMKeys = asRecord(explicit["litellm_keys"]) ?? asRecord(explicit["litellmKeys"])
  if (explicitLiteLLMKeys !== undefined) {
    merged["litellm_keys"] = explicitLiteLLMKeys
  } else if (generatedLiteLLMKeys) {
    merged["litellm_keys"] = generatedLiteLLMKeys
  }
  delete merged["litellmKeys"]

  const generatedHeaders = readStringRecord(generated["default_headers"])
  const explicitHeaders = readStringRecord(explicit["default_headers"]) ?? readStringRecord(explicit["defaultHeaders"])
  if (generatedHeaders || explicitHeaders) {
    merged["default_headers"] = {
      ...(generatedHeaders ?? {}),
      ...(explicitHeaders ?? {}),
    }
  }
  delete merged["defaultHeaders"]

  return await finalizeClientConfig(merged, explicit, sessionLitellmModel, sessionModelSettingsExtraArgs)
}

async function buildAuthClientConfig(
  auths: Record<string, Auth.Info>,
  providers: Record<string, Provider.Info> | undefined,
  env: Record<string, string | undefined>,
  options: {
    skipOpenAIApiKeyInjection: boolean
    skipOpenAIOAuthFromStored: boolean
    allowStoredOpenAIOAuth: boolean
    targetOpenRouter: boolean
  },
): Promise<Record<string, unknown> | undefined> {
  const payload: Record<string, unknown> = {}
  const litellmKeys: Record<string, string> = {}

  for (const [providerID, provider] of Object.entries(providers ?? {})) {
    if (providerID === AgencySwarmAdapter.PROVIDER_ID) continue
    const key = getEnvCredential(provider, env)
    if (!key) continue

    if (providerID === "openai") {
      if (!options.skipOpenAIApiKeyInjection) payload["api_key"] = key
      continue
    }

    if (providerID === "openrouter") {
      if (options.targetOpenRouter) payload["api_key"] = key
      continue
    }

    const litellmProvider = mapProviderIDToLiteLLMProvider(providerID)
    if (!litellmProvider) continue
    litellmKeys[litellmProvider] = key
  }

  for (const [providerID, auth] of Object.entries(auths)) {
    if (providerID === AgencySwarmAdapter.PROVIDER_ID) continue
    if (hasEnvCredential(providerID, providers, env) && !(options.targetOpenRouter && providerID === "openrouter")) {
      continue
    }

    if (providerID === "openai" && auth.type === "oauth") {
      if (options.skipOpenAIOAuthFromStored || !options.allowStoredOpenAIOAuth) continue
      try {
        Object.assign(payload, await buildOpenAIOAuthClientConfig(auth))
      } catch (error) {
        log.warn("failed to refresh stored OpenAI OAuth for local agency run; skipping it", {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      continue
    }

    if (auth.type !== "api") continue

    if (providerID === "openai") {
      if (!options.skipOpenAIApiKeyInjection) payload["api_key"] = auth.key
      continue
    }

    if (providerID === "openrouter") {
      if (options.targetOpenRouter) payload["api_key"] = auth.key
      continue
    }

    const litellmProvider = mapProviderIDToLiteLLMProvider(providerID)
    if (!litellmProvider) continue
    litellmKeys[litellmProvider] = auth.key
  }

  if (Object.keys(litellmKeys).length > 0) {
    payload["litellm_keys"] = litellmKeys
  }

  if (!options.skipOpenAIApiKeyInjection && !payload["api_key"]) {
    const fromEnv = env["OPENAI_API_KEY"]
    if (typeof fromEnv === "string") {
      const trimmed = fromEnv.trim()
      if (trimmed) payload["api_key"] = trimmed
    }
  }

  if (options.targetOpenRouter && !payload["api_key"]) {
    const fromEnv = env["OPENROUTER_API_KEY"]
    if (typeof fromEnv === "string") {
      const trimmed = fromEnv.trim()
      if (trimmed) payload["api_key"] = trimmed
    }
  }

  return Object.keys(payload).length > 0 ? payload : undefined
}

async function buildOpenAIOAuthClientConfig(auth: Auth.Oauth): Promise<Record<string, unknown>> {
  const current =
    auth.expires < Date.now()
      ? await refreshAccessToken(auth.refresh).then(async (tokens) => {
          const accountID = extractAccountId(tokens) ?? auth.accountId
          const next = {
            type: "oauth" as const,
            refresh: tokens.refresh_token,
            access: tokens.access_token,
            expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
            ...(accountID ? { accountId: accountID } : {}),
          }
          await Auth.set("openai", next)
          return next
        })
      : auth
  const headers: Record<string, string> = {}
  if (current.accountId) headers["ChatGPT-Account-Id"] = current.accountId
  return {
    api_key: current.access,
    base_url: CODEX_API_BASE_URL,
    ...(Object.keys(headers).length > 0 ? { default_headers: headers } : {}),
  }
}

export function readConfiguredBaseURL(config: Record<string, unknown> | undefined) {
  return asString(config?.["base_url"]) ?? asString(config?.["baseURL"])
}

export function isCodexAPIBaseURL(value: string) {
  return value.replace(/\/+$/, "") === CODEX_API_BASE_URL
}

function hasNonOpenAILitellmKey(src: Record<string, unknown> | undefined): boolean {
  if (!src) return false
  const keys = asRecord(src["litellm_keys"]) ?? asRecord(src["litellmKeys"])
  if (!keys) return false
  return Object.entries(keys).some(
    ([provider, value]) =>
      typeof value === "string" && value.length > 0 && !OPENAI_BASED_LITELLM_PROVIDERS.has(provider),
  )
}

function readStableAgencySwarmVersion(metadata: AgencySwarmAdapter.AgencyMetadata): string | undefined {
  const version = asString(metadata["agency_swarm_version"])
  if (!version) return undefined
  const match = version.trim().match(/^(?:v)?(\d+\.\d+\.\d+)(?:(?:\.post\d+)|(?:post\d+)|(?:\+[0-9a-z.-]+))?$/i)
  if (!match) {
    log.warn("agency metadata exposed a prerelease or unreadable agency_swarm_version", {
      version,
    })
    return undefined
  }
  return match[1]
}

function scopesCodexBaseURLPerProvider(metadata: AgencySwarmAdapter.AgencyMetadata): boolean {
  const version = readStableAgencySwarmVersion(metadata)
  if (!version) return false
  return semver.gte(version, "1.9.3")
}

export function supportsStructuredAttachmentMessages(metadata: AgencySwarmAdapter.AgencyMetadata): boolean {
  if (hasStructuredAttachmentCapability(metadata)) return true
  const version = readStableAgencySwarmVersion(metadata)
  if (!version) return false
  return semver.gte(version, STRUCTURED_ATTACHMENT_MESSAGE_MIN_VERSION)
}

function hasStructuredAttachmentCapability(metadata: AgencySwarmAdapter.AgencyMetadata): boolean {
  const capabilities = asRecord(metadata["capabilities"])
  const features = asRecord(metadata["features"])
  return (
    metadata["structured_message_attachments"] === true ||
    metadata["structuredMessageAttachments"] === true ||
    capabilities?.["structured_message_attachments"] === true ||
    capabilities?.["structuredMessageAttachments"] === true ||
    features?.["structured_message_attachments"] === true ||
    features?.["structuredMessageAttachments"] === true
  )
}

async function shouldStripCodexOAuth(
  sessionLitellmModel: string | undefined,
  generated: Record<string, unknown> | undefined,
  explicit: Record<string, unknown> | undefined,
  loadAgencyMetadata: () => Promise<AgencySwarmAdapter.AgencyMetadata | undefined>,
): Promise<boolean> {
  const sessionTargetsNonOpenAI =
    !!sessionLitellmModel && !isOpenAIBasedLitellmModel(normalizeExplicitClientConfigModel(sessionLitellmModel))
  if (!sessionTargetsNonOpenAI && sessionLitellmModel) return false
  if (!sessionTargetsNonOpenAI && !hasNonOpenAILitellmKey(generated) && !hasNonOpenAILitellmKey(explicit)) {
    return false
  }

  const metadata = await loadAgencyMetadata()
  if (!metadata) {
    log.error("agency metadata unavailable while deciding Codex OAuth routing; stripping OpenAI OAuth conservatively")
    return true
  }

  if (scopesCodexBaseURLPerProvider(metadata)) {
    return false
  }

  if (sessionTargetsNonOpenAI) return true

  const agencyModels = extractAgencyModels(metadata)
  if (agencyModels.length === 0) {
    log.error(
      "agency metadata exposed no agent models while deciding Codex OAuth routing; stripping OpenAI OAuth conservatively",
      {
        metadataKeys: Object.keys(metadata),
      },
    )
    return true
  }

  const nonOpenAIModels = agencyModels.filter(
    (model) => !isOpenAIBasedLitellmModel(normalizeExplicitClientConfigModel(model)),
  )
  if (nonOpenAIModels.length === 0) {
    log.info("keeping Codex OAuth for agency-swarm request because agency metadata only exposes OpenAI-based models", {
      agencyModels,
    })
    return false
  }

  log.warn(
    "stripping Codex OAuth because agency metadata exposes non-OpenAI models and upstream applies base_url globally",
    {
      agencyModels,
      nonOpenAIModels,
    },
  )
  return true
}

function stripCodexOAuthForNonOpenAI(
  generated: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return stripGeneratedCodexOAuth(generated)
}

function stripGeneratedCodexOAuth(generated: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!generated) return generated
  const base = asString(generated["base_url"])
  if (!base || !isCodexAPIBaseURL(base)) return generated
  const out: Record<string, unknown> = { ...generated }
  delete out["base_url"]
  delete out["api_key"]
  const headers = readStringRecord(out["default_headers"])
  if (headers && "ChatGPT-Account-Id" in headers) {
    const next = Object.fromEntries(Object.entries(headers).filter(([key]) => key !== "ChatGPT-Account-Id"))
    if (Object.keys(next).length > 0) out["default_headers"] = next
    else delete out["default_headers"]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function hasEnvCredential(
  providerID: string,
  providers: Record<string, Provider.Info> | undefined,
  env: Record<string, string | undefined>,
): boolean {
  if (!providers) return false
  const provider = providers[providerID]
  if (!provider) return false
  return !!getEnvCredential(provider, env)
}

function getEnvCredential(provider: Provider.Info, env: Record<string, string | undefined>) {
  if (provider.env.length === 0) return undefined
  if (!provider.env.every(isAPIKeyEnvName)) return undefined
  return provider.env.map((key) => env[key]).find(Boolean)
}

function isAPIKeyEnvName(name: string) {
  return /(^|_)(API_KEY|API_TOKEN|PAT|TOKEN)$/.test(name)
}

async function listProvidersForEnvCheck(): Promise<Record<string, Provider.Info> | undefined> {
  try {
    return await Provider.list()
  } catch (error) {
    log.error(
      "failed to list providers while building agency-swarm client_config; continuing without provider env inspection",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    )
    return undefined
  }
}

async function getEnvForClientConfig(): Promise<Record<string, string | undefined>> {
  try {
    return await Env.all()
  } catch (error) {
    log.error("failed to read Env service while building agency-swarm client_config; falling back to process.env", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { ...process.env }
  }
}

/** Loopback + common dev hostnames (Docker Desktop, etc.) where local-only forwarding is expected. */
export function isLocalAgencyURL(baseURL: string) {
  try {
    const parsed = new URL(baseURL)
    const h = parsed.hostname.toLowerCase()
    return (
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "localhost" ||
      h === "::1" ||
      h === "[::1]" ||
      h === "host.docker.internal" ||
      h === "kubernetes.docker.internal"
    )
  } catch {
    return false
  }
}

function extractAgencyModels(metadata: AgencySwarmAdapter.AgencyMetadata): string[] {
  const models = new Set<string>()
  const nodes = Array.isArray(metadata["nodes"]) ? metadata["nodes"] : []
  for (const rawNode of nodes) {
    const node = asRecord(rawNode)
    if (!node) continue
    if (asString(node["type"]) !== "agent") continue
    const data = asRecord(node["data"])
    const model = asString(data?.["model"])
    if (model) models.add(model)
  }
  return [...models]
}
