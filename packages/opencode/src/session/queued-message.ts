import { Effect } from "effect"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { MessageID, SessionID } from "./schema"
import { SessionRunState } from "./run-state"

export function isQueuedAfterActiveAssistant(input: {
  messages: readonly MessageV2.WithParts[]
  messageID: MessageID
}) {
  const activeAssistant = input.messages.findLast(
    (message) => message.info.role === "assistant" && !message.info.time.completed,
  )
  if (!activeAssistant) return false
  return input.messages.some(
    (message) =>
      message.info.role === "user" && message.info.id === input.messageID && message.info.id > activeAssistant.info.id,
  )
}

export const removeMessageAllowingQueued = Effect.fn("SessionQueuedMessage.removeMessageAllowingQueued")(
  function* (input: { sessionID: SessionID; messageID: MessageID }) {
    const state = yield* SessionRunState.Service
    const session = yield* Session.Service
    const busy = yield* state.isBusy(input.sessionID)

    if (busy) {
      const messages = yield* session.messages({ sessionID: input.sessionID })
      if (!isQueuedAfterActiveAssistant({ messages, messageID: input.messageID })) {
        throw new Session.BusyError(input.sessionID)
      }
    }

    yield* session.removeMessage(input)
  },
)
