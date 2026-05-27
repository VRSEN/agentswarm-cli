import { MessageV2 } from "@/session/message-v2"
import {
  asRawString,
  asRecord,
  asString,
  compactMetadata,
  extractEventMeta,
  extractFunctionCallOutputs,
  isAgencyToolOutputType,
  isTopLevelAgencyHandoffMetadata,
  parseToolInput,
  stringifyToolOutput,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"
import { truncateLargeText } from "./agency-swarm-history-transport"

const MAX_UI_TOOL_OUTPUT_CHARS = 60_000

type StreamPart = Record<string, unknown>

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

type StreamEventsInput = {
  assistantMessage: MessageV2.Assistant
  isCancelled: () => boolean
  isAborted: () => boolean
  handleRunID: (runID: string) => Promise<void>
  persistMessages: (messages: unknown[]) => Promise<void>
  applyAssistantLabel: (metadata: AgencySwarmEventMeta) => Promise<void>
}

export function createAgencySwarmStreamEvents(input: StreamEventsInput) {
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
  let lastTextItemID: string | undefined
  let lastReasoningItemID: string | undefined
  let hadDanglingTool = false
  const agentUpdatedHandoffAgents = new Set<string>()

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
      return asRawString(item["code"]) || stringifyToolOutput(asRecord(item["input"]) ?? asRecord(item["action"]) ?? {})
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
    const parts: StreamPart[] = []
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
    const parts: StreamPart[] = []
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
        output: truncateLargeText(output, MAX_UI_TOOL_OUTPUT_CHARS, "tool output"),
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

  const handleRawResponseEvent = (
    nested: Record<string, unknown>,
    eventMeta: AgencySwarmEventMeta,
  ): { parts: StreamPart[]; error?: Error } => {
    const responseType = asString(nested["type"])
    const outputIndex = asNumber(nested["output_index"])
    const item = asRecord(nested["item"])

    if (!responseType) return { parts: [] }

    if (
      responseType === "response.created" ||
      responseType === "response.in_progress" ||
      responseType === "response.completed" ||
      responseType === "response.incomplete"
    ) {
      setUsage(asRecord(asRecord(nested["response"])?.["usage"]))
      return { parts: [] }
    }

    if (responseType === "response.output_item.added" && item) {
      return { parts: handleOutputItemAdded(item, outputIndex, eventMeta) }
    }

    if (responseType === "response.output_item.done" && item) {
      return { parts: handleOutputItemDone(item, outputIndex, eventMeta) }
    }

    if (responseType === "response.content_part.added") {
      const itemID = textItemID(nested)
      if (!itemID) return { parts: [] }
      const part = asRecord(nested["part"])
      const partType = asString(part?.["type"]) || ""
      if (partType !== "output_text" && partType !== "refusal") return { parts: [] }
      const contentIndex = asNumber(nested["content_index"]) ?? 0
      return {
        parts: ensureText(
          itemID,
          contentIndex,
          eventMeta,
          outputMeta(outputIndex, { content_index: contentIndex, content_type: partType }),
        ),
      }
    }

    if (responseType === "response.output_text.delta" || responseType === "response.refusal.delta") {
      const delta = asRawString(nested["delta"])
      if (delta === undefined) return { parts: [] }
      const itemID = textItemID(nested)
      if (!itemID) return { parts: [] }
      const contentIndex = asNumber(nested["content_index"]) ?? textIndex.get(itemID) ?? 0
      const textMeta = outputMeta(outputIndex, { content_index: contentIndex })
      return {
        parts: [
          ...ensureText(itemID, contentIndex, eventMeta, textMeta),
          ...textDelta(itemID, contentIndex, delta, eventMeta, textMeta),
        ],
      }
    }

    if (responseType === "response.output_text.done" || responseType === "response.content_part.done") {
      const itemID = textItemID(nested)
      if (!itemID) return { parts: [] }
      const contentIndex = asNumber(nested["content_index"]) ?? textIndex.get(itemID) ?? 0
      const part = asRecord(nested["part"])
      const final =
        asRawString(nested["text"]) ??
        asRawString(part?.["text"]) ??
        asRawString(part?.["refusal"]) ??
        asRawString(nested["delta"])
      return {
        parts: finishText(
          itemID,
          contentIndex,
          final,
          eventMeta,
          outputMeta(outputIndex, {
            content_index: contentIndex,
            ...agentUpdatedHandoffMetadata(eventMeta.agent),
          }),
        ),
      }
    }

    if (responseType === "response.reasoning_summary_part.added") {
      const itemID = reasoningItemID(nested)
      if (!itemID) return { parts: [] }
      const summaryIndex = asNumber(nested["summary_index"]) ?? 0
      return { parts: ensureReasoning(itemID, summaryIndex, eventMeta, outputMeta(outputIndex)) }
    }

    if (responseType === "response.reasoning_summary_text.delta" || responseType === "response.reasoning_text.delta") {
      const itemID = reasoningItemID(nested)
      if (!itemID) return { parts: [] }
      const summaryIndex = asNumber(nested["summary_index"] ?? nested["content_index"]) ?? 0
      const delta = asRawString(nested["delta"])
      if (delta === undefined) return { parts: [] }
      return {
        parts: [
          ...ensureReasoning(itemID, summaryIndex, eventMeta, outputMeta(outputIndex)),
          ...reasoningDelta(itemID, summaryIndex, delta, eventMeta, outputMeta(outputIndex)),
        ],
      }
    }

    if (
      responseType === "response.reasoning_summary_text.done" ||
      responseType === "response.reasoning_text.done" ||
      responseType === "response.reasoning_summary_part.done"
    ) {
      const itemID = reasoningItemID(nested)
      if (!itemID) return { parts: [] }
      const summaryIndex = asNumber(nested["summary_index"] ?? nested["content_index"]) ?? 0
      const part = asRecord(nested["part"])
      const text = asRawString(nested["text"])
      const final = text ?? asRawString(part?.["text"])
      return { parts: finishReasoning(itemID, summaryIndex, final, eventMeta, outputMeta(outputIndex)) }
    }

    if (
      responseType === "response.function_call_arguments.delta" ||
      responseType === "response.mcp_call_arguments.delta" ||
      responseType === "response.code_interpreter_call_code.delta"
    ) {
      const callID = findCallID(nested, item)
      if (!callID) return { parts: [] }
      const delta = asRawString(nested["delta"]) ?? ""
      const toolName =
        responseType === "response.code_interpreter_call_code.delta"
          ? "code_interpreter"
          : asString(nested["name"]) || toolNameFor(callID)
      return {
        parts: appendToolInput(callID, toolName, delta, eventMeta, {
          item_id: asString(nested["item_id"]),
          output_index: outputIndex,
        }),
      }
    }

    if (
      responseType === "response.function_call_arguments.done" ||
      responseType === "response.mcp_call_arguments.done" ||
      responseType === "response.code_interpreter_call_code.done"
    ) {
      const callID = findCallID(nested, item)
      if (!callID) return { parts: [] }
      const toolName =
        responseType === "response.code_interpreter_call_code.done"
          ? "code_interpreter"
          : asString(nested["name"]) || toolNameFor(callID)
      const raw = asRawString(nested["arguments"]) ?? asRawString(nested["code"]) ?? tools.get(callID)?.raw ?? ""
      return {
        parts: finalizeToolInput(callID, toolName, raw, eventMeta, {
          item_id: asString(nested["item_id"]),
          output_index: outputIndex,
        }),
      }
    }

    const callMatch = /^response\.([a-z_]+_call)\.(in_progress|searching|running|completed|failed)$/.exec(responseType)
    if (callMatch) {
      const itemType = callMatch[1]
      const phase = callMatch[2]
      const callID = findCallID(nested, item) || asString(nested["item_id"])
      if (!callID) return { parts: [] }
      const toolName = normalizeToolName(itemType, item)
      const itemID = asString(nested["item_id"]) || asString(item?.["id"])
      if (itemID) callByItem.set(itemID, callID)
      if (outputIndex !== undefined) callByOutput.set(outputIndex, callID)

      if (phase === "in_progress" || phase === "searching" || phase === "running") {
        return {
          parts: runTool(callID, toolName, eventMeta, {
            item_id: itemID,
            output_index: outputIndex,
            item_type: itemType,
            phase,
          }),
        }
      }

      if (phase === "completed") {
        // Keep completion sourced from output_item.done/messages/tool_output.
        // completed phase events can precede final payload and should not finalize output.
        return {
          parts: runTool(callID, toolName, eventMeta, {
            item_id: itemID,
            output_index: outputIndex,
            item_type: itemType,
            phase,
          }),
        }
      }

      const message = asString(nested["error"]) || asString(nested["message"]) || `${toolName} failed`
      return {
        parts: failTool(callID, toolName, message, eventMeta, {
          item_id: itemID,
          output_index: outputIndex,
          item_type: itemType,
          phase,
        }),
      }
    }

    if (responseType === "error") {
      const message = asString(nested["message"]) || asString(nested["error"]) || "Unknown stream error"
      return { parts: [], error: new Error(message) }
    }

    return { parts: [] }
  }

  const handleMessagesPayload = async (payload: Record<string, unknown>) => {
    const parts: StreamPart[] = []
    const newMessages = Array.isArray(payload["new_messages"]) ? payload["new_messages"] : []
    await input.persistMessages(newMessages)
    setUsage(asRecord(payload["usage"]))

    const runFromMessages = asString(payload["run_id"])
    if (runFromMessages) {
      await input.handleRunID(runFromMessages)
    }

    for (const output of extractFunctionCallOutputs(newMessages)) {
      const tool = ensureTool(output.callID, toolNameFor(output.callID))
      parts.push(
        ...completeTool(output.callID, tool.tool, output.output, output.metadata, { item_type: output.itemType }),
      )
    }

    for (const raw of newMessages) {
      const message = asRecord(raw)
      if (!message || asString(message["type"]) !== "message") continue
      const messageMeta = extractEventMeta(message)
      if (asString(message["role"]) === "assistant") await input.applyAssistantLabel(messageMeta)
      const itemID = asString(message["id"])
      if (!itemID) continue
      const text = extractMessageText(message)
      if (!text) continue
      if (shouldSkipDuplicateAssistantText(itemID, 0, text)) continue
      parts.push(
        ...finishText(itemID, 0, text, messageMeta, {
          source: "messages",
          ...agentUpdatedHandoffMetadata(messageMeta.agent),
        }),
      )
    }

    return parts
  }

  /** Retire closed replay candidates when a new run starts so the dedupe buffer does not grow across runs. */
  const retireClosedReplayCandidates = () => {
    for (const key of Array.from(textBuffer.keys())) {
      if (!textOpen.has(key)) textBuffer.delete(key)
    }
  }

  const flushOpen = () => {
    const parts: StreamPart[] = []

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
          input.isCancelled() || input.isAborted() ? "Cancelled" : "Tool stream ended before output was received",
          {},
        ),
      )
    }

    return parts
  }

  return {
    getUsage: () => usage,
    hasDanglingTool: () => hadDanglingTool,
    retireClosedReplayCandidates,
    recordAgentUpdatedHandoff: (agent: string) => agentUpdatedHandoffAgents.add(agent),
    isTopLevelHandoffEvent,
    handleMessagesPayload,
    handleRawResponseEvent,
    handleRunItemEvent,
    flushOpen,
  }
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
