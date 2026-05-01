import type { MessageV2 } from "@/session/message-v2"
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type AgencySwarmEventMeta = {
  agent?: string
  callerAgent?: string | null
  agentRunID?: string
  parentRunID?: string
}

type CollectFileURLOptions = {
  allowLocalFilePaths?: boolean
  materializeLocalFilePaths?: boolean
  localFilePathAllowlist?: string[]
  materializedFilePaths?: string[]
}

export function normalizeCallerAgent(value: string | undefined): string | null | undefined {
  if (!value) return undefined
  return value === "None" ? null : value
}

export function extractEventMeta(event: Record<string, unknown>): AgencySwarmEventMeta {
  return {
    agent: asString(event["agent"]),
    callerAgent: normalizeCallerAgent(
      asString(event["callerAgent"]) ?? asString(event["caller_agent"]) ?? asString(event["caller"]),
    ),
    agentRunID: asString(event["agent_run_id"]) ?? asString(event["agentRunID"]) ?? asString(event["agentRunId"]),
    parentRunID: asString(event["parent_run_id"]) ?? asString(event["parentRunID"]) ?? asString(event["parentRunId"]),
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

export function extractFunctionCallOutputs(
  newMessages: unknown[],
): Array<{ callID: string; output: string; metadata: AgencySwarmEventMeta; itemType?: string }> {
  const outputs: Array<{ callID: string; output: string; metadata: AgencySwarmEventMeta; itemType?: string }> = []
  for (const raw of newMessages) {
    const message = asRecord(raw)
    if (!message) continue
    const itemType = asString(message["type"])
    if (!isAgencyToolOutputType(itemType)) continue
    const callID = asString(message["call_id"])
    if (!callID) continue
    const messageMetadata = asRecord(message["metadata"])
    outputs.push({
      callID,
      output: stringifyToolOutput(message["output"]),
      metadata: extractEventMeta(messageMetadata ? { ...messageMetadata, ...message } : message),
      itemType,
    })
  }
  return outputs
}

export function isAgencyToolOutputType(value: string | undefined) {
  return value === "function_call_output" || value === "tool_call_output_item" || value === "handoff_output_item"
}

export function hasAgencyHandoffEvidence(parts: readonly unknown[] | undefined) {
  if (!parts) return false
  return parts.some((part) => {
    const record = asRecord(part)
    if (!record) return false
    const state = asRecord(record["state"])
    const partMetadata = asRecord(record["metadata"])
    const stateMetadata = asRecord(state?.["metadata"])
    if (isAgencyAgentUpdatedHandoffMetadata(partMetadata) && isTopLevelAgencyHandoffMetadata(partMetadata)) return true
    if (asString(record["type"]) !== "tool") return false
    if (
      isAgencyHandoffToolName(asString(record["tool"])) &&
      isTopLevelAgencyHandoffMetadata(partMetadata) &&
      isTopLevelAgencyHandoffMetadata(stateMetadata)
    ) {
      return true
    }

    const metadata = partMetadata ?? stateMetadata
    if (!isTopLevelAgencyHandoffMetadata(metadata)) return false
    return isAgencyHandoffOutputMetadata(metadata)
  })
}

export function isAgencyAgentUpdatedHandoffMetadata(metadata: Record<string, unknown> | undefined) {
  return asString(metadata?.["agency_handoff_event"]) === "agent_updated_stream_event"
}

export function isTopLevelAgencyHandoffMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return true
  if (asString(metadata["parent_run_id"]) || asString(metadata["parentRunID"]) || asString(metadata["parentRunId"])) {
    return false
  }
  return !hasCallerAgentMarker(metadata["callerAgent"] ?? metadata["caller_agent"] ?? metadata["caller"])
}

function isAgencyHandoffOutputMetadata(metadata: Record<string, unknown> | undefined) {
  return (
    asString(metadata?.["type"]) === "handoff_output_item" ||
    asString(metadata?.["item_type"]) === "handoff_output_item"
  )
}

function hasCallerAgentMarker(value: unknown) {
  if (value === undefined || value === null) return false
  const caller = normalizeCallerAgent(asString(value))
  return caller !== undefined && caller !== null
}

export function isAgencyHandoffToolName(value: string | undefined) {
  return !!value?.startsWith("transfer_to_")
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

export function collectFileURLs(
  message: MessageV2.WithParts,
  options: CollectFileURLOptions = {},
): Record<string, string> | undefined {
  const fileURLs: Record<string, string> = {}
  let index = 0

  for (const part of message.parts) {
    if (part.type !== "file") continue

    const source = normalizeFileURL(part, options)
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

function normalizeFileURL(part: MessageV2.FilePart, options: CollectFileURLOptions): string | undefined {
  if (part.url.startsWith("file://")) {
    let filepath: string
    try {
      filepath = fileURLToPath(part.url)
    } catch {
      return undefined
    }
    if (!options.allowLocalFilePaths) {
      throw new Error(
        "Agent Swarm Run mode cannot send local files to a remote Agency server. Use an http(s) URL or run against a local Agency server.",
      )
    }
    if (!options.materializeLocalFilePaths) return filepath
    const allowlistedPath = preserveAllowlistedLocalPath(filepath, options)
    if (allowlistedPath) return allowlistedPath
    rejectMaterializedDirectoryPath(filepath)
    const materializedFile = materializeLocalFilePath(filepath, path.basename(part.filename || filepath) || "file")
    options.materializedFilePaths?.push(materializedFile)
    return materializedFile
  }

  if (part.url.startsWith("http://") || part.url.startsWith("https://")) {
    return part.url
  }

  if (part.url.startsWith("data:")) {
    if (isClipboardImage(part)) {
      if (options.allowLocalFilePaths) {
        const clipboardFile = materializeClipboardImage(part)
        if (clipboardFile) {
          options.materializedFilePaths?.push(clipboardFile)
          return clipboardFile
        }
      }

      throw new Error(
        "Agent Swarm Run mode cannot send inline image data. Save the image as a local file and attach that file.",
      )
    }

    if (part.source?.type === "file" && part.source.path && path.isAbsolute(part.source.path)) {
      if (options.allowLocalFilePaths && !options.materializeLocalFilePaths) return part.source.path
      if (options.allowLocalFilePaths && options.materializeLocalFilePaths) {
        const allowlistedPath = preserveAllowlistedLocalPath(part.source.path, options)
        if (allowlistedPath) return allowlistedPath
        const materializedFile = materializeDataFilePart(
          part,
          path.parse(part.filename || part.source.path).name || "file",
        )
        if (materializedFile) {
          options.materializedFilePaths?.push(materializedFile)
          return materializedFile
        }
      }
      throw new Error(
        "Agent Swarm Run mode cannot send local files to a remote Agency server. Use an http(s) URL or run against a local Agency server.",
      )
    }

    throw new Error(
      "Agent Swarm Run mode cannot send inline image data. Save the image as a local file and attach that file.",
    )
  }

  return undefined
}

export async function cleanupMaterializedFilePaths(filepaths: readonly string[]) {
  const dirs = new Set<string>()
  for (const filepath of filepaths) {
    const dir = materializedClipboardDir(filepath)
    if (dir) dirs.add(dir)
  }
  await Promise.all(Array.from(dirs, (dir) => rm(dir, { recursive: true, force: true })))
}

export function localFileMaterializationRoot() {
  return path.join(tmpdir(), "agentswarm-local-files")
}

function isClipboardImage(part: MessageV2.FilePart) {
  return part.source?.type === "file" && part.source.path === "clipboard" && part.mime.startsWith("image/")
}

function materializedClipboardDir(filepath: string): string | undefined {
  const dir = path.resolve(path.dirname(filepath))
  const root = path.resolve(localFileMaterializationRoot())
  return dir.startsWith(`${root}${path.sep}`) ? dir : undefined
}

function preserveAllowlistedLocalPath(filepath: string, options: CollectFileURLOptions): string | undefined {
  return isLocalFilePathAllowed(filepath, options.localFilePathAllowlist) ? filepath : undefined
}

function rejectMaterializedDirectoryPath(filepath: string) {
  let stats
  try {
    stats = statSync(filepath)
  } catch {
    return
  }
  if (!stats.isDirectory()) return
  throw new Error(
    "Agent Swarm Run mode cannot send directory attachments outside the local file allowlist. Attach a project-local directory or a regular file.",
  )
}

function isLocalFilePathAllowed(filepath: string, allowlist: readonly string[] | undefined) {
  if (!allowlist || allowlist.length === 0) return false
  const candidate = realLocalPath(filepath)
  return allowlist.some((root) => isSamePathOrChild(candidate, realLocalPath(root)))
}

function realLocalPath(filepath: string) {
  try {
    return realpathSync(filepath)
  } catch {
    return path.resolve(filepath)
  }
}

function isSamePathOrChild(filepath: string, root: string) {
  const relative = path.relative(root, filepath)
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
}

function materializeClipboardImage(part: MessageV2.FilePart): string | undefined {
  return materializeDataFilePart(part, "clipboard-image")
}

function materializeLocalFilePath(sourcePath: string, filename: string): string {
  const root = localFileMaterializationRoot()
  mkdirSync(root, { recursive: true, mode: 0o700 })
  const dir = mkdtempSync(path.join(root, "file-"))
  const filepath = path.join(dir, filename)
  try {
    copyFileSync(sourcePath, filepath)
    return filepath
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function materializeDataFilePart(part: MessageV2.FilePart, stem: string): string | undefined {
  const parsed = parseBase64DataURL(part.url)
  if (!parsed) return undefined

  const root = localFileMaterializationRoot()
  mkdirSync(root, { recursive: true, mode: 0o700 })
  const dir = mkdtempSync(path.join(root, "file-"))
  const filepath = path.join(dir, `${stem}${extensionForMime(parsed.mime, part.filename)}`)
  writeFileSync(filepath, Buffer.from(parsed.data, "base64"), { mode: 0o600 })
  return filepath
}

function parseBase64DataURL(value: string): { mime: string; data: string } | undefined {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(value)
  if (!match) return undefined
  const [, mime, data] = match
  if (!mime || data === undefined) return undefined
  return {
    mime,
    data,
  }
}

function extensionForMime(mime: string, filename?: string): string {
  const ext = filename ? path.extname(filename) : ""
  if (ext) return ext
  switch (mime) {
    case "application/pdf":
      return ".pdf"
    case "text/plain":
      return ".txt"
    case "image/jpeg":
      return ".jpg"
    case "image/png":
      return ".png"
    case "image/webp":
      return ".webp"
    case "image/gif":
      return ".gif"
    default:
      return ".img"
  }
}
