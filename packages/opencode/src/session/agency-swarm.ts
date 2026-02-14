import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencySwarmHistory } from "@/agency-swarm/history"
import { Bus } from "@/bus"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Log } from "@/util/log"
import { NamedError } from "@opencode-ai/util/error"
import type { Provider } from "@/provider/provider"
import {
  asRecord,
  asString,
  buildOutgoingMessage,
  collectFileURLs,
  extractEventMeta,
  extractFunctionCallOutputs as extractFunctionCallOutputsFromMessages,
  findRecipientAgent,
  normalizeCallerAgent as normalizeCallerAgentValue,
  parseToolInput,
  stringifyToolOutput,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"
import {
  completeToolPart,
  ensureTextPart,
  ensureToolPart,
  reconcileFromMessages,
  runToolPart,
} from "./agency-swarm-parts"

export namespace SessionAgencySwarm {
  const log = Log.create({ service: "session.agency-swarm" })
  export const PROVIDER_ID = AgencySwarmAdapter.PROVIDER_ID

  const CANCEL_BEFORE_META_ABORT_MS = 3000

  export type RuntimeOptions = {
    baseURL: string
    agency?: string
    token?: string
    discoveryTimeoutMs: number
  }

  export type ProcessResult = "stop"

  export type ProcessInput = {
    sessionID: string
    assistantMessage: MessageV2.Assistant
    userMessage: MessageV2.WithParts
    options: RuntimeOptions
    abort: AbortSignal
    registerManagedCancel: (handler: () => void | Promise<void>) => void
    clearManagedCancel: () => void
  }

  export function optionsFromProvider(provider: Provider.Info | undefined): RuntimeOptions {
    const rawBaseURL = asString(provider?.options?.["baseURL"])
    const rawAgency = asString(provider?.options?.["agency"])
    const rawToken = asString(provider?.options?.["token"])
    const rawTimeout = provider?.options?.["discoveryTimeoutMs"]

    return {
      baseURL: AgencySwarmAdapter.normalizeBaseURL(rawBaseURL || AgencySwarmAdapter.DEFAULT_BASE_URL),
      agency: rawAgency || undefined,
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

    if (discovered.agencies.length === 1) {
      return discovered.agencies[0].id
    }

    if (discovered.agencies.length === 0) {
      throw new Error(
        [
          "No agencies were discovered from Agency Swarm OpenAPI metadata.",
          "Configure provider.options.agency in your config, or run `agency agencii use <agency-id>`.",
        ].join(" "),
      )
    }

    throw new Error(
      [
        "Multiple agencies were discovered but no default agency is configured.",
        `Available agencies: ${discovered.agencies.map((agency) => agency.id).join(", ")}.`,
        "Set provider.options.agency or run `agency agencii use <agency-id>`.",
      ].join(" "),
    )
  }

  export function normalizeCallerAgent(value: string | undefined): string | null | undefined {
    return normalizeCallerAgentValue(value)
  }

  export function extractFunctionCallOutputs(
    newMessages: unknown[],
  ): Array<{ callID: string; output: string }> {
    return extractFunctionCallOutputsFromMessages(newMessages)
  }

  export async function processTurn(input: ProcessInput): Promise<ProcessResult> {
    let agency: string
    try {
      agency = await resolveAgency(input.options)
    } catch (error) {
      markError(
        input.sessionID,
        input.assistantMessage,
        error instanceof Error ? error.message : String(error),
      )
      input.assistantMessage.time.completed = Date.now()
      input.assistantMessage.finish = "error"
      await Session.updateMessage(input.assistantMessage)
      return "stop"
    }
    const scope = {
      baseURL: input.options.baseURL,
      agency,
      sessionID: input.sessionID,
    }

    const history = await AgencySwarmHistory.load(scope)
    const outgoingMessage = buildOutgoingMessage(input.userMessage)
    const recipientAgent = findRecipientAgent(input.userMessage)
    const fileURLs = collectFileURLs(input.userMessage)

    const toolByCallID = new Map<string, MessageV2.ToolPart>()

    let textPart: MessageV2.TextPart | undefined
    let hadError = false
    let runID: string | undefined = history.last_run_id
    let cancelRequested = false
    let cancelInFlight = false
    let cancelBeforeMetaTimer: ReturnType<typeof setTimeout> | undefined

    const streamAbort = new AbortController()
    const streamSignal = AbortSignal.any([input.abort, streamAbort.signal])

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

    try {
      for await (const frame of AgencySwarmAdapter.streamRun({
        baseURL: input.options.baseURL,
        agency,
        message: outgoingMessage,
        chatHistory: history.chat_history,
        recipientAgent,
        token: input.options.token,
        fileURLs,
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
          const newMessages = Array.isArray(frame.payload["new_messages"])
            ? frame.payload["new_messages"]
            : []
          await AgencySwarmHistory.appendMessages(scope, newMessages)
          const runFromMessages = asString(frame.payload["run_id"])
          if (runFromMessages) {
            runID = runFromMessages
            await AgencySwarmHistory.setLastRunID(scope, runID)
          }
          await reconcileFromMessages({
            textPart,
            toolByCallID,
            newMessages,
          })
          continue
        }

        if (frame.type === "error") {
          hadError = true
          markError(input.sessionID, input.assistantMessage, frame.error)
          continue
        }

        if (frame.type === "end") {
          break
        }

        if (frame.type === "data") {
          const eventMeta = extractEventMeta(frame.payload)
          await applyAssistantLabel(input.assistantMessage, eventMeta)

          const kind = asString(frame.payload["type"])
          if (kind === "raw_response_event") {
            const nested = asRecord(frame.payload["data"])
            if (!nested) continue
            const responseType = asString(nested["type"])

            if (responseType === "response.output_item.added") {
              const item = asRecord(nested["item"])
              if (!item) continue

              if (asString(item["type"]) === "message") {
                textPart = await ensureTextPart({
                  sessionID: input.sessionID,
                  messageID: input.assistantMessage.id,
                  textPart,
                  metadata: eventMeta,
                })
                continue
              }

              if (asString(item["type"]) === "function_call") {
                const callID = asString(item["call_id"]) || asString(item["id"])
                if (!callID) continue

                const parsedInput = parseToolInput(item["arguments"])
                const toolPart = await ensureToolPart({
                  sessionID: input.sessionID,
                  messageID: input.assistantMessage.id,
                  toolByCallID,
                  callID,
                  toolName: asString(item["name"]) || "tool",
                  parsedInput,
                  rawInput: asString(item["arguments"]) || "",
                })
                toolByCallID.set(callID, toolPart)

                continue
              }

              if (asString(item["type"]) === "function_call_output") {
                const callID = asString(item["call_id"])
                if (!callID) continue
                await completeToolPart({
                  toolByCallID,
                  callID,
                  output: stringifyToolOutput(item["output"]),
                  metadata: eventMeta,
                })
                continue
              }
            }

            if (responseType === "response.output_text.delta") {
              const delta = asString(nested["delta"])
              if (!delta) continue

              textPart = await ensureTextPart({
                sessionID: input.sessionID,
                messageID: input.assistantMessage.id,
                textPart,
                metadata: eventMeta,
              })

              if (textPart) {
                textPart.text += delta
                await Session.updatePart({ part: textPart, delta })
              }

              continue
            }

            if (responseType === "response.output_text.done") {
              const doneText = asString(nested["text"])
              textPart = await ensureTextPart({
                sessionID: input.sessionID,
                messageID: input.assistantMessage.id,
                textPart,
                metadata: eventMeta,
              })
              if (textPart) {
                if (doneText) textPart.text = doneText
                textPart.time = {
                  start: textPart.time?.start ?? Date.now(),
                  end: Date.now(),
                }
                await Session.updatePart(textPart)
              }
              continue
            }

            if (responseType === "response.output_item.done") {
              const item = asRecord(nested["item"])
              if (!item) continue
              if (asString(item["type"]) === "function_call_output") {
                const callID = asString(item["call_id"])
                if (!callID) continue
                await completeToolPart({
                  toolByCallID,
                  callID,
                  output: stringifyToolOutput(item["output"]),
                  metadata: eventMeta,
                })
                continue
              }
              if (asString(item["type"]) === "function_call") {
                const callID = asString(item["call_id"]) || asString(item["id"])
                if (!callID) continue
                await runToolPart({
                  toolByCallID,
                  callID,
                  toolName: asString(item["name"]) || undefined,
                  parsedInput: parseToolInput(item["arguments"]),
                  metadata: eventMeta,
                })
              }
              continue
            }
          }

          if (kind === "run_item_stream_event") {
            const name = asString(frame.payload["name"])
            const item = asRecord(frame.payload["item"])
            const rawItem = item ? asRecord(item["raw_item"]) : undefined

            if (name === "tool_called" && rawItem && asString(rawItem["type"]) === "function_call") {
              const callID = asString(rawItem["call_id"]) || asString(rawItem["id"])
              if (!callID) continue

              await runToolPart({
                toolByCallID,
                callID,
                toolName: asString(rawItem["name"]) || undefined,
                parsedInput: parseToolInput(rawItem["arguments"]),
                metadata: eventMeta,
              })
              continue
            }

            if (name === "tool_output" && rawItem && asString(rawItem["type"]) === "function_call_output") {
              const callID = asString(rawItem["call_id"])
              if (!callID) continue
              await completeToolPart({
                toolByCallID,
                callID,
                output: stringifyToolOutput(item?.["output"] ?? rawItem["output"]),
                metadata: eventMeta,
              })
              continue
            }
          }

          if (kind === "agent_updated_stream_event") {
            const newAgent = asRecord(frame.payload["new_agent"])
            const maybeName = newAgent ? asString(newAgent["name"]) : undefined
            if (maybeName) {
              input.assistantMessage.agent = maybeName
              input.assistantMessage.mode = maybeName
              await Session.updateMessage(input.assistantMessage)
            }
            continue
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError") && !cancelRequested) {
        hadError = true
        markError(
          input.sessionID,
          input.assistantMessage,
          error instanceof Error ? error.message : String(error),
        )
      }
    } finally {
      if (cancelBeforeMetaTimer) {
        clearTimeout(cancelBeforeMetaTimer)
      }
      input.clearManagedCancel()

      if (textPart && !textPart.time?.end) {
        textPart.time = {
          start: textPart.time?.start ?? Date.now(),
          end: Date.now(),
        }
        await Session.updatePart(textPart)
      }

      for (const [callID, part] of toolByCallID.entries()) {
        if (part.state.status === "completed" || part.state.status === "error") continue

        const start = part.state.status === "running" ? part.state.time.start : Date.now()
        const next = (await Session.updatePart({
          ...part,
          state: {
            status: "error",
            input: part.state.input,
            error: cancelRequested ? "Cancelled" : "Tool stream ended before output was received",
            metadata: part.metadata,
            time: {
              start,
              end: Date.now(),
            },
          },
        })) as MessageV2.ToolPart
        toolByCallID.set(callID, next)
      }

      input.assistantMessage.time.completed = Date.now()
      input.assistantMessage.finish = cancelRequested ? "cancelled" : hadError ? "error" : "stop"
      await Session.updateMessage(input.assistantMessage)
    }

    return "stop"
  }

  async function applyAssistantLabel(message: MessageV2.Assistant, metadata: AgencySwarmEventMeta) {
    if (!metadata.agent) return
    if (metadata.agent === message.agent) return
    message.agent = metadata.agent
    message.mode = metadata.agent
    await Session.updateMessage(message)
  }

  function markError(sessionID: string, assistantMessage: MessageV2.Assistant, message: string) {
    const error = new NamedError.Unknown({ message }).toObject()
    assistantMessage.error = error
    Bus.publish(Session.Event.Error, {
      sessionID,
      error,
    })
  }
}
