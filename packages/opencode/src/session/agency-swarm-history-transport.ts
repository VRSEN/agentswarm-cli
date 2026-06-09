import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { MessageV2 } from "@/session/message-v2"
import {
  asRecord,
  asString,
  buildOutgoingMessage,
  buildStructuredOutgoingMessage,
  isAgencyToolOutputType,
  normalizeCallerAgent as normalizeCallerAgentValue,
  stringifyToolOutput,
  type AgencyMessageInput,
} from "./agency-swarm-utils"
import { isCodexAPIBaseURL, readConfiguredBaseURL } from "./agency-swarm-client-config"

const MAX_HISTORY_TOOL_OUTPUT_CHARS = 20_000
const MAX_TRANSPORT_TOOL_OUTPUT_CHARS = 12_000
const MAX_TRANSPORT_MESSAGE_TEXT_CHARS = 80_000
const HOSTED_TOOL_PRESERVATION_ORIGINS = new Set(["file_search_preservation", "web_search_preservation"])

export function compactHistory(input: {
  msgs: MessageV2.WithParts[]
  currentID: string
  structuredAttachments?: boolean
}): Array<Record<string, unknown>> | undefined {
  const slice = compactHistoryMessages(input)
  if (!slice) return

  return slice.flatMap((msg) => messageToHistoryItem(msg, input.currentID, !!input.structuredAttachments))
}

export function compactHistoryHasPriorFileParts(input: { msgs: MessageV2.WithParts[]; currentID: string }) {
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
  if (
    !input.msgs.some(
      (msg) =>
        msg.info.id !== input.currentID &&
        msg.info.role === "assistant" &&
        msg.info.providerID === AgencySwarmAdapter.PROVIDER_ID,
    )
  ) {
    return undefined
  }
  return input.msgs.flatMap((msg) => messageToHistoryItem(msg, input.currentID, !!input.structuredAttachments))
}

export function hasErroredPriorAgencyAssistant(msgs: MessageV2.WithParts[], currentID: string) {
  const currentIndex = msgs.findIndex((msg) => msg.info.id === currentID)
  const prior = currentIndex >= 0 ? msgs.slice(0, currentIndex) : msgs.filter((msg) => msg.info.id !== currentID)
  return prior.some(
    (msg) =>
      msg.info.role === "assistant" && msg.info.providerID === AgencySwarmAdapter.PROVIDER_ID && !!msg.info.error,
  )
}

export function historyMissingLocalUserMessages(
  stored: Array<Record<string, unknown>>,
  rebuilt: Array<Record<string, unknown>>,
) {
  const storedUserTexts = stored.map(historyUserText).filter(Boolean)
  const rebuiltUserTexts = rebuilt.map(historyUserText).filter(Boolean)
  if (rebuiltUserTexts.length === 0) return false
  if (storedUserTexts.length === 0) return true

  let storedIndex = 0
  for (const rebuiltText of rebuiltUserTexts) {
    while (storedIndex < storedUserTexts.length && storedUserTexts[storedIndex] !== rebuiltText) {
      storedIndex++
    }
    if (storedIndex >= storedUserTexts.length) return true
    storedIndex++
  }
  return false
}

function historyUserText(item: Record<string, unknown>) {
  if (asString(item["type"]) !== "message" || asString(item["role"]) !== "user") return ""
  return historyContentText(item["content"]).trim()
}

