import { Effect } from "effect"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { MessageID, SessionID } from "./schema"
import { SessionRunState } from "./run-state"

export function isQueuedAfterActiveAssistant(input: {
  messages: readonly MessageV2.WithParts[]
  messageID: MessageID
}) {
  const activeAssistantIndex = input.messages.findLastIndex(
    (message) => message.info.role === "assistant" && !message.info.time.completed,
  )
  if (activeAssistantIndex === -1) return false
  const messageIndex = input.messages.findIndex((message) => message.info.id === input.messageID)
  if (messageIndex === -1) return false
  return input.messages[messageIndex]?.info.role === "user" && messageIndex > activeAssistantIndex
}

export const removeMessageAllowingQueued = Effect.fn("SessionQueuedMessage.removeMessageAllowingQueued")(
  function* (input: { sessionID: SessionID; messageID: MessageID }) {
    const state = yield* SessionRunState.Service
    const session = yield* Session.Service
    const busy = yield* state.isBusy(input.sessionID)

    if (busy) {
      const running = yield* state.isRunning(input.sessionID)
      if (!running) throw new Session.BusyError(input.sessionID)
      const messages = yield* session.messages({ sessionID: input.sessionID })
      if (!isQueuedAfterActiveAssistant({ messages, messageID: input.messageID })) {
        throw new Session.BusyError(input.sessionID)
      }
    }

    yield* session.removeMessage(input)
  },
)
