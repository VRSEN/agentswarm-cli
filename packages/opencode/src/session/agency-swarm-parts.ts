import { Identifier } from "@/id/id"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import {
  asRecord,
  asString,
  compactMetadata,
  extractFunctionCallOutputs,
  type AgencySwarmEventMeta,
} from "./agency-swarm-utils"

export async function ensureTextPart(input: {
  sessionID: string
  messageID: string
  textPart: MessageV2.TextPart | undefined
  metadata: AgencySwarmEventMeta
}): Promise<MessageV2.TextPart> {
  if (input.textPart) return input.textPart

  return (await Session.updatePart({
    id: Identifier.ascending("part"),
    sessionID: input.sessionID,
    messageID: input.messageID,
    type: "text",
    text: "",
    time: {
      start: Date.now(),
    },
    metadata: compactMetadata(input.metadata),
  })) as MessageV2.TextPart
}

export async function ensureToolPart(input: {
  sessionID: string
  messageID: string
  toolByCallID: Map<string, MessageV2.ToolPart>
  callID: string
  toolName: string
  parsedInput: Record<string, unknown>
  rawInput: string
}): Promise<MessageV2.ToolPart> {
  const existing = input.toolByCallID.get(input.callID)
  if (existing) return existing

  return (await Session.updatePart({
    id: Identifier.ascending("part"),
    sessionID: input.sessionID,
    messageID: input.messageID,
    type: "tool",
    callID: input.callID,
    tool: input.toolName,
    state: {
      status: "pending",
      input: input.parsedInput,
      raw: input.rawInput,
    },
  })) as MessageV2.ToolPart
}

export async function runToolPart(input: {
  toolByCallID: Map<string, MessageV2.ToolPart>
  callID: string
  toolName?: string
  parsedInput: Record<string, unknown>
  metadata: AgencySwarmEventMeta
}) {
  const existing = input.toolByCallID.get(input.callID)
  if (!existing) return

  if (existing.state.status === "running" || existing.state.status === "completed") return

  const next = (await Session.updatePart({
    ...existing,
    tool: input.toolName || existing.tool,
    metadata: compactMetadata(input.metadata),
    state: {
      status: "running",
      input: input.parsedInput,
      metadata: compactMetadata(input.metadata),
      time: {
        start: Date.now(),
      },
    },
  })) as MessageV2.ToolPart

  input.toolByCallID.set(input.callID, next)
}

export async function completeToolPart(input: {
  toolByCallID: Map<string, MessageV2.ToolPart>
  callID: string
  output: string
  metadata: AgencySwarmEventMeta
}) {
  const existing = input.toolByCallID.get(input.callID)
  if (!existing) return

  const running =
    existing.state.status === "running"
      ? existing.state
      : {
          status: "running" as const,
          input: existing.state.input,
          time: {
            start: Date.now(),
          },
        }

  const next = (await Session.updatePart({
    ...existing,
    metadata: compactMetadata(input.metadata),
    state: {
      status: "completed",
      input: running.input,
      output: input.output,
      title: "",
      metadata: compactMetadata(input.metadata),
      time: {
        start: running.time.start,
        end: Date.now(),
      },
    },
  })) as MessageV2.ToolPart

  input.toolByCallID.set(input.callID, next)
}

export async function reconcileFromMessages(input: {
  textPart: MessageV2.TextPart | undefined
  toolByCallID: Map<string, MessageV2.ToolPart>
  newMessages: unknown[]
}) {
  if (!Array.isArray(input.newMessages)) return

  for (const output of extractFunctionCallOutputs(input.newMessages)) {
    await completeToolPart({
      toolByCallID: input.toolByCallID,
      callID: output.callID,
      output: output.output,
      metadata: {},
    })
  }

  for (const raw of input.newMessages) {
    const message = asRecord(raw)
    if (!message) continue

    const type = asString(message["type"])
    if (type === "function_call_output") continue

    if (type === "message" && input.textPart) {
      const content = Array.isArray(message["content"]) ? message["content"] : []
      const fromHistory = content
        .map((part: unknown) => {
          const record = asRecord(part)
          if (!record) return ""
          if (asString(record["type"]) !== "output_text") return ""
          return asString(record["text"]) || ""
        })
        .filter(Boolean)
        .join("\n")

      if (fromHistory && (!input.textPart.text || input.textPart.text.length < fromHistory.length)) {
        input.textPart.text = fromHistory
        await Session.updatePart(input.textPart)
      }
    }
  }
}
