import type { AssistantMessage, Part, Provider, UserMessage } from "@opencode-ai/sdk/v2"
import { displayAgentName } from "@/agent/display"
import { Locale } from "@/util/locale"
import * as Model from "./model"
import { resolveAssistantModelLabel, type ModelLabelContext } from "./model-label"

export type TranscriptOptions = {
  thinking: boolean
  toolDetails: boolean
  assistantMetadata: boolean
  providers?: Provider[]
  agencies?: ModelLabelContext["agencies"]
  agencyID?: string
  recipientAgent?: string
  recipientAgentSelectedAt?: number
}

export type SessionInfo = {
  id: string
  title: string
  time: {
    created: number
    updated: number
  }
}

export type MessageWithParts = {
  info: UserMessage | AssistantMessage
  parts: Part[]
}

export function formatTranscript(
  session: SessionInfo,
  messages: MessageWithParts[],
  options: TranscriptOptions,
): string {
  const providers = Model.index(options.providers)
  let transcript = `# ${session.title}\n\n`
  transcript += `**Session ID:** ${session.id}\n`
  transcript += `**Created:** ${new Date(session.time.created).toLocaleString()}\n`
  transcript += `**Updated:** ${new Date(session.time.updated).toLocaleString()}\n\n`
  transcript += `---\n\n`

  const users = new Map(messages.flatMap((msg) => (msg.info.role === "user" ? [[msg.info.id, msg.info] as const] : [])))

  for (const msg of messages) {
    const user = msg.info.role === "assistant" ? users.get(msg.info.parentID) : undefined
    const configuredRecipientChangedAfterTurn =
      !user?.agencyRecipientAgent &&
      !!user?.time.created &&
      !!options.recipientAgentSelectedAt &&
      options.recipientAgentSelectedAt > user.time.created
    transcript += formatMessage(
      msg.info,
      msg.parts,
      {
        ...options,
        recipientAgent:
          user?.agencyRecipientAgent ?? (configuredRecipientChangedAfterTurn ? undefined : options.recipientAgent),
      },
      providers,
    )
    transcript += `---\n\n`
  }

  return transcript
}

export function formatMessage(
  msg: UserMessage | AssistantMessage,
  parts: Part[],
  options: TranscriptOptions,
  providers?: Provider[] | ReadonlyMap<string, Provider>,
): string {
  let result = ""

  if (msg.role === "user") {
    result += `## User\n\n`
  } else {
    result += formatAssistantHeader(msg, options.assistantMetadata, {
      providers: providers ?? options.providers,
      agencies: options.agencies,
      agencyID: options.agencyID,
      recipientAgent: options.recipientAgent,
    })
  }

  for (const part of parts) {
    result += formatPart(part, options)
  }

  return result
}

export function formatAssistantHeader(
  msg: AssistantMessage,
  includeMetadata: boolean,
  context?: Provider[] | ReadonlyMap<string, Provider> | TranscriptModelLabelContext,
): string {
  if (!includeMetadata) {
    return `## Assistant\n\n`
  }

  const duration =
    msg.time.completed && msg.time.created ? ((msg.time.completed - msg.time.created) / 1000).toFixed(1) + "s" : ""

  const modelName = resolveAssistantModelLabel({
    ...readModelLabelContext(context),
    providerID: msg.providerID,
    modelID: msg.modelID,
    agentID: msg.agent,
  })

  return `## Assistant (${displayAgentName(msg.agent)} · ${modelName}${duration ? ` · ${duration}` : ""})\n\n`
}

type TranscriptModelLabelContext = ModelLabelContext & {
  recipientAgent?: string
}

function readModelLabelContext(
  context: Provider[] | ReadonlyMap<string, Provider> | TranscriptModelLabelContext | undefined,
): TranscriptModelLabelContext {
  if (!context) return {}
  if (Array.isArray(context)) return { providers: context }
  if (isProviderMap(context)) return { providers: context }
  return context
}

function isProviderMap(
  context: Provider[] | ReadonlyMap<string, Provider> | TranscriptModelLabelContext,
): context is ReadonlyMap<string, Provider> {
  return context instanceof Map
}

export function formatPart(part: Part, options: TranscriptOptions): string {
  if (part.type === "text" && !part.synthetic) {
    return `${part.text}\n\n`
  }

  if (part.type === "reasoning") {
    if (options.thinking) {
      return `${part.text}\n\n`
    }
    return ""
  }

  if (part.type === "tool") {
    let result = `**Tool: ${part.tool}**\n`
    if (options.toolDetails && part.state.input) {
      result += `\n**Input:**\n\`\`\`json\n${JSON.stringify(part.state.input, null, 2)}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "completed" && part.state.output) {
      result += `\n**Output:**\n\`\`\`\n${part.state.output}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "error" && part.state.error) {
      result += `\n**Error:**\n\`\`\`\n${part.state.error}\n\`\`\`\n`
    }
    result += `\n`
    return result
  }

  return ""
}
