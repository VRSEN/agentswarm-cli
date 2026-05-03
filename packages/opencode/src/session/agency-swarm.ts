import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import {
  hasExplicitOpenAIApiKey,
  hasExplicitOpenAIClientConfig,
  readCredentialHeaders,
  readStringRecord,
} from "@/agency-swarm/client-config"
import { Flag } from "@opencode-ai/core/flag/flag"
import { AgencySwarmHistory } from "@/agency-swarm/history"
import {
  buildLitellmModelForClientConfig,
  isOpenAIBasedLitellmModel,
  mapProviderIDToLiteLLMProvider,
  normalizeExplicitClientConfigModel,
  OPENAI_BASED_LITELLM_PROVIDERS,
} from "@/agency-swarm/litellm-provider"
import { Auth } from "@/auth"
import { Env } from "@/env"
import { CODEX_API_BASE_URL, extractAccountId, refreshAccessToken } from "@/plugin/codex"
import { Provider } from "@/provider/provider"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionID } from "@/session/schema"
import { Log } from "@/util"
import semver from "semver"
import {
  asRecord,
  asRawString,
  asString,
  buildOutgoingMessage,
  buildStructuredOutgoingMessage,
  cleanupMaterializedFilePaths,
  compactMetadata,
  collectFileURLs,
  extractEventMeta,
  extractFunctionCallOutputs as extractFunctionCallOutputsFromMessages,
  findRecipientAgent,
  hasAgencyHandoffEvidence,
  isAgencyAgentUpdatedHandoffMetadata,
  isAgencyToolOutputType,
  isTopLevelAgencyHandoffMetadata,
  normalizeCallerAgent as normalizeCallerAgentValue,
  parseToolInput,
  stringifyToolOutput,
  type AgencyMessageInput,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"

export namespace SessionAgencySwarm {
  const log = Log.create({ service: "session.agency-swarm" })
  export const PROVIDER_ID = AgencySwarmAdapter.PROVIDER_ID

  const CANCEL_BEFORE_META_ABORT_MS = 3000
  const STRUCTURED_ATTACHMENT_MESSAGE_MIN_VERSION = "1.9.6"

  export type RuntimeOptions = {
    baseURL: string
    agency?: string
    recipientAgent?: string
    recipientAgentSelectedAt?: number
    additionalInstructions?: string
    userContext?: Record<string, unknown>
    fileIDs?: string[]
    generateChatName?: boolean
    clientConfig?: Record<string, unknown>
    /** When true, merge stored/env credentials into client_config for non-local base URLs (see also AGENTSWARM_FORWARD_UPSTREAM_CREDENTIALS). */
    forwardUpstreamCredentials?: boolean
    token?: string
    discoveryTimeoutMs: number
  }

  export type StreamInput = {
    sessionID: SessionID
    assistantMessage: MessageV2.Assistant
    userMessage: MessageV2.WithParts
    options: RuntimeOptions
    abort: AbortSignal
    /** Session UI model for this turn; forwarded as `client_config.model` (bare id for OpenAI, else `litellm/...`) for server-side override. */
    sessionModel?: { providerID: string; modelID: string }
    recipientAgent?: string
  }

  type Usage = {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    reasoningTokens: number
    cachedInputTokens: number
    cacheWriteInputTokens: number
    cost?: number
  }

  type Tool = {
    callID: string
    tool: string
    raw: string
    started: boolean
    running: boolean
    done: boolean
  }

  export function optionsFromProvider(provider: Provider.Info | undefined): RuntimeOptions {
    const rawBaseURL = asString(provider?.options?.["baseURL"])
    const rawAgency = asString(provider?.options?.["agency"])
    const rawRecipientAgent =
      asString(provider?.options?.["recipientAgent"]) ?? asString(provider?.options?.["recipient_agent"])
    const rawRecipientAgentSelectedAt =
      asNumber(provider?.options?.["recipientAgentSelectedAt"]) ??
      asNumber(provider?.options?.["recipient_agent_selected_at"])
    const rawAdditionalInstructions =
      asString(provider?.options?.["additionalInstructions"]) ??
      asString(provider?.options?.["additional_instructions"])
    const rawUserContext = asRecord(provider?.options?.["userContext"]) ?? asRecord(provider?.options?.["user_context"])
    const rawFileIDs = asStringArray(provider?.options?.["fileIDs"] ?? provider?.options?.["file_ids"])
    const rawGenerateChatName =
      asBoolean(provider?.options?.["generateChatName"]) ?? asBoolean(provider?.options?.["generate_chat_name"])
    const rawClientConfig =
      asRecord(provider?.options?.["clientConfig"]) ?? asRecord(provider?.options?.["client_config"])
    const opts = provider?.options
    const rawForwardUpstream =
      opts?.["forwardUpstreamCredentials"] === true || opts?.["forward_upstream_credentials"] === true
    const rawToken = asString(provider?.key) ?? asString(provider?.options?.["token"])
    const rawTimeout = provider?.options?.["discoveryTimeoutMs"]

    return {
      baseURL: AgencySwarmAdapter.normalizeBaseURL(rawBaseURL || AgencySwarmAdapter.DEFAULT_BASE_URL),
      agency: rawAgency || undefined,
      recipientAgent: rawRecipientAgent || undefined,
      recipientAgentSelectedAt: rawRecipientAgentSelectedAt,
      additionalInstructions: rawAdditionalInstructions || undefined,
      userContext: rawUserContext,
      fileIDs: rawFileIDs.length > 0 ? rawFileIDs : undefined,
      generateChatName: rawGenerateChatName,
      clientConfig: rawClientConfig,
      forwardUpstreamCredentials: rawForwardUpstream === true ? true : undefined,
      token: rawToken || undefined,
      discoveryTimeoutMs:
        typeof rawTimeout === "number" && Number.isFinite(rawTimeout) && rawTimeout > 0
          ? rawTimeout
          : AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS,
    }
  }

  function finalizeClientConfig(
    merged: Record<string, unknown> | undefined,
    explicitForModel: Record<string, unknown> | undefined,
    sessionLitellmModel: string | undefined,
  ): Record<string, unknown> | undefined {
    const explicitModel = explicitForModel && asString(explicitForModel["model"])
    if (merged && Object.keys(merged).length > 0) {
      const out = { ...merged }
      if (explicitModel) {
        out["model"] = normalizeExplicitClientConfigModel(explicitModel)
      } else if (sessionLitellmModel) {
        out["model"] = sessionLitellmModel
      }
      return out
    }
    if (explicitModel) {
      return { model: normalizeExplicitClientConfigModel(explicitModel) }
    }
    if (sessionLitellmModel) {
      return { model: sessionLitellmModel }
    }
    return undefined
  }

  async function resolveClientConfig(
    baseURL: string,
    agency: string,
    token: string | undefined,
    timeoutMs: number,
    config: Record<string, unknown> | undefined,
    forwardUpstreamCredentials?: boolean,
    sessionLitellmModel?: string,
  ): Promise<Record<string, unknown> | undefined> {
    const explicit = asRecord(config)
    const explicitUpstreamBaseURL = readConfiguredBaseURL(explicit)
    const explicitModel = explicit && asString(explicit["model"])
    const requestedModel = explicitModel ? normalizeExplicitClientConfigModel(explicitModel) : sessionLitellmModel
    const forwardGenerated =
      isLocalAgencyURL(baseURL) || Flag.AGENTSWARM_FORWARD_UPSTREAM_CREDENTIALS || forwardUpstreamCredentials === true
    const skipOpenAIApiKey = hasExplicitOpenAIApiKey(config) || !!readCredentialHeaders(config)
    const rawGenerated = forwardGenerated
      ? await buildAuthClientConfig(await Auth.all(), await listProvidersForEnvCheck(), await getEnvForClientConfig(), {
          skipOpenAIApiKeyInjection: skipOpenAIApiKey,
          skipOpenAIOAuthFromStored: hasExplicitOpenAIClientConfig(config),
          allowStoredOpenAIOAuth: !explicitUpstreamBaseURL || isCodexAPIBaseURL(explicitUpstreamBaseURL),
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
      return finalizeClientConfig(generated, undefined, sessionLitellmModel)
    }
    if (!generated) {
      return finalizeClientConfig(explicit, explicit, sessionLitellmModel)
    }

    if (!explicit) {
      return finalizeClientConfig(generated, undefined, sessionLitellmModel)
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
    const explicitHeaders =
      readStringRecord(explicit["default_headers"]) ?? readStringRecord(explicit["defaultHeaders"])
    if (generatedHeaders || explicitHeaders) {
      merged["default_headers"] = {
        ...(generatedHeaders ?? {}),
        ...(explicitHeaders ?? {}),
      }
    }
    delete merged["defaultHeaders"]

    return finalizeClientConfig(merged, explicit, sessionLitellmModel)
  }

  async function buildAuthClientConfig(
    auths: Record<string, Auth.Info>,
    providers: Record<string, Provider.Info> | undefined,
    env: Record<string, string | undefined>,
    options: {
      skipOpenAIApiKeyInjection: boolean
      skipOpenAIOAuthFromStored: boolean
      allowStoredOpenAIOAuth: boolean
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

      const litellmProvider = mapProviderIDToLiteLLMProvider(providerID)
      if (!litellmProvider) continue
      litellmKeys[litellmProvider] = key
    }

    for (const [providerID, auth] of Object.entries(auths)) {
      if (providerID === AgencySwarmAdapter.PROVIDER_ID) continue
      if (hasEnvCredential(providerID, providers, env)) continue

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

  function readConfiguredBaseURL(config: Record<string, unknown> | undefined) {
    return asString(config?.["base_url"]) ?? asString(config?.["baseURL"])
  }

  function isCodexAPIBaseURL(value: string) {
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

  function supportsStructuredAttachmentMessages(metadata: AgencySwarmAdapter.AgencyMetadata): boolean {
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
      log.info(
        "keeping Codex OAuth for agency-swarm request because agency metadata only exposes OpenAI-based models",
        {
          agencyModels,
        },
      )
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

  function stripGeneratedCodexOAuth(
    generated: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
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
  function isLocalAgencyURL(baseURL: string) {
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

  export async function resolveAgency(options: RuntimeOptions): Promise<string> {
    if (options.agency) {
      return options.agency
    }

    const discovered = await AgencySwarmAdapter.discover({
      baseURL: options.baseURL,
      token: options.token,
      timeoutMs: options.discoveryTimeoutMs,
    })
    const fallbackAgencyIDs = AgencySwarmAdapter.parseAgencyIDsFromOpenAPI(discovered.rawOpenAPI)
    const availableAgencies =
      discovered.agencies.length > 0 ? discovered.agencies.map((agency) => agency.id) : fallbackAgencyIDs

    if (availableAgencies.length === 1) {
      return availableAgencies[0]
    }

    if (availableAgencies.length === 0) {
      throw new Error(
        [
          "No agencies were discovered from agency-swarm OpenAPI metadata.",
          "Configure provider.options.agency in your config, or run `agentswarm agency use <agency-id>`.",
        ].join(" "),
      )
    }

    throw new Error(
      [
        "Multiple agencies were discovered but no default agency is configured.",
        `Available agencies: ${availableAgencies.join(", ")}.`,
        "Set provider.options.agency or run `agentswarm agency use <agency-id>`.",
      ].join(" "),
    )
  }

  export function normalizeCallerAgent(value: string | undefined): string | null | undefined {
    return normalizeCallerAgentValue(value)
  }

  export function extractFunctionCallOutputs(
    newMessages: unknown[],
  ): ReturnType<typeof extractFunctionCallOutputsFromMessages> {
    return extractFunctionCallOutputsFromMessages(newMessages)
  }

  export async function stream(input: StreamInput): Promise<{ fullStream: AsyncGenerator<any> }> {
    const agency = await resolveAgency(input.options)
    const scope = {
      baseURL: input.options.baseURL,
      agency,
      sessionID: input.sessionID,
    }

    const outgoingMessage = buildOutgoingMessage(input.userMessage)
    const materializedFilePaths: string[] = []
    const cleanupMaterializedFiles = async () => {
      try {
        await cleanupMaterializedFilePaths(materializedFilePaths)
      } catch (error) {
        log.warn("failed to clean up materialized clipboard image files", {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    const mentionedRecipient = findRecipientAgent(input.userMessage)

    const tools = new Map<string, Tool>()
    const callByItem = new Map<string, string>()
    const callByOutput = new Map<number, string>()

    const textBuffer = new Map<string, string>()
    const textOpen = new Set<string>()
    const textIndex = new Map<string, number>()

    const reasoningBuffer = new Map<string, string>()
    const reasoningOpen = new Set<string>()
    const reasoningByItem = new Map<string, Set<string>>()

    let usage: Usage | undefined
    let runID: string | undefined
    let lastTextItemID: string | undefined
    let lastReasoningItemID: string | undefined
    let cancelRequested = false
    let cancelInFlight = false
    let cancelBeforeMetaTimer: ReturnType<typeof setTimeout> | undefined
    let streamAborted = false
    let hadDanglingTool = false
    let replayedAttachmentKeys = new Set<string>()
    const agentUpdatedHandoffAgents = new Set<string>()

    const streamAbort = new AbortController()
    const streamSignal = AbortSignal.any([input.abort, streamAbort.signal])

    const mergeMeta = (meta: AgencySwarmEventMeta, extra?: Record<string, unknown>) => {
      return {
        ...compactMetadata(meta),
        ...(extra ?? {}),
      }
    }

    const textKey = (itemID: string, index?: number) => {
      const value = index ?? textIndex.get(itemID) ?? 0
      return `${itemID}:${value}`
    }

    /** Skip only when the incoming event is a replay of the same `(itemID, index)` that is already closed. Body-only matches would drop legit later messages with a short repeat body like "Done" or "OK". */
    const shouldSkipDuplicateAssistantText = (itemID: string, index: number, text: string) => {
      const key = textKey(itemID, index)
      const current = textBuffer.get(key) || ""
      return current === text && !textOpen.has(key)
    }

    const agentUpdatedHandoffMetadata = (agent: string | undefined) => {
      const handoffAgent = agent ?? input.assistantMessage.agent
      return handoffAgent && agentUpdatedHandoffAgents.has(handoffAgent)
        ? { agency_handoff_event: "agent_updated_stream_event", assistant: handoffAgent }
        : {}
    }

    const isTopLevelHandoffEvent = (meta: AgencySwarmEventMeta) => {
      return isTopLevelAgencyHandoffMetadata(compactMetadata(meta))
    }

    const reasoningKey = (itemID: string, index: number) => `${itemID}:${index}`

    const setUsage = (value: Record<string, unknown> | undefined) => {
      if (!value) return
      const rawInput = asNumber(value["input_tokens"] ?? value["inputTokens"])
      const rawOutput = asNumber(value["output_tokens"] ?? value["outputTokens"])
      const rawTotal = asNumber(value["total_tokens"] ?? value["totalTokens"])
      const details = asRecord(value["output_tokens_details"] ?? value["outputTokensDetails"])
      const inputDetails = asRecord(value["input_tokens_details"] ?? value["inputTokensDetails"])
      const rawReasoning = asNumber(
        details?.["reasoning_tokens"] ?? value["reasoning_tokens"] ?? value["reasoningTokens"],
      )
      const rawCacheRead = asNumber(
        inputDetails?.["cached_tokens"] ?? value["cached_tokens"] ?? value["cachedInputTokens"],
      )
      const rawCacheWrite = asNumber(value["cache_write_input_tokens"] ?? value["cacheWriteInputTokens"])
      const rawCost = asNumber(value["total_cost"] ?? value["totalCost"] ?? value["cost"])

      const inputTokens = rawInput ?? usage?.inputTokens ?? 0
      const outputTokens = rawOutput ?? usage?.outputTokens ?? 0
      const reasoningTokens = rawReasoning ?? usage?.reasoningTokens ?? 0
      const cachedInputTokens = rawCacheRead ?? usage?.cachedInputTokens ?? 0
      const cacheWriteInputTokens = rawCacheWrite ?? usage?.cacheWriteInputTokens ?? 0
      const totalTokens = rawTotal ?? inputTokens + outputTokens

      usage = {
        inputTokens,
        outputTokens,
        totalTokens,
        reasoningTokens,
        cachedInputTokens,
        cacheWriteInputTokens,
        cost: rawCost ?? usage?.cost,
      }
    }

    const ensureTool = (callID: string, toolName: string) => {
      const existing = tools.get(callID)
      if (existing) {
        existing.tool = toolName || existing.tool
        return existing
      }
      const created = {
        callID,
        tool: toolName || "tool",
        raw: "",
        started: false,
        running: false,
        done: false,
      } satisfies Tool
      tools.set(callID, created)
      return created
    }

    const normalizeToolName = (itemType: string, item: Record<string, unknown> | undefined) => {
      if (itemType === "function_call") return asString(item?.["name"]) || "tool"
      if (itemType === "computer_call") return "computer_use"
      return itemType.replace(/_call$/, "")
    }

    const toolRawInput = (itemType: string, item: Record<string, unknown> | undefined) => {
      if (!item) return ""
      if (itemType === "function_call") return asRawString(item["arguments"]) || ""
      if (itemType === "mcp_call") return asRawString(item["arguments"]) || stringifyToolOutput(item["arguments"])
      if (itemType === "code_interpreter_call") {
        return (
          asRawString(item["code"]) || stringifyToolOutput(asRecord(item["input"]) ?? asRecord(item["action"]) ?? {})
        )
      }
      if (itemType === "file_search_call") {
        return stringifyToolOutput({
          queries: Array.isArray(item["queries"]) ? item["queries"] : [],
        })
      }
      if (itemType === "web_search_call") {
        const clean = (value: unknown) => {
          const text = asString(value)
          if (!text) return
          if (text.toLowerCase() === "none") return
          return text
        }
        const action = asRecord(item["action"])
        const query = clean(item["query"]) || clean(action?.["query"])
        const queries = Array.from(
          new Set(
            [
              ...(Array.isArray(item["queries"]) ? item["queries"] : []),
              ...(Array.isArray(action?.["queries"]) ? action["queries"] : []),
              query,
            ]
              .map(clean)
              .filter((value): value is string => !!value),
          ),
        )
        return stringifyToolOutput({
          query,
          queries,
          action: item["action"] ?? null,
        })
      }
      return stringifyToolOutput(asRecord(item["input"]) ?? asRecord(item["action"]) ?? {})
    }

    const toolOutput = (itemType: string, item: Record<string, unknown> | undefined) => {
      if (!item) return ""
      if (item["output"] !== undefined) return stringifyToolOutput(item["output"])
      if (itemType === "file_search_call") return stringifyToolOutput(item["results"] ?? item)
      if (itemType === "mcp_call") return stringifyToolOutput(item["result"] ?? item)
      return stringifyToolOutput(item)
    }

    const isToolOutputItem = (itemType: string) => itemType.endsWith("_output") || isAgencyToolOutputType(itemType)

    const findCallID = (event: Record<string, unknown>, item: Record<string, unknown> | undefined) => {
      const direct = asString(event["call_id"])
      if (direct) return direct

      const itemID = asString(event["item_id"])
      if (itemID && callByItem.has(itemID)) return callByItem.get(itemID)
      if (itemID && tools.has(itemID)) return itemID

      const outputIndex = asNumber(event["output_index"])
      if (outputIndex !== undefined && callByOutput.has(outputIndex)) {
        return callByOutput.get(outputIndex)
      }

      if (item) {
        const fromItemID = asString(item["id"])
        if (fromItemID && callByItem.has(fromItemID)) return callByItem.get(fromItemID)
        if (fromItemID && tools.has(fromItemID)) return fromItemID
        const fromItem = asString(item["call_id"]) || fromItemID
        if (fromItem) return fromItem
      }

      return undefined
    }

    const closeText = (key: string, meta: AgencySwarmEventMeta, extra?: Record<string, unknown>) => {
      if (!textOpen.has(key)) return []
      textOpen.delete(key)
      if (lastTextItemID) {
        const active = textKey(lastTextItemID)
        if (active === key) {
          lastTextItemID = undefined
        }
      }
      return [
        {
          type: "text-end",
          providerMetadata: mergeMeta(meta, extra),
        },
      ]
    }

    const ensureText = (itemID: string, index: number, meta: AgencySwarmEventMeta, extra?: Record<string, unknown>) => {
      const parts: any[] = []
      const key = textKey(itemID, index)
      const activeItemID = lastTextItemID
      const activeIndex = activeItemID ? (textIndex.get(activeItemID) ?? 0) : undefined
      const activeKey = activeItemID !== undefined ? textKey(activeItemID, activeIndex) : undefined
      if (activeKey && activeKey !== key) {
        parts.push(
          ...closeText(activeKey, meta, {
            ...(extra?.["output_index"] !== undefined ? { output_index: extra["output_index"] } : {}),
            ...(extra?.["source"] !== undefined ? { source: extra["source"] } : {}),
            item_id: activeItemID,
            content_index: activeIndex,
          }),
        )
      }
      if (!textOpen.has(key)) {
        textOpen.add(key)
        parts.push({
          type: "text-start",
          providerMetadata: mergeMeta(meta, {
            item_id: itemID,
            content_index: index,
            ...(extra ?? {}),
          }),
        })
      }
      lastTextItemID = itemID
      textIndex.set(itemID, index)
      return parts
    }

    const textDelta = (
      itemID: string,
      index: number,
      delta: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      if (!delta) return []
      const key = textKey(itemID, index)
      const existing = textBuffer.get(key) || ""
      textBuffer.set(key, existing + delta)
      return [
        {
          type: "text-delta",
          text: delta,
          providerMetadata: mergeMeta(meta, {
            item_id: itemID,
            content_index: index,
            ...(extra ?? {}),
          }),
        },
      ]
    }

    const finishText = (
      itemID: string,
      index: number,
      final: string | undefined,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const key = textKey(itemID, index)
      const isOpen = textOpen.has(key)
      const raw = textBuffer.get(key) || ""
      if (!isOpen && final !== undefined && raw && !final.startsWith(raw)) {
        textBuffer.delete(key)
      }
      const current = textBuffer.get(key) || ""
      if (!isOpen && (final === undefined || final === current)) {
        return []
      }
      if (final !== undefined && final === current) {
        return closeText(key, meta, extra)
      }
      const parts = isOpen ? [] : ensureText(itemID, index, meta, extra)
      const suffix = final ? (final.startsWith(current) ? final.slice(current.length) : current ? "" : final) : ""
      if (suffix) {
        parts.push(...textDelta(itemID, index, suffix, meta, extra))
      }
      if (!suffix && final !== undefined && current && !final.startsWith(current) && !textOpen.has(key)) {
        return []
      }
      parts.push(...closeText(key, meta, extra))
      return parts
    }

    const ensureReasoning = (
      itemID: string,
      index: number,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const key = reasoningKey(itemID, index)
      if (reasoningOpen.has(key)) {
        lastReasoningItemID = itemID
        return []
      }
      reasoningOpen.add(key)
      lastReasoningItemID = itemID
      const set = reasoningByItem.get(itemID)
      if (set) {
        set.add(key)
      } else {
        reasoningByItem.set(itemID, new Set([key]))
      }
      return [
        {
          type: "reasoning-start",
          id: key,
          providerMetadata: mergeMeta(meta, {
            item_id: itemID,
            summary_index: index,
            ...(extra ?? {}),
          }),
        },
      ]
    }

    const reasoningDelta = (
      itemID: string,
      index: number,
      delta: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      if (!delta) return []
      const key = reasoningKey(itemID, index)
      const existing = reasoningBuffer.get(key) || ""
      reasoningBuffer.set(key, existing + delta)
      return [
        {
          type: "reasoning-delta",
          id: key,
          text: delta,
          providerMetadata: mergeMeta(meta, {
            item_id: itemID,
            summary_index: index,
            ...(extra ?? {}),
          }),
        },
      ]
    }

    const finishReasoning = (
      itemID: string,
      index: number,
      text: string | undefined,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const key = reasoningKey(itemID, index)
      const isOpen = reasoningOpen.has(key)
      const raw = reasoningBuffer.get(key) || ""
      if (!isOpen && text !== undefined && raw && !text.startsWith(raw)) {
        reasoningBuffer.delete(key)
      }
      const current = reasoningBuffer.get(key) || ""
      if (!isOpen && (text === undefined || text === current)) {
        return []
      }
      const parts = isOpen ? [] : ensureReasoning(itemID, index, meta, extra)
      const suffix = text ? (text.startsWith(current) ? text.slice(current.length) : current ? "" : text) : ""
      if (suffix) {
        parts.push(...reasoningDelta(itemID, index, suffix, meta, extra))
      }
      if (reasoningOpen.has(key)) {
        reasoningOpen.delete(key)
        const set = reasoningByItem.get(itemID)
        if (set) {
          set.delete(key)
          if (set.size === 0) {
            reasoningByItem.delete(itemID)
          }
        }
        parts.push({
          type: "reasoning-end",
          id: key,
          providerMetadata: mergeMeta(meta, {
            item_id: itemID,
            summary_index: index,
            ...(extra ?? {}),
          }),
        })
      }
      return parts
    }

    const ensureToolInput = (
      callID: string,
      toolName: string,
      rawInput: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const parts: any[] = []
      const tool = ensureTool(callID, toolName)
      if (!tool.started) {
        tool.started = true
        parts.push({
          type: "tool-input-start",
          id: callID,
          toolName: tool.tool,
          providerMetadata: mergeMeta(meta, {
            call_id: callID,
            ...(extra ?? {}),
          }),
        })
      }
      if (rawInput) {
        tool.raw = rawInput
        parts.push({
          type: "tool-input-delta",
          id: callID,
          delta: rawInput,
          providerMetadata: mergeMeta(meta, {
            call_id: callID,
            ...(extra ?? {}),
          }),
        })
      }
      return parts
    }

    const appendToolInput = (
      callID: string,
      toolName: string,
      delta: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const parts = ensureToolInput(callID, toolName, "", meta, extra)
      const tool = ensureTool(callID, toolName)
      tool.raw += delta
      if (delta) {
        parts.push({
          type: "tool-input-delta",
          id: callID,
          delta,
          providerMetadata: mergeMeta(meta, {
            call_id: callID,
            ...(extra ?? {}),
          }),
        })
      }
      return parts
    }

    const finalizeToolInput = (
      callID: string,
      toolName: string,
      rawInput: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const parts = ensureToolInput(callID, toolName, "", meta, extra)
      const tool = ensureTool(callID, toolName)
      const current = tool.raw
      const suffix = rawInput.startsWith(current) ? rawInput.slice(current.length) : current ? "" : rawInput
      if (suffix) {
        parts.push(...appendToolInput(callID, toolName, suffix, meta, extra))
      }
      parts.push({
        type: "tool-input-end",
        id: callID,
        providerMetadata: mergeMeta(meta, {
          call_id: callID,
          ...(extra ?? {}),
        }),
      })
      return parts
    }

    const runTool = (callID: string, toolName: string, meta: AgencySwarmEventMeta, extra?: Record<string, unknown>) => {
      const parts = ensureToolInput(callID, toolName, "", meta, extra)
      const tool = ensureTool(callID, toolName)
      if (tool.running || tool.done) {
        return parts
      }
      tool.running = true
      parts.push({
        type: "tool-call",
        toolCallId: callID,
        toolName: tool.tool,
        input: parseToolInput(tool.raw),
        providerMetadata: mergeMeta(meta, {
          call_id: callID,
          ...(extra ?? {}),
        }),
      })
      return parts
    }

    const completeTool = (
      callID: string,
      toolName: string,
      output: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const parts = runTool(callID, toolName, meta, extra)
      const tool = ensureTool(callID, toolName)
      if (tool.done) {
        return parts
      }
      tool.done = true
      parts.push({
        type: "tool-result",
        toolCallId: callID,
        input: parseToolInput(tool.raw),
        output: {
          output,
          title: "",
          metadata: mergeMeta(meta, {
            call_id: callID,
            ...(extra ?? {}),
          }),
        },
      })
      return parts
    }

    const failTool = (
      callID: string,
      toolName: string,
      message: string,
      meta: AgencySwarmEventMeta,
      extra?: Record<string, unknown>,
    ) => {
      const parts = runTool(callID, toolName, meta, extra)
      const tool = ensureTool(callID, toolName)
      if (tool.done) {
        return parts
      }
      tool.done = true
      parts.push({
        type: "tool-error",
        toolCallId: callID,
        input: parseToolInput(tool.raw),
        error: new Error(message),
        providerMetadata: mergeMeta(meta, {
          call_id: callID,
          ...(extra ?? {}),
        }),
      })
      return parts
    }

    const extractMessageText = (message: Record<string, unknown>) => {
      const content = Array.isArray(message["content"]) ? message["content"] : []
      return content
        .map((entry) => {
          const part = asRecord(entry)
          if (!part) return ""
          const type = asString(part["type"])
          if (type === "output_text") return asString(part["text"]) || ""
          if (type === "refusal") return asString(part["refusal"]) || ""
          return ""
        })
        .filter(Boolean)
        .join("\n")
    }

    const toolNameFor = (callID: string) => tools.get(callID)?.tool || "tool"

    const outputMeta = (outputIndex: number | undefined, extra?: Record<string, unknown>) => {
      return {
        output_index: outputIndex,
        ...(extra ?? {}),
      }
    }

    const textItemID = (event: Record<string, unknown>) => asString(event["item_id"]) || lastTextItemID
    const reasoningItemID = (event: Record<string, unknown>) => asString(event["item_id"]) || lastReasoningItemID

    /** Retire closed replay candidates when a new run starts so the dedupe buffer does not grow across runs. */
    const retireClosedReplayCandidates = () => {
      for (const key of Array.from(textBuffer.keys())) {
        if (!textOpen.has(key)) textBuffer.delete(key)
      }
    }

    const handleMessagesPayload = async function* (payload: Record<string, unknown>) {
      const newMessages = Array.isArray(payload["new_messages"]) ? payload["new_messages"] : []
      const historyMessages =
        replayedAttachmentKeys.size > 0
          ? stripReplayedAttachmentsFromMessages(newMessages, replayedAttachmentKeys)
          : newMessages
      await AgencySwarmHistory.appendMessages(scope, historyMessages)
      setUsage(asRecord(payload["usage"]))

      const runFromMessages = asString(payload["run_id"])
      if (runFromMessages) {
        if (runID && runID !== runFromMessages) retireClosedReplayCandidates()
        runID = runFromMessages
        if (cancelBeforeMetaTimer) {
          clearTimeout(cancelBeforeMetaTimer)
          cancelBeforeMetaTimer = undefined
        }
        await AgencySwarmHistory.setLastRunID(scope, runID)
        if (cancelRequested) {
          await sendCancel()
        }
      }

      for (const output of extractFunctionCallOutputsFromMessages(newMessages)) {
        const tool = ensureTool(output.callID, toolNameFor(output.callID))
        yield* completeTool(output.callID, tool.tool, output.output, output.metadata, { item_type: output.itemType })
      }

      for (const raw of newMessages) {
        const message = asRecord(raw)
        if (!message || asString(message["type"]) !== "message") continue
        const messageMeta = extractEventMeta(message)
        if (asString(message["role"]) === "assistant") await applyAssistantLabel(input.assistantMessage, messageMeta)
        const itemID = asString(message["id"])
        if (!itemID) continue
        const text = extractMessageText(message)
        if (!text) continue
        if (shouldSkipDuplicateAssistantText(itemID, 0, text)) continue
        yield* finishText(itemID, 0, text, messageMeta, {
          source: "messages",
          ...agentUpdatedHandoffMetadata(messageMeta.agent),
        })
      }
    }

    const handleOutputItemAdded = (
      item: Record<string, unknown>,
      outputIndex: number | undefined,
      eventMeta: AgencySwarmEventMeta,
    ) => {
      const itemType = asString(item["type"]) || ""
      const itemID = asString(item["id"])

      if (itemID && outputIndex !== undefined) {
        callByOutput.set(outputIndex, itemID)
      }

      if (itemType === "message") {
        if (!itemID) return []
        return ensureText(itemID, 0, eventMeta, outputMeta(outputIndex))
      }

      if (itemType === "reasoning") {
        if (!itemID) return []
        return ensureReasoning(
          itemID,
          0,
          eventMeta,
          outputMeta(outputIndex, { encrypted_content: item["encrypted_content"] ?? null }),
        )
      }

      if (itemType.endsWith("_call")) {
        const callID = asString(item["call_id"]) || itemID
        if (!callID) return []
        const toolName = normalizeToolName(itemType, item)
        const raw = toolRawInput(itemType, item)
        if (itemID) callByItem.set(itemID, callID)
        if (outputIndex !== undefined) callByOutput.set(outputIndex, callID)
        return ensureToolInput(
          callID,
          toolName,
          raw,
          eventMeta,
          outputMeta(outputIndex, {
            item_id: itemID,
            item_type: itemType,
          }),
        )
      }

      if (isToolOutputItem(itemType)) {
        const callID = asString(item["call_id"])
        if (!callID) return []
        const tool = ensureTool(callID, toolNameFor(callID))
        return completeTool(
          callID,
          tool.tool,
          toolOutput(itemType, item),
          eventMeta,
          outputMeta(outputIndex, {
            item_id: itemID,
            item_type: itemType,
          }),
        )
      }

      return []
    }

    const handleOutputItemDone = (
      item: Record<string, unknown>,
      outputIndex: number | undefined,
      eventMeta: AgencySwarmEventMeta,
    ) => {
      const itemType = asString(item["type"]) || ""

      if (itemType === "message") {
        const itemID = asString(item["id"]) || lastTextItemID
        if (!itemID) return []
        return finishText(itemID, textIndex.get(itemID) ?? 0, undefined, eventMeta, outputMeta(outputIndex))
      }

      if (itemType === "reasoning") {
        const itemID = asString(item["id"]) || lastReasoningItemID
        if (!itemID) return []
        return Array.from(reasoningByItem.get(itemID) ?? [])
          .filter((value) => reasoningOpen.has(value))
          .flatMap((key) => {
            const index = Number(key.split(":")[1] || "0")
            return finishReasoning(
              itemID,
              Number.isFinite(index) ? index : 0,
              undefined,
              eventMeta,
              outputMeta(outputIndex, { encrypted_content: item["encrypted_content"] ?? null }),
            )
          })
      }

      if (isToolOutputItem(itemType)) {
        const callID = asString(item["call_id"])
        if (!callID) return []
        const tool = ensureTool(callID, toolNameFor(callID))
        return completeTool(
          callID,
          tool.tool,
          toolOutput(itemType, item),
          eventMeta,
          outputMeta(outputIndex, { item_type: itemType }),
        )
      }

      if (itemType.endsWith("_call")) {
        const callID = asString(item["call_id"]) || asString(item["id"])
        if (!callID) return []
        const itemID = asString(item["id"])
        const toolName = normalizeToolName(itemType, item)
        const metadata = outputMeta(outputIndex, {
          item_type: itemType,
        })
        if (itemID) callByItem.set(itemID, callID)
        if (outputIndex !== undefined) callByOutput.set(outputIndex, callID)
        const rawInput = toolRawInput(itemType, item)
        const knownRaw = tools.get(callID)?.raw ?? ""
        const reconciled =
          rawInput && rawInput !== knownRaw ? ensureToolInput(callID, toolName, rawInput, eventMeta, metadata) : []
        const parts = [...reconciled, ...runTool(callID, toolName, eventMeta, metadata)]
        if (itemType === "function_call") {
          return parts
        }
        return [...parts, ...completeTool(callID, toolName, toolOutput(itemType, item), eventMeta, metadata)]
      }

      return []
    }

    const handleRunItemEvent = (payload: Record<string, unknown>, eventMeta: AgencySwarmEventMeta) => {
      const name = asString(payload["name"])
      const item = asRecord(payload["item"])
      const rawItem = asRecord(item?.["raw_item"])
      if (!name || !rawItem) return []

      const itemType = asString(rawItem["type"]) || ""
      if (name === "tool_called" && itemType.endsWith("_call")) {
        const callID = asString(rawItem["call_id"]) || asString(rawItem["id"])
        if (!callID) return []
        const toolName = normalizeToolName(itemType, rawItem)
        const itemID = asString(rawItem["id"])
        const rawInput = toolRawInput(itemType, rawItem)
        const knownRaw = tools.get(callID)?.raw ?? ""
        if (itemID) callByItem.set(itemID, callID)
        return [
          ...(rawInput && rawInput !== knownRaw
            ? ensureToolInput(callID, toolName, rawInput, eventMeta, {
                item_id: itemID,
                source: "run_item_stream_event",
              })
            : []),
          ...runTool(callID, toolName, eventMeta, {
            item_id: itemID,
            source: "run_item_stream_event",
          }),
        ]
      }

      if (name === "tool_output") {
        const callID = asString(item?.["call_id"]) || asString(rawItem["call_id"]) || findCallID(item ?? {}, rawItem)
        if (!callID) return []
        const tool = ensureTool(callID, toolNameFor(callID))
        const output = item?.["output"] ?? rawItem["output"]
        if (output === undefined) return []
        return completeTool(callID, tool.tool, stringifyToolOutput(output), eventMeta, {
          item_type: itemType || undefined,
          source: "run_item_stream_event",
        })
      }

      if (name === "message_output_created" && itemType === "message") {
        const itemID = asString(rawItem["id"]) || lastTextItemID
        if (!itemID) return []
        const text = extractMessageText(rawItem)
        if (!text) return []
        const index = 0
        if (shouldSkipDuplicateAssistantText(itemID, index, text)) {
          return []
        }
        return finishText(itemID, index, text, eventMeta, { source: "run_item_stream_event" })
      }

      if (name !== "reasoning_item_created" || itemType !== "reasoning") {
        return []
      }

      const itemID = asString(rawItem["id"])
      if (!itemID) return []
      const summary = Array.isArray(rawItem["summary"]) ? rawItem["summary"] : []
      if (summary.length === 0) {
        return [
          ...ensureReasoning(itemID, 0, eventMeta, { source: "run_item_stream_event" }),
          ...finishReasoning(itemID, 0, undefined, eventMeta, { source: "run_item_stream_event" }),
        ]
      }

      return summary.flatMap((raw, index) => {
        const record = asRecord(raw)
        const text = asString(record?.["text"]) || undefined
        return finishReasoning(itemID, index, text, eventMeta, { source: "run_item_stream_event" })
      })
    }

    const flushOpen = () => {
      const parts: any[] = []

      for (const key of Array.from(textOpen.values())) {
        textOpen.delete(key)
        parts.push({ type: "text-end", providerMetadata: {} })
      }

      for (const key of Array.from(reasoningOpen.values())) {
        reasoningOpen.delete(key)
        parts.push({ type: "reasoning-end", id: key, providerMetadata: {} })
      }

      for (const tool of Array.from(tools.values())) {
        if (tool.done) continue
        hadDanglingTool = true
        parts.push(
          ...failTool(
            tool.callID,
            tool.tool,
            cancelRequested || streamAborted ? "Cancelled" : "Tool stream ended before output was received",
            {},
          ),
        )
      }

      return parts
    }

    const sendCancel = async () => {
      if (!runID || cancelInFlight) return
      cancelInFlight = true

      const result = await AgencySwarmAdapter.cancel({
        baseURL: input.options.baseURL,
        agency,
        runID,
        cancelMode: "immediate",
        token: input.options.token,
      }).catch((error) => {
        log.error("cancel request failed", {
          error: error instanceof Error ? error.message : String(error),
        })
        return {
          ok: false,
          status: 0,
          cancelled: false,
          notFound: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies AgencySwarmAdapter.CancelResult
      })

      if (!result.ok && !result.notFound) {
        log.warn("cancel did not complete cleanly", {
          runID,
          status: result.status,
          error: result.error,
        })
      }

      streamAbort.abort(new DOMException("Aborted", "AbortError"))
    }

    const onAbort = () => {
      cancelRequested = true
      if (runID) {
        void sendCancel()
        return
      }
      if (!cancelBeforeMetaTimer) {
        cancelBeforeMetaTimer = setTimeout(() => {
          streamAbort.abort(new DOMException("Aborted", "AbortError"))
        }, CANCEL_BEFORE_META_ABORT_MS)
      }
    }

    if (input.abort.aborted) {
      onAbort()
    } else {
      input.abort.addEventListener("abort", onAbort, { once: true })
    }

    const stream = (async function* () {
      yield { type: "start" }
      yield { type: "start-step" }
      let streamError: Error | undefined
      let compactedHistoryFromMessages: Array<Record<string, unknown>> | undefined
      let compactedHistoryHasFileAttachments = false
      let rebuiltHistoryFromMessages: Array<Record<string, unknown>> | undefined
      let sessionMessages: MessageV2.WithParts[] | undefined

      const history = await AgencySwarmHistory.load(scope)
      const chatHistory = await Session.messages({ sessionID: input.sessionID })
        .then((msgs) => {
          sessionMessages = msgs
          const compacted = compactHistory({ msgs, currentID: input.userMessage.info.id })
          if (compacted) {
            compactedHistoryFromMessages = compacted
            compactedHistoryHasFileAttachments = compactHistoryHasPriorFileParts({
              msgs,
              currentID: input.userMessage.info.id,
            })
            return compacted
          }
          // Forked sessions clone local messages but get a fresh AgencySwarmHistory key, so the bridge
          // would otherwise start with no context. Rebuild from the cloned messages when stored history
          // is empty and prior messages are all agency-swarm.
          if (history.chat_history.length === 0) {
            const rebuilt = buildAgencyHistoryFromMessages({ msgs, currentID: input.userMessage.info.id })
            if (rebuilt && rebuilt.length > 0) {
              rebuiltHistoryFromMessages = rebuilt
              return rebuilt
            }
          }
          return history.chat_history
        })
        .catch((error) => {
          log.warn("unable to rebuild compacted agency history; falling back to stored history", {
            sessionID: input.sessionID,
            error: error instanceof Error ? error.message : String(error),
          })
          return history.chat_history
        })
      const recipientAgent = await resolveRecipientAgent({
        sessionID: input.sessionID,
        baseURL: input.options.baseURL,
        agency,
        token: input.options.token,
        timeoutMs: input.options.discoveryTimeoutMs,
        mentionedRecipient,
        promptRecipient: input.recipientAgent,
        historyRecipient: resolveHandoffRecipientFromHistory(chatHistory),
        configuredRecipient: input.options.recipientAgent,
        configuredRecipientSelectedAt: input.options.recipientAgentSelectedAt,
      })
      const sessionLitellmModel =
        input.sessionModel &&
        buildLitellmModelForClientConfig(input.sessionModel.providerID, input.sessionModel.modelID)
      const clientConfig = await resolveClientConfig(
        input.options.baseURL,
        agency,
        input.options.token,
        input.options.discoveryTimeoutMs,
        input.options.clientConfig,
        input.options.forwardUpstreamCredentials,
        sessionLitellmModel,
      )

      const hasCurrentFileAttachments = hasFileParts(input.userMessage)
      const hasRebuildableFileAttachments =
        history.chat_history.length === 0 &&
        !!rebuiltHistoryFromMessages &&
        !!sessionMessages &&
        hasPriorFileParts(sessionMessages, input.userMessage.info.id)
      const sanitizedChatHistory = sanitizeAgencyHistoryForTransport(chatHistory)
      const replayOnlyOutgoing = replayStoredAttachmentsInOutgoingMessage(outgoingMessage, sanitizedChatHistory)
      const attachmentMessage =
        hasCurrentFileAttachments ||
        hasRebuildableFileAttachments ||
        compactedHistoryHasFileAttachments ||
        messageHasAttachmentContent(replayOnlyOutgoing.message)
      const structuredAttachmentsSupported =
        attachmentMessage &&
        (await supportsStructuredAttachmentMessagesForBackend({
          baseURL: input.options.baseURL,
          agency,
          token: input.options.token,
          timeoutMs: input.options.discoveryTimeoutMs,
        }))
      let effectiveChatHistory = chatHistory
      if (structuredAttachmentsSupported && sessionMessages) {
        if (compactedHistoryFromMessages) {
          const compacted = compactHistory({
            msgs: sessionMessages,
            currentID: input.userMessage.info.id,
            structuredAttachments: true,
          })
          if (compacted) {
            compactedHistoryFromMessages = compacted
            effectiveChatHistory = compacted
          }
        } else if (rebuiltHistoryFromMessages) {
          const rebuilt = buildAgencyHistoryFromMessages({
            msgs: sessionMessages,
            currentID: input.userMessage.info.id,
            structuredAttachments: true,
          })
          if (rebuilt && rebuilt.length > 0) {
            rebuiltHistoryFromMessages = rebuilt
            effectiveChatHistory = rebuilt
          }
        }
      }

      if (rebuiltHistoryFromMessages) {
        await AgencySwarmHistory.appendMessages(scope, rebuiltHistoryFromMessages)
      }
      const transportChatHistory = sanitizeAgencyHistoryForTransport(effectiveChatHistory)
      let requestMessage: AgencyMessageInput = outgoingMessage
      let fileURLs: Record<string, string> | undefined
      if (structuredAttachmentsSupported) {
        const outgoing = replayStoredAttachmentsInOutgoingMessage(
          buildStructuredOutgoingMessage(input.userMessage),
          transportChatHistory,
        )
        requestMessage = outgoing.message
        replayedAttachmentKeys = outgoing.replayedAttachmentKeys
      } else {
        replayedAttachmentKeys = new Set()
        if (hasCurrentFileAttachments) {
          fileURLs = collectFileURLs(input.userMessage, {
            allowLocalFilePaths: isLocalAgencyURL(input.options.baseURL),
            materializedFilePaths,
          })
        }
      }

      try {
        for await (const frame of AgencySwarmAdapter.streamRun({
          baseURL: input.options.baseURL,
          agency,
          message: requestMessage,
          chatHistory: transportChatHistory,
          recipientAgent,
          additionalInstructions: input.options.additionalInstructions,
          userContext: input.options.userContext,
          fileIDs: input.options.fileIDs,
          token: input.options.token,
          fileURLs,
          generateChatName: input.options.generateChatName,
          clientConfig,
          abort: streamSignal,
        })) {
          if (frame.type === "meta") {
            if (runID && runID !== frame.runID) retireClosedReplayCandidates()
            runID = frame.runID
            if (cancelBeforeMetaTimer) {
              clearTimeout(cancelBeforeMetaTimer)
              cancelBeforeMetaTimer = undefined
            }
            await AgencySwarmHistory.setLastRunID(scope, runID)
            if (cancelRequested) {
              await sendCancel()
            }
            continue
          }

          if (frame.type === "messages") {
            yield* handleMessagesPayload(frame.payload)
            continue
          }

          if (frame.type === "error") {
            streamError = new Error(frame.error)
            break
          }

          if (frame.type === "end") {
            break
          }

          if (frame.type !== "data") {
            continue
          }

          const eventMeta = extractEventMeta(frame.payload)
          await applyAssistantLabel(input.assistantMessage, eventMeta)

          const kind = asString(frame.payload["type"])
          if (kind === "error") {
            const content = asString(frame.payload["content"]) ?? ""
            streamError = new Error(content || "Agency Swarm backend returned an error without a message")
            break
          }
          if (kind === "agent_updated_stream_event") {
            const next = asRecord(frame.payload["new_agent"])
            const maybeName = next
              ? (asString(next["id"]) ?? asString(next["name"]) ?? asString(next["label"]))
              : undefined
            if (maybeName && isTopLevelHandoffEvent(eventMeta)) {
              agentUpdatedHandoffAgents.add(maybeName)
              input.assistantMessage.agent = maybeName
              input.assistantMessage.mode = maybeName
              await Session.updateMessage(input.assistantMessage)
              await AgencySwarmHistory.appendMessages(scope, [
                {
                  type: "handoff_output_item",
                  output: {
                    assistant: maybeName,
                  },
                },
                {
                  type: "message",
                  role: "assistant",
                  agent: maybeName,
                },
              ])
            }
            continue
          }

          if (kind === "raw_response_event") {
            const nested = asRecord(frame.payload["data"])
            if (!nested) continue
            const responseType = asString(nested["type"])
            const outputIndex = asNumber(nested["output_index"])
            const item = asRecord(nested["item"])

            if (!responseType) {
              continue
            }

            if (
              responseType === "response.created" ||
              responseType === "response.in_progress" ||
              responseType === "response.completed" ||
              responseType === "response.incomplete"
            ) {
              setUsage(asRecord(asRecord(nested["response"])?.["usage"]))
              continue
            }

            if (responseType === "response.output_item.added" && item) {
              yield* handleOutputItemAdded(item, outputIndex, eventMeta)
              continue
            }

            if (responseType === "response.output_item.done" && item) {
              yield* handleOutputItemDone(item, outputIndex, eventMeta)
              continue
            }

            if (responseType === "response.content_part.added") {
              const itemID = textItemID(nested)
              if (!itemID) continue
              const part = asRecord(nested["part"])
              const partType = asString(part?.["type"]) || ""
              if (partType === "output_text" || partType === "refusal") {
                const contentIndex = asNumber(nested["content_index"]) ?? 0
                yield* ensureText(
                  itemID,
                  contentIndex,
                  eventMeta,
                  outputMeta(outputIndex, { content_index: contentIndex, content_type: partType }),
                )
              }
              continue
            }

            if (responseType === "response.output_text.delta" || responseType === "response.refusal.delta") {
              const delta = asRawString(nested["delta"])
              if (delta === undefined) continue
              const itemID = textItemID(nested)
              if (!itemID) continue
              const contentIndex = asNumber(nested["content_index"]) ?? textIndex.get(itemID) ?? 0
              const textMeta = outputMeta(outputIndex, { content_index: contentIndex })
              yield* ensureText(itemID, contentIndex, eventMeta, textMeta)
              yield* textDelta(itemID, contentIndex, delta, eventMeta, textMeta)
              continue
            }

            if (responseType === "response.output_text.done" || responseType === "response.content_part.done") {
              const itemID = textItemID(nested)
              if (!itemID) continue
              const contentIndex = asNumber(nested["content_index"]) ?? textIndex.get(itemID) ?? 0
              const part = asRecord(nested["part"])
              const final =
                asRawString(nested["text"]) ??
                asRawString(part?.["text"]) ??
                asRawString(part?.["refusal"]) ??
                asRawString(nested["delta"])
              yield* finishText(
                itemID,
                contentIndex,
                final,
                eventMeta,
                outputMeta(outputIndex, {
                  content_index: contentIndex,
                  ...agentUpdatedHandoffMetadata(eventMeta.agent),
                }),
              )
              continue
            }

            if (responseType === "response.reasoning_summary_part.added") {
              const itemID = reasoningItemID(nested)
              if (!itemID) continue
              const summaryIndex = asNumber(nested["summary_index"]) ?? 0
              yield* ensureReasoning(itemID, summaryIndex, eventMeta, outputMeta(outputIndex))
              continue
            }

            if (
              responseType === "response.reasoning_summary_text.delta" ||
              responseType === "response.reasoning_text.delta"
            ) {
              const itemID = reasoningItemID(nested)
              if (!itemID) continue
              const summaryIndex = asNumber(nested["summary_index"] ?? nested["content_index"]) ?? 0
              const delta = asRawString(nested["delta"])
              if (delta === undefined) continue
              yield* ensureReasoning(itemID, summaryIndex, eventMeta, outputMeta(outputIndex))
              yield* reasoningDelta(itemID, summaryIndex, delta, eventMeta, outputMeta(outputIndex))
              continue
            }

            if (
              responseType === "response.reasoning_summary_text.done" ||
              responseType === "response.reasoning_text.done" ||
              responseType === "response.reasoning_summary_part.done"
            ) {
              const itemID = reasoningItemID(nested)
              if (!itemID) continue
              const summaryIndex = asNumber(nested["summary_index"] ?? nested["content_index"]) ?? 0
              const part = asRecord(nested["part"])
              const text = asRawString(nested["text"])
              const final = text ?? asRawString(part?.["text"])
              yield* finishReasoning(itemID, summaryIndex, final, eventMeta, outputMeta(outputIndex))
              continue
            }

            if (
              responseType === "response.function_call_arguments.delta" ||
              responseType === "response.mcp_call_arguments.delta" ||
              responseType === "response.code_interpreter_call_code.delta"
            ) {
              const callID = findCallID(nested, item)
              if (!callID) continue
              const delta = asRawString(nested["delta"]) ?? ""
              const toolName =
                responseType === "response.code_interpreter_call_code.delta"
                  ? "code_interpreter"
                  : asString(nested["name"]) || toolNameFor(callID)
              yield* appendToolInput(callID, toolName, delta, eventMeta, {
                item_id: asString(nested["item_id"]),
                output_index: outputIndex,
              })
              continue
            }

            if (
              responseType === "response.function_call_arguments.done" ||
              responseType === "response.mcp_call_arguments.done" ||
              responseType === "response.code_interpreter_call_code.done"
            ) {
              const callID = findCallID(nested, item)
              if (!callID) continue
              const toolName =
                responseType === "response.code_interpreter_call_code.done"
                  ? "code_interpreter"
                  : asString(nested["name"]) || toolNameFor(callID)
              const raw =
                asRawString(nested["arguments"]) ?? asRawString(nested["code"]) ?? tools.get(callID)?.raw ?? ""
              yield* finalizeToolInput(callID, toolName, raw, eventMeta, {
                item_id: asString(nested["item_id"]),
                output_index: outputIndex,
              })
              continue
            }

            const callMatch = /^response\.([a-z_]+_call)\.(in_progress|searching|running|completed|failed)$/.exec(
              responseType,
            )
            if (callMatch) {
              const itemType = callMatch[1]
              const phase = callMatch[2]
              const callID = findCallID(nested, item) || asString(nested["item_id"])
              if (!callID) continue
              const toolName = normalizeToolName(itemType, item)
              const itemID = asString(nested["item_id"]) || asString(item?.["id"])
              if (itemID) callByItem.set(itemID, callID)
              if (outputIndex !== undefined) callByOutput.set(outputIndex, callID)

              if (phase === "in_progress" || phase === "searching" || phase === "running") {
                yield* runTool(callID, toolName, eventMeta, {
                  item_id: itemID,
                  output_index: outputIndex,
                  item_type: itemType,
                  phase,
                })
                continue
              }

              if (phase === "completed") {
                // Keep completion sourced from output_item.done/messages/tool_output.
                // completed phase events can precede final payload and should not finalize output.
                yield* runTool(callID, toolName, eventMeta, {
                  item_id: itemID,
                  output_index: outputIndex,
                  item_type: itemType,
                  phase,
                })
                continue
              }

              const message = asString(nested["error"]) || asString(nested["message"]) || `${toolName} failed`
              yield* failTool(callID, toolName, message, eventMeta, {
                item_id: itemID,
                output_index: outputIndex,
                item_type: itemType,
                phase,
              })
              continue
            }

            if (responseType === "error") {
              const message = asString(nested["message"]) || asString(nested["error"]) || "Unknown stream error"
              streamError = new Error(message)
              break
            }

            continue
          }

          if (kind === "run_item_stream_event") {
            yield* handleRunItemEvent(frame.payload, eventMeta)
            continue
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          streamAborted = true
        } else {
          streamError = error instanceof Error ? error : new Error(String(error))
        }
      } finally {
        if (cancelBeforeMetaTimer) {
          clearTimeout(cancelBeforeMetaTimer)
        }
        input.abort.removeEventListener("abort", onAbort)
      }

      yield* flushOpen()

      if (!streamError && hadDanglingTool && !streamAborted && !cancelRequested) {
        streamError = new Error("Tool stream ended before output was received")
      }

      if (streamError) {
        yield {
          type: "error",
          error: streamError,
        }
        return
      }

      const finalUsage = usage ?? {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
      }
      const cost = finalUsage.cost ?? 0

      yield {
        type: "finish-step",
        finishReason: cancelRequested || streamAborted ? "cancelled" : "stop",
        usage: {
          inputTokens: finalUsage.inputTokens,
          outputTokens: finalUsage.outputTokens,
          totalTokens: finalUsage.totalTokens,
          reasoningTokens: finalUsage.reasoningTokens,
          cachedInputTokens: finalUsage.cachedInputTokens,
        },
        providerMetadata: {
          agency_swarm: {
            cacheWriteInputTokens: finalUsage.cacheWriteInputTokens,
            totalCost: cost,
          },
        },
      }

      yield {
        type: "finish",
      }
    })()

    const fullStream = (async function* () {
      try {
        yield* stream
      } finally {
        await cleanupMaterializedFiles()
      }
    })()

    return {
      fullStream,
    }
  }

  async function supportsStructuredAttachmentMessagesForBackend(input: {
    baseURL: string
    agency: string
    token?: string
    timeoutMs: number
  }) {
    try {
      const metadata = await AgencySwarmAdapter.getMetadata(input)
      return supportsStructuredAttachmentMessages(metadata)
    } catch (error) {
      log.warn("unable to load agency metadata; using legacy attachment transport", {
        baseURL: input.baseURL,
        agency: input.agency,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  async function applyAssistantLabel(message: MessageV2.Assistant, metadata: AgencySwarmEventMeta) {
    if (!metadata.agent) return
    if (metadata.agent === message.agent) return
    message.agent = metadata.agent
    message.mode = metadata.agent
    await Session.updateMessage(message)
  }

  function asBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined
  }

  async function resolveRecipientAgent(input: {
    sessionID: SessionID
    baseURL: string
    agency: string
    token?: string
    timeoutMs: number
    mentionedRecipient?: string
    promptRecipient?: string
    historyRecipient?: string
    configuredRecipient?: string
    configuredRecipientSelectedAt?: number
  }): Promise<string | undefined> {
    const sessionRecipient = await resolveSessionRecipient(input.sessionID)
    if (
      !input.configuredRecipient &&
      input.configuredRecipientSelectedAt &&
      input.configuredRecipientSelectedAt > (sessionRecipient?.messageAt ?? 0)
    ) {
      return undefined
    }
    type RecipientCandidate = {
      value: {
        agent: string
        messageAt?: number
      }
      source: "message" | "prompt" | "history" | "config" | "session"
    }
    const candidates = [
      input.mentionedRecipient ? { value: { agent: input.mentionedRecipient }, source: "message" } : undefined,
      input.promptRecipient ? { value: { agent: input.promptRecipient }, source: "prompt" } : undefined,
      sessionRecipient ? { value: sessionRecipient, source: "session" } : undefined,
      input.historyRecipient ? { value: { agent: input.historyRecipient }, source: "history" } : undefined,
      input.configuredRecipient ? { value: { agent: input.configuredRecipient }, source: "config" } : undefined,
    ]
      .filter((candidate): candidate is RecipientCandidate => !!candidate?.value.agent)
      .sort((a, b) => candidateRank(a) - candidateRank(b))
      .filter(
        (candidate, index, array) => array.findIndex((item) => item.value.agent === candidate.value.agent) === index,
      )
    const candidateValues = candidates.map((candidate) => candidate.value.agent)
    if (candidateValues.length === 0) {
      return undefined
    }

    let metadata: AgencySwarmAdapter.AgencyMetadata
    try {
      metadata = await AgencySwarmAdapter.getMetadata({
        baseURL: input.baseURL,
        agency: input.agency,
        token: input.token,
        timeoutMs: input.timeoutMs,
      })
    } catch (error) {
      log.warn("unable to refresh agency metadata; skipping recipient override", {
        sessionID: input.sessionID,
        agency: input.agency,
        candidates: candidateValues,
        error: error instanceof Error ? error.message : String(error),
      })
      return undefined
    }

    const recipientMap = extractRecipientMap(metadata)
    if (recipientMap.size === 0) {
      log.warn("agency metadata has no recipient agents; skipping recipient override", {
        sessionID: input.sessionID,
        agency: input.agency,
        candidates: candidateValues,
      })
      return undefined
    }

    const availableAgents = Array.from(new Set(recipientMap.values()))
    for (const candidate of candidates) {
      const resolved = recipientMap.get(candidate.value.agent)
      if (resolved) return resolved
      log.warn("ignoring stale recipient agent candidate", {
        sessionID: input.sessionID,
        agency: input.agency,
        candidate: candidate.value.agent,
        source: candidate.source,
        availableAgents,
      })
    }

    return undefined

    function candidateRank(candidate: RecipientCandidate) {
      if (candidate.source === "message") return 0
      if (candidate.source === "prompt") return 1
      if (candidate.source === "config" && input.configuredRecipientSelectedAt) {
        if (sessionRecipient?.completedAt && input.configuredRecipientSelectedAt > sessionRecipient.completedAt)
          return 2
      }
      if (candidate.source === "session" || candidate.source === "history") return 3
      return 4
    }
  }

  async function resolveSessionRecipient(sessionID: SessionID) {
    try {
      const messages = await Session.messages({ sessionID })
      const last = messages.findLast((item) => {
        if (item.info.role !== "assistant") return false
        if (item.info.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
        if (item.info.summary) return false
        if (!hasAgencyHandoffEvidence(item.parts)) return false
        return !!(resolveHandoffRecipientFromParts(item.parts) ?? item.info.agent)
      })
      if (!last) return
      if (last.info.role !== "assistant") return
      return {
        agent: resolveHandoffRecipientFromParts(last.parts) ?? last.info.agent,
        messageAt: last.info.time.completed ?? last.info.time.created,
        completedAt: last.info.time.completed,
      }
    } catch (error) {
      log.warn("unable to load session recipient; skipping recipient override", {
        sessionID,
        error: error instanceof Error ? error.message : String(error),
      })
      return undefined
    }
  }

  function resolveHandoffRecipientFromParts(parts: MessageV2.Part[]) {
    for (const part of parts.toReversed()) {
      const partMetadata = asRecord("metadata" in part ? part.metadata : undefined)
      const metadataAgent = isTopLevelAgencyHandoffMetadata(partMetadata)
        ? readAgentUpdatedHandoffMetadataAgent(partMetadata)
        : undefined
      if (metadataAgent) return metadataAgent
      if (part.type !== "tool") continue
      const stateMetadata = asRecord("metadata" in part.state ? part.state.metadata : undefined)
      const outputAgent =
        isTopLevelAgencyHandoffMetadata(partMetadata) &&
        isTopLevelAgencyHandoffMetadata(stateMetadata) &&
        part.state.status === "completed"
          ? (readHandoffOutputAgent(part.state.output) ?? readHandoffMetadataAgent(stateMetadata))
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

  function readHandoffOutputAgent(output: unknown) {
    if (!output) return undefined
    if (typeof output !== "string") {
      const parsed = asRecord(output)
      if (!parsed) return undefined
      return asString(parsed["assistant"] ?? parsed["agent"] ?? parsed["recipientAgent"] ?? parsed["recipient_agent"])
    }
    try {
      const parsed = JSON.parse(output)
      if (!parsed || typeof parsed !== "object") return undefined
      return asString(
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
    return asString(
      metadata["assistant"] ?? metadata["agent"] ?? metadata["recipientAgent"] ?? metadata["recipient_agent"],
    )
  }

  function readAgentUpdatedHandoffMetadataAgent(metadata: Record<string, unknown> | undefined) {
    if (!isAgencyAgentUpdatedHandoffMetadata(metadata)) return undefined
    return readHandoffMetadataAgent(metadata)
  }

  function resolveHandoffRecipientFromHistory(history: Array<Record<string, unknown>>) {
    for (let index = history.length - 1; index >= 0; index--) {
      const item = history[index]
      const type = asString(item["type"])
      if (type === "handoff_output_item") {
        const metadata = asRecord(item["metadata"])
        if (!isTopLevelAgencyHandoffMetadata(item) || !isTopLevelAgencyHandoffMetadata(metadata)) continue
        const outputAgent = readHandoffOutputAgent(item["output"])
        if (outputAgent) return outputAgent

        for (let nextIndex = index + 1; nextIndex < history.length; nextIndex++) {
          const message = history[nextIndex]
          if (asString(message["type"]) !== "message") continue
          if (asString(message["role"]) !== "assistant") continue
          const agent = asString(message["agent"])
          if (agent) return agent
        }
      }
    }
    return undefined
  }

  export function compactHistory(input: {
    msgs: MessageV2.WithParts[]
    currentID: string
    structuredAttachments?: boolean
  }): Array<Record<string, unknown>> | undefined {
    const slice = compactHistoryMessages(input)
    if (!slice) return

    return slice.flatMap((msg) => messageToHistoryItem(msg, input.currentID, !!input.structuredAttachments))
  }

  function compactHistoryHasPriorFileParts(input: { msgs: MessageV2.WithParts[]; currentID: string }) {
    const slice = compactHistoryMessages(input)
    return !!slice?.some((msg) => msg.info.id !== input.currentID && hasFileParts(msg))
  }

  function compactHistoryMessages(input: {
    msgs: MessageV2.WithParts[]
    currentID: string
  }): MessageV2.WithParts[] | undefined {
    let start = -1
    for (let i = input.msgs.length - 1; i >= 0; i--) {
      const msg = input.msgs[i]
      if (msg.info.role !== "assistant") continue
      if (!msg.info.summary || !msg.info.finish || msg.info.error) continue
      const parentID = msg.info.parentID
      const parent = input.msgs.find((item) => item.info.id === parentID)
      if (!parent || parent.info.role !== "user") continue
      if (!parent.parts.some((part) => part.type === "compaction")) continue
      start = i
      break
    }

    if (start < 0) return
    const slice = input.msgs.slice(start < 0 ? 0 : start)
    if (slice.some((msg) => msg.info.id !== input.currentID && !isAgencySwarmMessage(msg))) return
    return slice
  }

  /**
   * Rebuild bridge chat_history from local session messages. Used as a fallback when
   * `AgencySwarmHistory` has no entry for the session (e.g. a forked session whose new sessionID
   * never streamed before). Returns undefined when the prior messages are not all agency-swarm,
   * to avoid sending mismatched-shape items into the bridge.
   */
  export function buildAgencyHistoryFromMessages(input: {
    msgs: MessageV2.WithParts[]
    currentID: string
    structuredAttachments?: boolean
  }): Array<Record<string, unknown>> | undefined {
    if (input.msgs.length <= 1) return undefined
    if (input.msgs.some((msg) => msg.info.id !== input.currentID && !isAgencySwarmMessage(msg))) return undefined
    return input.msgs.flatMap((msg) => messageToHistoryItem(msg, input.currentID, !!input.structuredAttachments))
  }

  function messageToHistoryItem(
    msg: MessageV2.WithParts,
    currentID: string,
    structuredAttachments = false,
  ): Array<Record<string, unknown>> {
    if (msg.info.id === currentID) return []

    if (msg.info.role === "user") {
      const content = userMessageHistoryContent(msg, structuredAttachments)
      if (content.length === 0) return []
      return [
        {
          type: "message",
          role: "user",
          content,
          agent: msg.info.agent,
          callerAgent: null,
          timestamp: msg.info.time.created,
        },
      ]
    }

    const text = msg.parts
      .filter((part): part is MessageV2.TextPart => part.type === "text")
      .filter((part) => !part.ignored)
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n\n")
    if (!text) return []
    return [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        agent: msg.info.agent,
        callerAgent: extractCallerAgent(msg),
        timestamp: msg.info.time.created,
      },
    ]
  }

  function userMessageHistoryContent(
    msg: MessageV2.WithParts,
    structuredAttachments: boolean,
  ): Array<Record<string, unknown>> {
    const text = buildOutgoingMessage(msg)

    if (structuredAttachments) {
      const structuredMessage =
        text && hasLocalFileParts(msg) && hasSyntheticTextParts(msg)
          ? {
              ...msg,
              parts: msg.parts.filter((part) => !isExpandedLocalReplayFile(part)),
            }
          : msg
      let structured: AgencyMessageInput | undefined
      try {
        structured = buildStructuredOutgoingMessage(structuredMessage)
      } catch (error) {
        if (structuredMessage === msg) throw error
      }
      if (Array.isArray(structured)) {
        const user = structured.find((item) => asString(item["role"]) === "user")
        const content = user?.["content"]
        if (Array.isArray(content)) {
          const result: Array<Record<string, unknown>> = []
          for (const item of content) {
            const record = asRecord(item)
            if (record) result.push(record)
          }
          return result
        }
      }
    }

    return text ? [{ type: "input_text", text }] : []
  }

  function isExpandedLocalReplayFile(part: MessageV2.Part) {
    if (part.type !== "file") return false
    if (!part.url.startsWith("file://")) return false
    return part.mime === "application/x-directory" || part.mime === "text/plain"
  }

  function hasLocalFileParts(msg: MessageV2.WithParts) {
    return msg.parts.some((part) => part.type === "file" && part.url.startsWith("file://"))
  }

  function hasSyntheticTextParts(msg: MessageV2.WithParts) {
    return msg.parts.some((part) => part.type === "text" && part.synthetic)
  }

  function hasFileParts(msg: MessageV2.WithParts) {
    return msg.parts.some((part) => part.type === "file")
  }

  function hasPriorFileParts(msgs: MessageV2.WithParts[], currentID: string) {
    return msgs.some((msg) => msg.info.id !== currentID && hasFileParts(msg))
  }

  function sanitizeAgencyHistoryForTransport(history: Array<Record<string, unknown>>) {
    return history.flatMap((item) => {
      const type = asString(item["type"])
      if (type === "handoff_output_item" || type === "item_reference") return []
      if (
        type === "message" &&
        asString(item["role"]) === "assistant" &&
        !hasReplayableMessageContent(item["content"])
      ) {
        return []
      }
      return [stripOpenAIResponseItemID(item)]
    })
  }

  function replayStoredAttachmentsInOutgoingMessage(
    message: AgencyMessageInput,
    history: Array<Record<string, unknown>>,
  ): { message: AgencyMessageInput; replayedAttachmentKeys: Set<string> } {
    const replayedAttachments = collectReplayableAttachmentContent(history)
    if (replayedAttachments.length === 0) {
      return {
        message,
        replayedAttachmentKeys: new Set(),
      }
    }

    const existingAttachmentKeys = collectMessageAttachmentKeys(message)
    const attachments = replayedAttachments.filter((part) => !existingAttachmentKeys.has(replayableAttachmentKey(part)))
    const replayedAttachmentKeys = new Set(attachments.map((part) => replayableAttachmentKey(part)))
    if (attachments.length === 0) {
      return {
        message,
        replayedAttachmentKeys: new Set(),
      }
    }

    if (Array.isArray(message)) {
      const index = message.findIndex((item) => asString(item["role"]) === "user")
      if (index < 0) {
        return {
          message,
          replayedAttachmentKeys: new Set(),
        }
      }
      const next = message.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const content = Array.isArray(item["content"]) ? item["content"] : []
        return {
          ...item,
          content: [...attachments, ...content],
        }
      })
      return {
        message: next,
        replayedAttachmentKeys,
      }
    }

    const text = message.trim()
    const content = [...attachments]
    if (text) content.push({ type: "input_text", text })
    return {
      message: [
        {
          role: "user",
          content,
        },
      ],
      replayedAttachmentKeys,
    }
  }

  function collectReplayableAttachmentContent(history: Array<Record<string, unknown>>) {
    const result: Array<Record<string, unknown>> = []
    const seen = new Set<string>()
    for (const item of history) {
      if (asString(item["type"]) !== "message" || asString(item["role"]) !== "user") continue
      const content = item["content"]
      if (!Array.isArray(content)) continue
      for (const rawPart of content) {
        const part = asRecord(rawPart)
        if (!part || !isReplayableAttachmentPart(part)) continue
        const key = replayableAttachmentKey(part)
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ ...part })
      }
    }
    return result
  }

  function stripReplayedAttachmentsFromMessages(messages: unknown[], replayedKeys: Set<string>) {
    return messages.map((raw) => {
      const message = asRecord(raw)
      if (!message || asString(message["type"]) !== "message" || asString(message["role"]) !== "user") return raw
      const content = message["content"]
      if (!Array.isArray(content)) return raw
      const stripped = content.filter((rawPart) => {
        const part = asRecord(rawPart)
        return !part || !isReplayableAttachmentPart(part) || !replayedKeys.has(replayableAttachmentKey(part))
      })
      if (stripped.length === content.length) return raw
      return {
        ...message,
        content: stripped,
      }
    })
  }

  function messageHasAttachmentContent(message: AgencyMessageInput) {
    return collectMessageAttachmentKeys(message).size > 0
  }

  function collectMessageAttachmentKeys(message: AgencyMessageInput) {
    const keys = new Set<string>()
    if (!Array.isArray(message)) return keys
    for (const item of message) {
      const content = item["content"]
      if (!Array.isArray(content)) continue
      for (const rawPart of content) {
        const part = asRecord(rawPart)
        if (!part || !isReplayableAttachmentPart(part)) continue
        keys.add(replayableAttachmentKey(part))
      }
    }
    return keys
  }

  function isReplayableAttachmentPart(part: Record<string, unknown> | undefined) {
    const type = asString(part?.["type"])
    if (type === "input_image") return !!asString(part?.["image_url"])
    if (type !== "input_file") return false
    return !!(asString(part?.["file_data"]) || asString(part?.["file_url"]) || asString(part?.["file_id"]))
  }

  function replayableAttachmentKey(part: Record<string, unknown>) {
    return JSON.stringify({
      type: asString(part["type"]),
      file_data: asString(part["file_data"]),
      file_url: asString(part["file_url"]),
      file_id: asString(part["file_id"]),
      image_url: asString(part["image_url"]),
      filename: asString(part["filename"]),
    })
  }

  function stripOpenAIResponseItemID(item: Record<string, unknown>) {
    if (!Object.prototype.hasOwnProperty.call(item, "id")) return item
    const result = { ...item }
    delete result["id"]
    return result
  }

  function hasReplayableMessageContent(content: unknown) {
    if (Array.isArray(content)) return content.length > 0
    if (typeof content === "string") return content.length > 0
    return content !== undefined && content !== null
  }

  function extractCallerAgent(msg: MessageV2.WithParts): string | null {
    for (let i = msg.parts.length - 1; i >= 0; i--) {
      const part = msg.parts[i]
      if (part.type !== "text" && part.type !== "reasoning") continue
      const metadata = asRecord(part.metadata)
      if (!metadata || !Object.prototype.hasOwnProperty.call(metadata, "callerAgent")) continue
      if (metadata["callerAgent"] === null) return null
      return normalizeCallerAgentValue(asString(metadata["callerAgent"])) ?? null
    }
    return null
  }

  function isAgencySwarmMessage(msg: MessageV2.WithParts) {
    if (msg.info.role === "assistant") {
      return msg.info.providerID === AgencySwarmAdapter.PROVIDER_ID
    }
    return msg.info.model.providerID === AgencySwarmAdapter.PROVIDER_ID
  }

  function extractRecipientMap(metadata: AgencySwarmAdapter.AgencyMetadata): Map<string, string> {
    const result = new Map<string, string>()
    const metadataRecord = asRecord(metadata["metadata"])
    for (const id of asStringArray(metadataRecord?.["agents"])) {
      result.set(id, id)
    }

    const nodes = Array.isArray(metadata["nodes"]) ? metadata["nodes"] : []
    for (const rawNode of nodes) {
      const node = asRecord(rawNode)
      if (!node) continue
      const id = asString(node["id"])
      if (!id) continue
      const nodeType = asString(node["type"])
      const data = asRecord(node["data"])
      if (nodeType === "agent") {
        result.set(id, id)
        const label = asString(data?.["label"])
        if (label) result.set(label, id)
      }
    }

    return result
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

  function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      const parsed = asString(item)
      return parsed ? [parsed] : []
    })
  }

  function asNumber(value: unknown): number | undefined {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined
    }
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
    return undefined
  }
}
