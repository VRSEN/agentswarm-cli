import type { MessageV2 } from "@/session/message-v2"
import path from "path"
import { fileURLToPath } from "url"

export type AgencySwarmEventMeta = {
  agent?: string
  callerAgent?: string | null
  agentRunID?: string
  parentRunID?: string
}

export function normalizeCallerAgent(value: string | undefined): string | null | undefined {
  if (!value) return undefined
  return value === "None" ? null : value
}

export function extractEventMeta(event: Record<string, unknown>): AgencySwarmEventMeta {
  return {
    agent: asString(event["agent"]),
    callerAgent: normalizeCallerAgent(asString(event["callerAgent"])),
    agentRunID: asString(event["agent_run_id"]),
    parentRunID: asString(event["parent_run_id"]),
  }
}

export function compactMetadata(input: AgencySwarmEventMeta): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.agent) payload["agent"] = input.agent
  if (input.callerAgent !== undefined) payload["callerAgent"] = input.callerAgent
  if (input.agentRunID) payload["agent_run_id"] = input.agentRunID
  if (input.parentRunID) payload["parent_run_id"] = input.parentRunID
  return payload
}

export function extractFunctionCallOutputs(newMessages: unknown[]): Array<{ callID: string; output: string }> {
  const outputs: Array<{ callID: string; output: string }> = []
  for (const raw of newMessages) {
    const message = asRecord(raw)
    if (!message) continue
    if (!isAgencyToolOutputType(asString(message["type"]))) continue
    const callID = asString(message["call_id"])
    if (!callID) continue
    outputs.push({
      callID,
      output: stringifyToolOutput(message["output"]),
    })
  }
  return outputs
}

export function isAgencyToolOutputType(value: string | undefined) {
  return value === "function_call_output" || value === "tool_call_output_item" || value === "handoff_output_item"
}

export function parseToolInput(raw: unknown): Record<string, unknown> {
  const rawRecord = asRecord(raw)
  if (rawRecord) return rawRecord

  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) return {}
    try {
      const parsed = JSON.parse(text)
      const parsedRecord = asRecord(parsed)
      if (parsedRecord) return parsedRecord
      return { value: parsed }
    } catch {
      return { raw: text }
    }
  }

  return {}
}

export function stringifyToolOutput(output: unknown): string {
  if (typeof output === "string") return output
  if (output === undefined) return ""
  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return String(output)
  }
}

export function collectFileURLs(message: MessageV2.WithParts): Record<string, string> | undefined {
  const fileURLs: Record<string, string> = {}
  let index = 0

  for (const part of message.parts) {
    if (part.type !== "file") continue

    const source = normalizeFileURL(part.url)
    if (!source) continue

    const filename = part.filename || path.basename(source) || `file_${index++}`
    fileURLs[filename] = source
  }

  return Object.keys(fileURLs).length > 0 ? fileURLs : undefined
}

export function buildOutgoingMessage(message: MessageV2.WithParts): string {
  const textParts = message.parts
    .filter((part): part is MessageV2.TextPart => part.type === "text")
    .filter((part) => !part.ignored)
    .map((part) => visibleOutgoingText(part))
    .filter(Boolean)

  if (textParts.length === 0) {
    return ""
  }

  return textParts.join("\n\n")
}

function visibleOutgoingText(part: MessageV2.TextPart): string {
  if (!part.synthetic) return part.text.trim()

  const text = part.text.trimStart()
  if (!text.startsWith("<system-reminder>")) return text.trim()

  const end = text.indexOf("</system-reminder>")
  if (end === -1) return ""

  return text.slice(end + "</system-reminder>".length).trim()
}

export function findRecipientAgent(message: MessageV2.WithParts): string | undefined {
  const part = message.parts.findLast((item): item is MessageV2.AgentPart => item.type === "agent")
  return part?.name
}

export function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function asRawString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function normalizeFileURL(url: string): string | undefined {
  if (url.startsWith("file://")) {
    try {
      return fileURLToPath(url)
    } catch {
      return undefined
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  if (url.startsWith("data:")) {
    return url
  }

  return undefined
}