function historyContentText(content: unknown) {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((entry) => {
      const part = asRecord(entry)
      if (!part) return ""
      const type = asString(part["type"])
      if (type === "input_text" || type === "text") return asString(part["text"]) || ""
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
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

  const callerAgent = extractCallerAgent(msg)
  const items: Array<Record<string, unknown>> = []
  for (const part of msg.parts) {
    if (part.type === "text") {
      if (part.ignored) continue
      const text = part.text.trim()
      if (!text) continue
      items.push({
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        agent: msg.info.agent,
        callerAgent,
        timestamp: msg.info.time.created,
      })
      continue
    }
    if (part.type === "tool") {
      items.push(...toolPartToHistoryItems(part, msg, callerAgent))
    }
  }
  return items
}

function toolPartToHistoryItems(
  part: MessageV2.ToolPart,
  msg: MessageV2.WithParts,
  callerAgent: string | null,
): Array<Record<string, unknown>> {
  const state = part.state
  const metadata = state.status === "completed" || state.status === "error" ? asRecord(state.metadata) : undefined
  const base = {
    agent: msg.info.agent,
    callerAgent,
    timestamp: msg.info.time.created,
    metadata: {
      ...(metadata ?? {}),
      ...(asRecord(part.metadata) ?? {}),
    },
  }
  const input =
    state.status === "completed" || state.status === "error" || state.status === "running" ? state.input : {}
  const items: Array<Record<string, unknown>> = [
    {
      type: "function_call",
      name: part.tool,
      call_id: part.callID,
      arguments: stringifyToolOutput(input),
      ...base,
    },
  ]

  if (state.status === "completed") {
    items.push({
      type: "function_call_output",
      call_id: part.callID,
      output: state.output,
      ...base,
    })
  } else if (state.status === "error") {
    items.push({
      type: "function_call_output",
      call_id: part.callID,
      output: state.error,
      ...base,
    })
  } else {
    items.push({
      type: "function_call_output",
      call_id: part.callID,
      output: "Tool execution was interrupted before output was received.",
      ...base,
    })
  }

  return items
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

export function hasFileParts(msg: MessageV2.WithParts) {
  return msg.parts.some((part) => part.type === "file")
}

export function hasPriorFileParts(msgs: MessageV2.WithParts[], currentID: string) {
  return msgs.some((msg) => msg.info.id !== currentID && hasFileParts(msg))
}

export function isCodexClientConfig(config: Record<string, unknown> | undefined) {
  const baseURL = readConfiguredBaseURL(config)
  return !!baseURL && isCodexAPIBaseURL(baseURL)
}

export function sanitizeAgencyHistoryForTransport(
  history: Array<Record<string, unknown>>,
  options: { allowLocalFilePaths?: boolean; codexTransport?: boolean } = { allowLocalFilePaths: true },
) {
  return history.flatMap((item) => {
    const type = asString(item["type"])
    if (type === "handoff_output_item" || type === "item_reference") return []
    if (type === "message" && asString(item["role"]) === "assistant" && !hasReplayableMessageContent(item["content"])) {
      return []
    }
    if (options.allowLocalFilePaths === false) assertRemoteSafeHistoryItem(item)
    const transportItem =
      options.codexTransport && isHostedToolPreservationSystemMessage(item) ? { ...item, role: "developer" } : item
    return [normalizeAgencyHistoryItem(stripOpenAIResponseItemID(transportItem), "transport")]
  })
}

function isHostedToolPreservationSystemMessage(item: Record<string, unknown>) {
  return (
    asString(item["type"]) === "message" &&
    asString(item["role"]) === "system" &&
    HOSTED_TOOL_PRESERVATION_ORIGINS.has(asString(item["message_origin"]) || "")
  )
}

export function normalizeAgencyHistoryForStorage(input: unknown) {
  if (!Array.isArray(input)) return []
  return input.flatMap((item) => {
    const record = asRecord(item)
    return record ? [normalizeAgencyHistoryItem(record, "storage")] : []
  })
}

function normalizeAgencyHistoryItem(
  item: Record<string, unknown>,
  mode: "storage" | "transport",
): Record<string, unknown> {
  const type = asString(item["type"])
  const maxToolOutput = mode === "transport" ? MAX_TRANSPORT_TOOL_OUTPUT_CHARS : MAX_HISTORY_TOOL_OUTPUT_CHARS

  if (mode === "transport" && type === "function_call") {
    return {
      type,
      name: item["name"],
      call_id: item["call_id"],
      arguments: item["arguments"],
    }
  }

  if (mode === "transport" && type === "function_call_output") {
    return {
      type,
      call_id: item["call_id"],
      output: normalizeHistoryValue(item["output"], maxToolOutput, "tool output"),
    }
  }

  if (isAgencyToolOutputType(type)) {
    return {
      ...item,
      output: normalizeHistoryValue(item["output"], maxToolOutput, "tool output"),
    }
  }

  if (type === "message") {
    return {
      ...item,
      content: normalizeMessageContentForHistory(item["content"], mode),
    }
  }

  return item
}

function normalizeMessageContentForHistory(value: unknown, mode: "storage" | "transport") {
  if (!Array.isArray(value)) return value
  if (mode === "storage") return value

  return value.map((part) => {
    const record = asRecord(part)
    if (!record) return part
    const type = asString(record["type"])
    if (type === "input_text" || type === "output_text") {
      return {
        ...record,
        text: normalizeHistoryValue(record["text"], MAX_TRANSPORT_MESSAGE_TEXT_CHARS, `${type} text`),
      }
    }
    return record
  })
}

function normalizeHistoryValue(value: unknown, maxChars: number, label: string): unknown {
  if (typeof value === "string") return truncateLargeText(value, maxChars, label)
  if (value === undefined || value === null) return value

  try {
    const serialized = JSON.stringify(value)
    if (!serialized || serialized.length <= maxChars) return value
    return truncateLargeText(serialized, maxChars, label)
  } catch {
    return value
  }
}

export function truncateLargeText(value: string, maxChars: number, label: string) {
  if (value.length <= maxChars) return value
  const omitted = value.length - maxChars
  return `${value.slice(0, maxChars)}\n\n[${label} truncated: omitted ${omitted} characters to keep the agency-swarm bridge payload bounded.]`
}

export function replayStoredAttachmentsInOutgoingMessage(
  message: AgencyMessageInput,
  history: Array<Record<string, unknown>>,
  options: { allowLocalFilePaths?: boolean } = { allowLocalFilePaths: true },
): { message: AgencyMessageInput; replayedAttachmentKeys: Set<string> } {
  const replayedAttachments = collectReplayableAttachmentContent(history, options)
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

function collectReplayableAttachmentContent(
  history: Array<Record<string, unknown>>,
  options: { allowLocalFilePaths?: boolean } = { allowLocalFilePaths: true },
) {
  const result: Array<Record<string, unknown>> = []
  const seen = new Set<string>()
  for (const item of history) {
    if (asString(item["type"]) !== "message" || asString(item["role"]) !== "user") continue
    const content = item["content"]
    if (!Array.isArray(content)) continue
    for (const rawPart of content) {
      const part = asRecord(rawPart)
      if (!part || !isReplayableAttachmentPart(part)) continue
      if (options.allowLocalFilePaths === false) assertRemoteSafeAttachmentPart(part)
      const key = replayableAttachmentKey(part)
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ ...part })
    }
  }
  return result
}

function assertRemoteSafeHistoryItem(item: Record<string, unknown>) {
  const content = item["content"]
  if (!Array.isArray(content)) return
  for (const rawPart of content) {
    const part = asRecord(rawPart)
    if (!part || !isReplayableAttachmentPart(part)) continue
    assertRemoteSafeAttachmentPart(part)
  }
}

function assertRemoteSafeAttachmentPart(part: Record<string, unknown>) {
  const fileData = asString(part["file_data"])
  const fileURL = asString(part["file_url"])
  const imageURL = asString(part["image_url"])
  if (!fileData && !fileURL?.startsWith("file://") && !imageURL?.startsWith("file://") && !imageURL?.startsWith("data:")) {
    return
  }
  throw new Error(
    "Agent Swarm Run mode cannot send local file attachments to a remote Agency server. Use an http(s) URL or run against a local Agency server.",
  )
}

export function stripReplayedAttachmentsFromMessages(messages: unknown[], replayedKeys: Set<string>) {
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

export function messageHasAttachmentContent(message: AgencyMessageInput) {
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
  // User messages keep the user's selected model provider. In Agency Swarm sessions the
  // bridge provider is only reflected on assistant messages, so user turns must be allowed
  // when rebuilding visible local history after an interrupted or lagging backend stream.
  return true
}
