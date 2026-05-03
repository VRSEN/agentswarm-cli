import { Log } from "@/util"
import { sanitizeClientConfigForTransport } from "./client-config"

export namespace AgencySwarmAdapter {
  const log = Log.create({ service: "agency-swarm.adapter" })

  export const PROVIDER_ID = "agency-swarm"
  export const DEFAULT_MODEL_ID = "default"
  export const DEFAULT_BASE_URL = "http://127.0.0.1:8000"
  export const DEFAULT_DISCOVERY_TIMEOUT_MS = 5000

  export type AgencyMetadata = {
    [key: string]: unknown
  }

  export type AgencyAgentDescriptor = {
    id: string
    name: string
    description?: string
    isEntryPoint: boolean
  }

  export type AgencyDescriptor = {
    id: string
    name: string
    description?: string
    agents: AgencyAgentDescriptor[]
    metadata: AgencyMetadata
  }

  export type DiscoverResult = {
    agencies: AgencyDescriptor[]
    rawOpenAPI: Record<string, unknown>
  }

  export type StreamRunInput = {
    baseURL: string
    agency: string
    message: string | Array<Record<string, unknown>>
    chatHistory: Array<Record<string, unknown>>
    recipientAgent?: string | null
    additionalInstructions?: string
    userContext?: Record<string, unknown>
    fileIDs?: string[]
    token?: string | null
    fileURLs?: Record<string, string>
    generateChatName?: boolean
    clientConfig?: Record<string, unknown>
    abort?: AbortSignal
  }

  export type CancelMode = "immediate" | "after_turn"

  export type CancelInput = {
    baseURL: string
    agency: string
    runID: string
    cancelMode?: CancelMode
    token?: string | null
    abort?: AbortSignal
  }

  export type CancelResult = {
    ok: boolean
    status: number
    cancelled: boolean
    notFound: boolean
    data?: Record<string, unknown>
    error?: string
  }

  export type StreamFrame =
    | {
        type: "meta"
        runID: string
      }
    | {
        type: "data"
        payload: Record<string, unknown>
      }
    | {
        type: "messages"
        payload: Record<string, unknown>
      }
    | {
        type: "error"
        error: string
      }
    | {
        type: "end"
      }

  export function normalizeBaseURL(baseURL: string): string {
    const raw = baseURL.trim()
    if (!raw) return DEFAULT_BASE_URL

    try {
      const url = new URL(raw)
      const cleanPath = url.pathname.replace(/\/+$/, "")
      url.pathname = cleanPath || "/"
      url.search = ""
      url.hash = ""
      return url.toString().replace(/\/$/, "")
    } catch {
      return raw.replace(/\/+$/, "")
    }
  }

  export function joinURL(baseURL: string, relativePath: string): string {
    const normalizedBaseURL = normalizeBaseURL(baseURL)
    const cleanBase = normalizedBaseURL.endsWith("/") ? normalizedBaseURL : normalizedBaseURL + "/"
    const cleanRelativePath = relativePath.replace(/^\/+/, "")
    return new URL(cleanRelativePath, cleanBase).toString()
  }

  export function parseAgencyIDsFromOpenAPI(openapi: Record<string, unknown>): string[] {
    const paths = openapi["paths"]
    if (!paths || typeof paths !== "object") return []

    const result = new Set<string>()
    for (const pathKey of Object.keys(paths)) {
      if (!pathKey.endsWith("/get_metadata")) continue
      const segments = pathKey.split("/").filter(Boolean)
      const metadataSegment = segments.lastIndexOf("get_metadata")
      if (metadataSegment <= 0) continue
      const agency = segments[metadataSegment - 1]
      if (!agency || agency.startsWith("{") || agency.endsWith("}")) continue
      result.add(agency)
    }

    return Array.from(result.values()).sort()
  }

