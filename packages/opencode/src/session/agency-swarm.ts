import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencySwarmHistory } from "@/agency-swarm/history"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Log } from "@/util/log"
import type { Provider } from "@/provider/provider"
import {
  asRecord,
  asRawString,
  asString,
  buildOutgoingMessage,
  compactMetadata,
  collectFileURLs,
  extractEventMeta,
  extractFunctionCallOutputs as extractFunctionCallOutputsFromMessages,
  findRecipientAgent,
  normalizeCallerAgent as normalizeCallerAgentValue,
  parseToolInput,
  stringifyToolOutput,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"

export namespace SessionAgencySwarm {
  const log = Log.create({ service: "session.agency-swarm" })
  export const PROVIDER_ID = AgencySwarmAdapter.PROVIDER_ID

  const CANCEL_BEFORE_META_ABORT_MS = 3000

  export type RuntimeOptions = {
    baseURL: string
    agency?: string
    recipientAgent?: string
    additionalInstructions?: string
    userContext?: Record<string, unknown>
    fileIDs?: string[]
    generateChatName?: boolean
    clientConfig?: Record<string, unknown>
    token?: string
    discoveryTimeoutMs: number
  }

  export type StreamInput = {
    sessionID: string
    assistantMessage: MessageV2.Assistant
    userMessage: MessageV2.WithParts
    options: RuntimeOptions
    abort: AbortSignal
    registerManagedCancel: (handler: () => void | Promise<void>) => void
    clearManagedCancel: () => void
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
    const rawAdditionalInstructions =
      asString(provider?.options?.["additionalInstructions"]) ??
      asString(provider?.options?.["additional_instructions"])
    const rawUserContext = asRecord(provider?.options?.["userContext"]) ?? asRecord(provider?.options?.["user_context"])
    const rawFileIDs = asStringArray(provider?.options?.["fileIDs"] ?? provider?.options?.["file_ids"])
    const rawGenerateChatName =
      asBoolean(provider?.options?.["generateChatName"]) ?? asBoolean(provider?.options?.["generate_chat_name"])
    const rawClientConfig =
      asRecord(provider?.options?.["clientConfig"]) ?? asRecord(provider?.options?.["client_config"])
    const rawToken = asString(provider?.key) ?? asString(provider?.options?.["token"])
    const rawTimeout = provider?.options?.["discoveryTimeoutMs"]

    return {
      baseURL: AgencySwarmAdapter.normalizeBaseURL(rawBaseURL || AgencySwarmAdapter.DEFAULT_BASE_URL),
      agency: rawAgency || undefined,
      recipientAgent: rawRecipientAgent || undefined,
      additionalInstructions: rawAdditionalInstructions || undefined,
      userContext: rawUserContext,
      fileIDs: rawFileIDs.length > 0 ? rawFileIDs : undefined,
      generateChatName: rawGenerateChatName,
      clientConfig: rawClientConfig,
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
          "Configure provider.options.agency in your config, or run `agentswarm agencii use <agency-id>`.",
        ].join(" "),
      )
    }

    throw new Error(
      [
        "Multiple agencies were discovered but no default agency is configured.",
        `Available agencies: ${availableAgencies.join(", ")}.`,
        "Set provider.options.agency or run `agentswarm agencii use <agency-id>`.",
      ].join(" "),
    )
  }

  export function normalizeCallerAgent(value: string | undefined): string | null | undefined {
    return normalizeCallerAgentValue(value)
  }

  export function extractFunctionCallOutputs(newMessages: unknown[]): Array<{ callID: string; output: string }> {
    return extractFunctionCallOutputsFromMessages(newMessages)
  }

  export async function stream(input: StreamInput): Promise<{ fullStream: AsyncGenerator<any> }> {
    const agency = await resolveAgency(input.options)
    const scope = {
      baseURL: input.options.baseURL,
      agency,
      sessionID: input.sessionID,
    }

    const history = await AgencySwarmHistory.load(scope)
    const outgoingMessage = buildOutgoingMessage(input.userMessage)
    const recipientAgent = await resolveRecipientAgent({
      sessionID: input.sessionID,
      baseURL: input.options.baseURL,
      agency,
      token: input.options.token,
      timeoutMs: input.options.discoveryTimeoutMs,
      mentionedRecipient: findRecipientAgent(input.userMessage),
      configuredRecipient: input.options.recipientAgent,
    })
    const fileURLs = collectFileURLs(input.userMessage)

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
      const totalTokens =
        rawTotal ?? inputTokens + outputTokens + reasoningTokens + cachedInputTokens + cacheWriteInputTokens

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
        const fromItem = asString(item["call_id"]) || asString(item["id"])
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
      const current = textBuffer.get(key) || ""
      const isOpen = textOpen.has(key)
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
      if (!suffix && final !== undefined && current && !final.startsWith(current) && !isOpen) {
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
      const current = reasoningBuffer.get(key) || ""
      const isOpen = reasoningOpen.has(key)
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

    const handleMessagesPayload = async function* (payload: Record<string, unknown>) {
      const newMessages = Array.isArray(payload["new_messages"]) ? payload["new_messages"] : []
      await AgencySwarmHistory.appendMessages(scope, newMessages)
      setUsage(asRecord(payload["usage"]))

      const runFromMessages = asString(payload["run_id"])
      if (runFromMessages) {
        runID = runFromMessages
        await AgencySwarmHistory.setLastRunID(scope, runID)
        if (cancelRequested) {
          await sendCancel()
        }
      }

      for (const output of extractFunctionCallOutputsFromMessages(newMessages)) {
        const tool = ensureTool(output.callID, toolNameFor(output.callID))
        yield* completeTool(output.callID, tool.tool, output.output, {})
      }

      for (const raw of newMessages) {
        const message = asRecord(raw)
        if (!message || asString(message["type"]) !== "message") continue
        const itemID = asString(message["id"])
        if (!itemID) continue
        const text = extractMessageText(message)
        if (!text) continue
        yield* finishText(itemID, 0, text, {}, { source: "messages" })
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

      if (itemType.endsWith("_output")) {
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

      if (itemType.endsWith("_output")) {
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
        if (itemID) callByItem.set(itemID, callID)
        return [
          ...ensureToolInput(callID, toolName, toolRawInput(itemType, rawItem), eventMeta, {
            item_id: itemID,
            source: "run_item_stream_event",
          }),
          ...runTool(callID, toolName, eventMeta, {
            item_id: itemID,
            source: "run_item_stream_event",
          }),
        ]
      }

      if (name === "tool_output" && itemType.endsWith("_output")) {
        const callID = asString(rawItem["call_id"])
        if (!callID) return []
        const tool = ensureTool(callID, toolNameFor(callID))
        return completeTool(callID, tool.tool, stringifyToolOutput(item?.["output"] ?? rawItem["output"]), eventMeta, {
          source: "run_item_stream_event",
        })
      }

      if (name === "message_output_created" && itemType === "message") {
        const itemID = asString(rawItem["id"]) || lastTextItemID
        if (!itemID) return []
        const text = extractMessageText(rawItem)
        if (!text) return []
        return finishText(itemID, 0, text, eventMeta, { source: "run_item_stream_event" })
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

    input.registerManagedCancel(() => {
      cancelRequested = true
      if (runID) {
        return sendCancel()
      }
      if (!cancelBeforeMetaTimer) {
        cancelBeforeMetaTimer = setTimeout(() => {
          streamAbort.abort(new DOMException("Aborted", "AbortError"))
        }, CANCEL_BEFORE_META_ABORT_MS)
      }
    })

    const fullStream = (async function* () {
      yield { type: "start" }
      yield { type: "start-step" }
      let streamError: Error | undefined

      try {
        for await (const frame of AgencySwarmAdapter.streamRun({
          baseURL: input.options.baseURL,
          agency,
          message: outgoingMessage,
          chatHistory: history.chat_history,
          recipientAgent,
          additionalInstructions: input.options.additionalInstructions,
          userContext: input.options.userContext,
          fileIDs: input.options.fileIDs,
          token: input.options.token,
          fileURLs,
          generateChatName: input.options.generateChatName,
          clientConfig: input.options.clientConfig,
          abort: streamSignal,
        })) {
          if (frame.type === "meta") {
            runID = frame.runID
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
          if (kind === "agent_updated_stream_event") {
            const next = asRecord(frame.payload["new_agent"])
            const maybeName = next ? asString(next["name"]) : undefined
            if (maybeName) {
              input.assistantMessage.agent = maybeName
              input.assistantMessage.mode = maybeName
              await Session.updateMessage(input.assistantMessage)
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
                outputMeta(outputIndex, { content_index: contentIndex }),
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
        input.clearManagedCancel()
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

      yield {
        type: "finish-step",
        finishReason: cancelRequested || streamAborted ? "cancelled" : streamError ? "error" : "stop",
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
            totalCost: finalUsage.cost,
          },
        },
      }

      yield {
        type: "finish",
      }
    })()

    return {
      fullStream,
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
    sessionID: string
    baseURL: string
    agency: string
    token?: string
    timeoutMs: number
    mentionedRecipient?: string
    configuredRecipient?: string
  }): Promise<string | undefined> {
    const candidates = [input.mentionedRecipient, input.configuredRecipient].filter(
      (value, index, array): value is string => !!value && array.indexOf(value) === index,
    )
    if (candidates.length === 0) {
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
        candidates,
        error: error instanceof Error ? error.message : String(error),
      })
      return undefined
    }

    const recipientMap = extractRecipientMap(metadata)
    if (recipientMap.size === 0) {
      log.warn("agency metadata has no recipient agents; skipping recipient override", {
        sessionID: input.sessionID,
        agency: input.agency,
        candidates,
      })
      return undefined
    }

    const availableAgents = Array.from(new Set(recipientMap.values()))
    for (const candidate of candidates) {
      const resolved = recipientMap.get(candidate)
      if (resolved) return resolved
      log.warn("ignoring stale recipient agent candidate", {
        sessionID: input.sessionID,
        agency: input.agency,
        candidate,
        source: candidate === input.mentionedRecipient ? "message" : "config",
        availableAgents,
      })
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
