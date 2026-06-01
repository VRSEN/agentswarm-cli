import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencySwarmHistory } from "@/agency-swarm/history"
import { buildLitellmModelForClientConfig } from "@/agency-swarm/litellm-provider"
import { Provider } from "@/provider/provider"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionID } from "@/session/schema"
import { Log } from "@/util"
import {
  isLocalAgencyURL,
  resolveClientConfig,
  supportsStructuredAttachmentMessages,
} from "./agency-swarm-client-config"
import {
  buildAgencyHistoryFromMessages as buildAgencyHistoryFromMessagesForTransport,
  compactHistory as compactHistoryForTransport,
  compactHistoryHasPriorFileParts,
  hasErroredPriorAgencyAssistant,
  hasFileParts,
  hasPriorFileParts,
  historyMissingLocalUserMessages,
  isCodexClientConfig,
  messageHasAttachmentContent,
  normalizeAgencyHistoryForStorage,
  replayStoredAttachmentsInOutgoingMessage,
  sanitizeAgencyHistoryForTransport,
  stripReplayedAttachmentsFromMessages,
} from "./agency-swarm-history-transport"
import { createAgencySwarmStreamEvents } from "./agency-swarm-stream-events"
import {
  asRecord,
  asString,
  buildOutgoingMessage,
  buildStructuredOutgoingMessage,
  cleanupMaterializedFilePaths,
  collectFileURLs,
  extractEventMeta,
  extractFunctionCallOutputs as extractFunctionCallOutputsFromMessages,
  findRecipientAgent,
  hasAgencyHandoffEvidence,
  isAgencyAgentUpdatedHandoffMetadata,
  isTopLevelAgencyHandoffMetadata,
  normalizeCallerAgent as normalizeCallerAgentValue,
  type AgencyMessageInput,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"

export namespace SessionAgencySwarm {
  const log = Log.create({ service: "session.agency-swarm" })
  export const PROVIDER_ID = AgencySwarmAdapter.PROVIDER_ID

  const CANCEL_BEFORE_META_ABORT_MS = 3000
  const CANCEL_FINALIZE_TIMEOUT_MS = 3000

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
    sessionModel?: { providerID: string; modelID: string; variantOptions?: Record<string, unknown> }
    recipientAgent?: string
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

  export function compactHistory(input: {
    msgs: MessageV2.WithParts[]
    currentID: string
    structuredAttachments?: boolean
  }): Array<Record<string, unknown>> | undefined {
    return compactHistoryForTransport(input)
  }

  export function buildAgencyHistoryFromMessages(input: {
    msgs: MessageV2.WithParts[]
    currentID: string
    structuredAttachments?: boolean
  }): Array<Record<string, unknown>> | undefined {
    return buildAgencyHistoryFromMessagesForTransport(input)
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

    let runID: string | undefined
    let cancelRequested = false
    let cancelInFlight = false
    let cancelPromise: Promise<AgencySwarmAdapter.CancelResult | undefined> | undefined
    let cancelBeforeMetaTimer: ReturnType<typeof setTimeout> | undefined
    let streamAborted = false
    let replayedAttachmentKeys = new Set<string>()

    const streamAbort = new AbortController()
    const streamSignal = AbortSignal.any([input.abort, streamAbort.signal])

    const abortStreamForCancel = () => {
      if (!streamAbort.signal.aborted) {
        streamAbort.abort(new DOMException("Aborted", "AbortError"))
      }
    }

    const persistHistoryMessages = async (newMessages: unknown[]) => {
      const historyMessages =
        replayedAttachmentKeys.size > 0
          ? stripReplayedAttachmentsFromMessages(newMessages, replayedAttachmentKeys)
          : newMessages
      await AgencySwarmHistory.appendMessages(scope, normalizeAgencyHistoryForStorage(historyMessages))
    }

    const events = createAgencySwarmStreamEvents({
      assistantMessage: input.assistantMessage,
      isCancelled: () => cancelRequested,
      isAborted: () => streamAborted,
      handleRunID,
      persistMessages: persistHistoryMessages,
      applyAssistantLabel: (metadata) => applyAssistantLabel(input.assistantMessage, metadata),
    })

    async function handleRunID(nextRunID: string) {
      if (runID && runID !== nextRunID) events.retireClosedReplayCandidates()
      runID = nextRunID
      if (cancelBeforeMetaTimer) {
        clearTimeout(cancelBeforeMetaTimer)
        cancelBeforeMetaTimer = undefined
      }
      await AgencySwarmHistory.setLastRunID(scope, runID)
      if (cancelRequested) {
        void sendCancel()
        abortStreamForCancel()
      }
    }

    const sendCancel = async () => {
      if (!runID) return
      if (cancelInFlight) return cancelPromise
      cancelInFlight = true

      cancelPromise = (async () => {
        const result: AgencySwarmAdapter.CancelResult = await AgencySwarmAdapter.cancel({
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

        return result
      })()
      return cancelPromise
    }

    const waitForCancelFinalize = async (promise: Promise<AgencySwarmAdapter.CancelResult | undefined>) => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      const result = await Promise.race<
        | { type: "completed"; result: AgencySwarmAdapter.CancelResult | undefined }
        | { type: "failed"; error: unknown }
        | { type: "timeout" }
      >([
        promise.then(
          (result) => ({ type: "completed" as const, result }),
          (error) => ({ type: "failed" as const, error }),
        ),
        new Promise<{ type: "timeout" }>((resolve) => {
          timeout = setTimeout(() => resolve({ type: "timeout" }), CANCEL_FINALIZE_TIMEOUT_MS)
        }),
      ])
      if (timeout) clearTimeout(timeout)

      if (result.type === "completed") {
        if (result.result) {
          const newMessages = Array.isArray(result.result.data?.["new_messages"])
            ? result.result.data["new_messages"]
            : []
          if (newMessages.length > 0) {
            await persistHistoryMessages(newMessages)
          }
        }
        abortStreamForCancel()
        return
      }

      if (result.type === "timeout") {
        log.warn("cancel finalization timed out", {
          runID,
          timeoutMs: CANCEL_FINALIZE_TIMEOUT_MS,
        })
        return
      }

      log.warn("cancel finalization failed", {
        runID,
        error: result.error instanceof Error ? result.error.message : String(result.error),
      })
    }

    const onAbort = () => {
      cancelRequested = true
      if (runID) {
        void sendCancel()
        abortStreamForCancel()
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
      let persistRebuiltHistoryFromMessages = false
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
          // would otherwise start with no context. Rebuild from cloned messages when stored history is
          // empty and prior messages are all agency-swarm.
          //
          // Queued prompts can also be saved locally while an Agency Swarm stream is still running.
          // In that window, streamed tool events are visible in local TUI state before backend
          // `new_messages` are finalized, so stored AgencySwarmHistory can lag behind the visible chat.
          const rebuilt = buildAgencyHistoryFromMessages({ msgs, currentID: input.userMessage.info.id })
          if (
            rebuilt &&
            rebuilt.length > 0 &&
            (history.chat_history.length === 0 ||
              hasErroredPriorAgencyAssistant(msgs, input.userMessage.info.id) ||
              historyMissingLocalUserMessages(history.chat_history, rebuilt))
          ) {
            rebuiltHistoryFromMessages = rebuilt
            persistRebuiltHistoryFromMessages = history.chat_history.length === 0
            return rebuilt
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
        historyRecipient:
          resolveHandoffRecipientFromHistory(chatHistory) ?? resolveHandoffRecipientFromHistory(history.chat_history),
        configuredRecipient: input.options.recipientAgent,
        configuredRecipientSelectedAt: input.options.recipientAgentSelectedAt,
      })
      const sessionLitellmModel =
        input.sessionModel &&
        buildLitellmModelForClientConfig(input.sessionModel.providerID, input.sessionModel.modelID)
      const sessionModelSettingsExtraArgs = normalizeVariantOptionsForClientConfig(input.sessionModel)
      const clientConfig = await resolveClientConfig(
        input.options.baseURL,
        agency,
        input.options.token,
        input.options.discoveryTimeoutMs,
        input.options.clientConfig,
        input.options.forwardUpstreamCredentials,
        sessionLitellmModel,
        sessionModelSettingsExtraArgs,
      )

      const hasCurrentFileAttachments = hasFileParts(input.userMessage)
      const hasRebuildableFileAttachments =
        history.chat_history.length === 0 &&
        !!rebuiltHistoryFromMessages &&
        !!sessionMessages &&
        hasPriorFileParts(sessionMessages, input.userMessage.info.id)
      const codexTransport = isCodexClientConfig(clientConfig)
      const sanitizedChatHistory = sanitizeAgencyHistoryForTransport(chatHistory, { codexTransport })
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

      if (persistRebuiltHistoryFromMessages && rebuiltHistoryFromMessages) {
        await AgencySwarmHistory.appendMessages(scope, normalizeAgencyHistoryForStorage(rebuiltHistoryFromMessages))
      }
      const transportChatHistory = sanitizeAgencyHistoryForTransport(effectiveChatHistory, { codexTransport })
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
            await handleRunID(frame.runID)
            continue
          }

          if (frame.type === "messages") {
            yield* await events.handleMessagesPayload(frame.payload)
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
            if (maybeName && events.isTopLevelHandoffEvent(eventMeta)) {
              events.recordAgentUpdatedHandoff(maybeName)
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
            const result = events.handleRawResponseEvent(nested, eventMeta)
            yield* result.parts
            if (result.error) {
              streamError = result.error
              break
            }
            continue
          }

          if (kind === "run_item_stream_event") {
            yield* events.handleRunItemEvent(frame.payload, eventMeta)
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
        if (cancelPromise) {
          await waitForCancelFinalize(cancelPromise)
        }
      }

      yield* events.flushOpen()

      if (!streamError && events.hasDanglingTool() && !streamAborted && !cancelRequested) {
        streamError = new Error("Tool stream ended before output was received")
      }

      if (streamError) {
        yield {
          type: "error",
          error: streamError,
        }
        return
      }

      const finalUsage = events.getUsage() ?? {
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

  function normalizeVariantOptionsForClientConfig(
    sessionModel: { providerID: string; modelID: string; variantOptions?: Record<string, unknown> } | undefined,
  ): Record<string, unknown> | undefined {
    const variantOptions = sessionModel?.variantOptions
    if (!variantOptions || Object.keys(variantOptions).length === 0) return undefined
    const out: Record<string, unknown> = { ...variantOptions }
    if ("reasoningEffort" in out && !("reasoning_effort" in out)) {
      out["reasoning_effort"] = out["reasoningEffort"]
      delete out["reasoningEffort"]
    }
    if ("reasoningSummary" in out && !("reasoning_summary" in out)) {
      out["reasoning_summary"] = out["reasoningSummary"]
      delete out["reasoningSummary"]
    }
    const providerID = sessionModel.providerID.toLowerCase()
    const modelID = sessionModel.modelID.toLowerCase()
    if (providerID === "anthropic") {
      if (typeof out["effort"] === "string" && !("reasoning_effort" in out)) {
        out["reasoning_effort"] = out["effort"]
      }
      delete out["effort"]
      delete out["reasoning_summary"]
      delete out["include"]
      normalizeThinkingBudget(out)
    } else if (providerID === "google" || providerID === "gemini" || providerID === "google-vertex") {
      normalizeGeminiThinkingConfig(out)
      delete out["reasoning_summary"]
      delete out["include"]
    } else if (providerID === "xai" && modelID.includes("grok")) {
      delete out["reasoning_effort"]
      delete out["reasoning_summary"]
      delete out["include"]
      delete out["effort"]
    }
    return Object.keys(out).length > 0 ? out : undefined
  }

  function normalizeThinkingBudget(out: Record<string, unknown>) {
    const thinking = asRecord(out["thinking"])
    if (!thinking) return
    const budgetTokens = thinking["budgetTokens"]
    if (typeof budgetTokens === "number" && !("budget_tokens" in thinking)) {
      out["thinking"] = { ...thinking, budget_tokens: budgetTokens }
      delete (out["thinking"] as Record<string, unknown>)["budgetTokens"]
    }
  }

  function normalizeGeminiThinkingConfig(out: Record<string, unknown>) {
    const thinkingConfig = asRecord(out["thinkingConfig"])
    const thinkingBudget = thinkingConfig?.["thinkingBudget"] ?? out["thinkingBudget"]
    const thinkingLevel = thinkingConfig?.["thinkingLevel"] ?? out["thinkingLevel"]
    if (typeof thinkingBudget === "number") {
      out["thinking"] = { type: "enabled", budget_tokens: thinkingBudget }
      if (!("reasoning_effort" in out)) {
        out["reasoning_effort"] = thinkingBudget >= 16000 ? "high" : "medium"
      }
    } else if (typeof thinkingLevel === "string" && !("reasoning_effort" in out)) {
      out["reasoning_effort"] = thinkingLevel
    }
    delete out["thinkingConfig"]
    delete out["thinkingBudget"]
    delete out["thinkingLevel"]
    delete out["includeThoughts"]
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
      const explicit = candidates.find((candidate) => candidate.source === "message" || candidate.source === "prompt")
      if (explicit) {
        log.info("using explicit recipient without metadata validation because agency metadata refresh failed", {
          sessionID: input.sessionID,
          agency: input.agency,
          recipientAgent: explicit.value.agent,
          source: explicit.source,
          error: error instanceof Error ? error.message : String(error),
        })
        return explicit.value.agent
      }
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