  export async function discover(input: {
    baseURL: string
    token?: string | null
    timeoutMs?: number
  }): Promise<DiscoverResult> {
    const baseURL = normalizeBaseURL(input.baseURL)
    const timeoutMs = input.timeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS
    const openapiURL = joinURL(baseURL, "openapi.json")
    const response = await fetchWithTimeout(
      openapiURL,
      {
        method: "GET",
        headers: authHeaders(input.token),
      },
      timeoutMs,
      "discover agencies",
    )

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`OpenAPI discovery failed (${response.status}): ${body || "No response body"}`)
    }

    const rawOpenAPI = (await response.json()) as Record<string, unknown>
    const agencyIDs = parseAgencyIDsFromOpenAPI(rawOpenAPI)

    const agencies: AgencyDescriptor[] = []
    for (const agencyID of agencyIDs) {
      try {
        const metadata = await getMetadata({ baseURL, agency: agencyID, token: input.token, timeoutMs })
        agencies.push({
          id: agencyID,
          name: readAgencyName(metadata, agencyID),
          description: readAgencyDescription(metadata),
          agents: readAgencyAgents(metadata),
          metadata,
        })
      } catch (error) {
        log.warn("skipping agency metadata during discovery", {
          agencyID,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      agencies,
      rawOpenAPI,
    }
  }

  export async function getMetadata(input: {
    baseURL: string
    agency: string
    token?: string | null
    timeoutMs?: number
  }): Promise<AgencyMetadata> {
    const url = joinURL(input.baseURL, `${input.agency}/get_metadata`)
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: authHeaders(input.token),
      },
      input.timeoutMs,
      "load agency metadata",
    )

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`Metadata request failed (${response.status}): ${body || "No response body"}`)
    }

    return (await response.json()) as AgencyMetadata
  }

  export async function* streamRun(input: StreamRunInput): AsyncGenerator<StreamFrame> {
    const url = joinURL(input.baseURL, `${input.agency}/get_response_stream`)
    const requestBody: Record<string, unknown> = {
      message: input.message,
      chat_history: input.chatHistory,
    }
    if (input.recipientAgent) requestBody["recipient_agent"] = input.recipientAgent
    if (input.additionalInstructions) requestBody["additional_instructions"] = input.additionalInstructions
    if (input.userContext && Object.keys(input.userContext).length > 0) requestBody["user_context"] = input.userContext
    if (Array.isArray(input.fileIDs) && input.fileIDs.length > 0) requestBody["file_ids"] = input.fileIDs
    if (input.fileURLs && Object.keys(input.fileURLs).length > 0) requestBody["file_urls"] = input.fileURLs
    if (typeof input.generateChatName === "boolean") requestBody["generate_chat_name"] = input.generateChatName
    const normalizedClientConfig = normalizeClientConfig(input.clientConfig)
    if (normalizedClientConfig) requestBody["client_config"] = normalizedClientConfig

    let response: Response
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            ...authHeaders(input.token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: input.abort,
        },
        undefined,
        "start response stream",
      )
    } catch (error) {
      if (isAbortError(error)) throw error
      log.error("agency-swarm stream request failed before the backend responded", {
        url,
        error: toErrorMessage(error),
      })
      yield {
        type: "error",
        error: toErrorMessage(error),
      }
      yield { type: "end" }
      return
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      log.error("agency-swarm stream request failed", {
        url,
        status: response.status,
        body: body || "No response body",
      })
      yield {
        type: "error",
        error: `Streaming request failed (${response.status}): ${body || "No response body"}`,
      }
      yield { type: "end" }
      return
    }

    let end = false
    try {
      for await (const event of parseSSE(response)) {
        if (event.event === "meta") {
          const payload = parseJSON(event.data)
          const runID = payload && typeof payload["run_id"] === "string" ? payload["run_id"] : ""
          if (runID) {
            yield { type: "meta", runID }
            continue
          }
        }

        if (event.event === "messages") {
          const payload = parseJSON(event.data)
          if (!payload) {
            log.error("received malformed messages payload from agency-swarm stream", {
              url,
              data: event.data,
            })
            yield {
              type: "error",
              error: "Received malformed messages payload from agency-swarm stream",
            }
            continue
          }
          yield { type: "messages", payload }
          continue
        }

        if (event.event === "end") {
          end = true
          yield { type: "end" }
          break
        }

        const payload = parseJSON(event.data)
        if (!payload) {
          log.error("received malformed stream payload from agency-swarm", {
            url,
            data: event.data,
          })
          yield {
            type: "error",
            error: "Received malformed stream payload from agency-swarm",
          }
          continue
        }

        if (typeof payload["error"] === "string") {
          yield {
            type: "error",
            error: payload["error"],
          }
          continue
        }

        if (isRecord(payload["data"])) {
          yield {
            type: "data",
            payload: payload["data"],
          }
          continue
        }

        yield {
          type: "data",
          payload,
        }
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      log.error("agency-swarm stream parser failed", {
        url,
        error: toErrorMessage(error),
      })
      yield {
        type: "error",
        error: toErrorMessage(error),
      }
      yield { type: "end" }
      end = true
    }

    if (!end) {
      yield { type: "end" }
    }
  }

  export async function cancel(input: CancelInput): Promise<CancelResult> {
    const url = joinURL(input.baseURL, `${input.agency}/cancel_response_stream`)
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          ...authHeaders(input.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run_id: input.runID,
          cancel_mode: input.cancelMode,
        }),
        signal: input.abort,
      },
      undefined,
      "cancel response stream",
    )

    const body = (await safeJSON(response)) ?? {}

    if (response.status === 404) {
      return {
        ok: true,
        status: response.status,
        cancelled: true,
        notFound: true,
        data: isRecord(body) ? body : undefined,
      }
    }

    if (!response.ok) {
      const error = isRecord(body) && typeof body["detail"] === "string" ? body["detail"] : response.statusText
      return {
        ok: false,
        status: response.status,
        cancelled: false,
        notFound: false,
        error,
        data: isRecord(body) ? body : undefined,
      }
    }

    const cancelled = isRecord(body) && typeof body["cancelled"] === "boolean" ? body["cancelled"] : true
    return {
      ok: true,
      status: response.status,
      cancelled,
      notFound: false,
      data: isRecord(body) ? body : undefined,
    }
  }

  async function fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs?: number,
    action?: string,
  ): Promise<Response> {
    try {
      if (!timeoutMs || timeoutMs <= 0) {
        return await fetch(input, init)
      }

      const signal = init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs)
      return await fetch(input, {
        ...init,
        signal,
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      throw normalizeConnectionError({
        action: action ?? "make request",
        url: input,
        error,
        timeoutMs,
      })
    }
  }

  function authHeaders(token?: string | null): Record<string, string> {
    if (!token) return {}
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  function readAgencyName(metadata: AgencyMetadata, fallback: string): string {
    const info = asRecord(metadata["metadata"])
    if (info && typeof info["agencyName"] === "string" && info["agencyName"].trim()) return info["agencyName"]
    return fallback
  }

  function readAgencyDescription(metadata: AgencyMetadata): string | undefined {
    const entryPoints = asArray(asRecord(metadata["metadata"])?.["entryPoints"])
    const nodes = asArray(metadata["nodes"])

    const firstEntry = entryPoints.find((item): item is string => typeof item === "string")
    if (!firstEntry) return undefined

    for (const node of nodes) {
      if (!isRecord(node)) continue
      if (node["id"] !== firstEntry) continue
      const data = asRecord(node["data"])
      if (data && typeof data["description"] === "string" && data["description"].trim()) {
        return data["description"]
      }
    }

    return undefined
  }

  function readAgencyAgents(metadata: AgencyMetadata): AgencyAgentDescriptor[] {
    const metadataRecord = asRecord(metadata["metadata"])
    const nodes = asArray(metadata["nodes"])
    const entryPoints = new Set(readStringArray(metadataRecord?.["entryPoints"]))

    const result = new Map<string, AgencyAgentDescriptor>()

    for (const agentID of readStringArray(metadataRecord?.["agents"])) {
      result.set(agentID, {
        id: agentID,
        name: agentID,
        isEntryPoint: entryPoints.has(agentID),
      })
    }

    for (const node of nodes) {
      const nodeRecord = asRecord(node)
      if (!nodeRecord) continue

      const id = asString(nodeRecord["id"])
      if (!id) continue

      const nodeType = asString(nodeRecord["type"])
      const data = asRecord(nodeRecord["data"])
      const label = asString(data?.["label"]) ?? id
      const description = asString(data?.["description"])
      const dataEntryPoint = asBoolean(data?.["isEntryPoint"]) === true
      const knownAgent = result.get(id)
      const includeNode = nodeType === "agent" || !!knownAgent
      if (!includeNode) continue

      result.set(id, {
        id,
        name: label,
        description: description || knownAgent?.description,
        isEntryPoint: entryPoints.has(id) || dataEntryPoint || knownAgent?.isEntryPoint === true,
      })
    }

    return Array.from(result.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  function normalizeClientConfig(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!value) return undefined
    const baseURL = asString(value["base_url"]) ?? asString(value["baseURL"])
    const apiKey = asString(value["api_key"]) ?? asString(value["apiKey"])
    const litellmKeys = asRecord(value["litellm_keys"]) ?? asRecord(value["litellmKeys"])
    const headers = readStringRecord(value["default_headers"]) ?? readStringRecord(value["defaultHeaders"])
    const model = asString(value["model"])

    const payload: Record<string, unknown> = {}
    if (baseURL) payload["base_url"] = baseURL
    if (apiKey) payload["api_key"] = apiKey
    if (litellmKeys && Object.keys(litellmKeys).length > 0) payload["litellm_keys"] = litellmKeys
    if (headers) payload["default_headers"] = headers
    if (model) payload["model"] = model

    if (Object.keys(payload).length === 0) return undefined
    return sanitizeClientConfigForTransport(payload)
  }

  async function safeJSON(response: Response): Promise<unknown | undefined> {
    const text = await response.text().catch(() => undefined)
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return undefined
    }
  }

  function parseJSON(input: string): Record<string, unknown> | undefined {
    try {
      const parsed = JSON.parse(input)
      return isRecord(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }

  async function* parseSSE(response: Response): AsyncGenerator<{ event: string; data: string }> {
    if (!response.body) return

    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, "\n")

      while (true) {
        const boundary = buffer.indexOf("\n\n")
        if (boundary === -1) break

        const chunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const parsed = parseSSEChunk(chunk)
        if (!parsed) continue
        yield parsed
      }
    }

    const finalChunk = buffer.trim()
    if (!finalChunk) return
    const parsed = parseSSEChunk(finalChunk)
    if (parsed) yield parsed
  }

  function parseSSEChunk(chunk: string): { event: string; data: string } | undefined {
    let event = "message"
    const dataLines: string[] = []

    for (const line of chunk.split("\n")) {
      if (!line || line.startsWith(":")) continue
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim() || "message"
        continue
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart())
      }
    }

    if (dataLines.length === 0) return undefined
    return {
      event,
      data: dataLines.join("\n"),
    }
  }

  function isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === "AbortError"
  }

  function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message
    return String(error)
  }

  function normalizeConnectionError(input: { action: string; url: string; error: unknown; timeoutMs?: number }): Error {
    const detail = toErrorMessage(input.error)
    const timeoutHint =
      input.timeoutMs && input.timeoutMs > 0 && /timeout/i.test(detail) ? ` after ${input.timeoutMs}ms` : ""
    const message =
      `Failed to ${input.action}: cannot reach agency-swarm backend at ${input.url}${timeoutHint}. ` +
      `Start the FastAPI server and verify provider.options.baseURL.` +
      (detail ? ` (${detail})` : "")
    return new Error(message, { cause: input.error })
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value)
  }

  function asRecord(value: unknown): Record<string, unknown> | undefined {
    return isRecord(value) ? value : undefined
  }

  function asString(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  function readStringRecord(value: unknown): Record<string, string> | undefined {
    const record = asRecord(value)
    if (!record) return undefined
    const result = Object.fromEntries(
      Object.entries(record).flatMap(([key, item]) => (typeof item === "string" ? [[key, item]] : [])),
    )
    return Object.keys(result).length > 0 ? result : undefined
  }

  function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
  }

  function readStringArray(value: unknown): string[] {
    return asArray(value).flatMap((item) => {
      const parsed = asString(item)
      return parsed ? [parsed] : []
    })
  }

  function asBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined
  }
}
