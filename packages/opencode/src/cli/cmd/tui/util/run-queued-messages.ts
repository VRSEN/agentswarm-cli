import type { AssistantMessage, Part, UserMessage } from "@opencode-ai/sdk/v2"
import type { PromptInfo } from "../component/prompt/history"
import { strip } from "../component/prompt/part"

type Message = UserMessage | AssistantMessage

export type QueuedRunModeMessage = {
  message: UserMessage
  prompt: PromptInfo
}

export function collectQueuedRunModeMessages(input: {
  messages: readonly Message[]
  parts: Record<string, Part[] | undefined>
}): QueuedRunModeMessage[] {
  const activeAssistant = input.messages.findLast(
    (message): message is AssistantMessage => message.role === "assistant" && !message.time.completed,
  )
  if (!activeAssistant) return []

  return input.messages
    .filter((message): message is UserMessage => message.role === "user" && message.id > activeAssistant.id)
    .map((message) => ({
      message,
      prompt: promptFromMessageParts(input.parts[message.id] ?? []),
    }))
}

export async function cancelQueuedRunModeMessages(input: {
  frameworkMode: boolean
  messages: readonly Message[]
  parts: Record<string, Part[] | undefined>
  abort: () => Promise<void>
  deleteMessage: (messageID: string) => Promise<void>
}) {
  const queued = input.frameworkMode ? collectQueuedRunModeMessages(input) : []
  if (queued.length === 0) {
    await input.abort()
    return queued
  }
  for (const item of queued) {
    await input.deleteMessage(item.message.id)
  }
  return queued
}

function promptFromMessageParts(parts: readonly Part[]): PromptInfo {
  return parts.reduce(
    (prompt, part) => {
      if (part.type === "text") {
        if (!part.synthetic) prompt.input += part.text
      } else if (part.type === "file" || part.type === "agent") {
        prompt.parts.push(strip(part))
      }
      return prompt
    },
    { input: "", parts: [] } as PromptInfo,
  )
}
