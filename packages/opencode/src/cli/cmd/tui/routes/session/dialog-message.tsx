import { createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import * as Clipboard from "@tui/util/clipboard"
import type { PromptInfo } from "@tui/component/prompt/history"
import { strip } from "@tui/component/prompt/part"
import { AGENCY_SWARM_BRIDGE_METADATA_KEY } from "@/session/message-v2"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import type { Part, UserMessage } from "@opencode-ai/sdk/v2"

function readAgencySwarmBridge(parts: Part[] | undefined) {
  for (const part of parts ?? []) {
    if (part.type !== "text" && part.type !== "subtask" && part.type !== "compaction") continue
    const value = part.metadata?.[AGENCY_SWARM_BRIDGE_METADATA_KEY]
    if (typeof value === "boolean") return value
  }
}

export function DialogMessage(props: {
  messageID: string
  sessionID: string
  setPrompt?: (prompt: PromptInfo) => void
}) {
  const sync = useSync()
  const sdk = useSDK()
  const message = createMemo(() => sync.data.message[props.sessionID]?.find((x) => x.id === props.messageID))
  const messages = createMemo(() => sync.data.message[props.sessionID] ?? [])
  const route = useRoute()
  const frameworkMode = createMemo(() => {
    const msg = message()
    if (!msg) return false
    const user =
      msg.role === "user"
        ? msg
        : messages().find((item): item is UserMessage => item.role === "user" && item.id === msg.parentID)
    const bridge = readAgencySwarmBridge(user ? sync.data.part[user.id] : undefined)
    if (typeof bridge === "boolean") return bridge
    if (msg.role === "assistant" && msg.providerID === AgencySwarmAdapter.PROVIDER_ID) return true
    if (
      msg.role === "user" &&
      messages().some(
        (item) => item.role === "assistant" && item.parentID === msg.id && item.providerID === AgencySwarmAdapter.PROVIDER_ID,
      )
    ) {
      return true
    }
    return false
  })

  const revertOption: DialogSelectOption<string> = {
    title: "Revert",
    value: "session.revert",
    description: "undo messages and file changes",
    onSelect: (dialog) => {
      const msg = message()
      if (!msg) return

      void sdk.client.session.revert({
        sessionID: props.sessionID,
        messageID: msg.id,
      })

      if (props.setPrompt) {
        const parts = sync.data.part[msg.id]
        const promptInfo = parts.reduce(
          (agg, part) => {
            if (part.type === "text") {
              if (!part.synthetic) agg.input += part.text
            }
            if (part.type === "file") agg.parts.push(strip(part))
            return agg
          },
          { input: "", parts: [] as PromptInfo["parts"] },
        )
        props.setPrompt(promptInfo)
      }

      dialog.clear()
    },
  }

  return (
    <DialogSelect
      title="Message Actions"
      options={[
        ...(frameworkMode() ? [] : [revertOption]),
        {
          title: "Copy",
          value: "message.copy",
          description: "message text to clipboard",
          onSelect: async (dialog) => {
            const msg = message()
            if (!msg) return

            const parts = sync.data.part[msg.id]
            const text = parts.reduce((agg, part) => {
              if (part.type === "text" && !part.synthetic) {
                agg += part.text
              }
              return agg
            }, "")

            await Clipboard.copy(text)
            dialog.clear()
          },
        },
        {
          title: "Fork",
          value: "session.fork",
          description: "create a new session",
          onSelect: async (dialog) => {
            const result = await sdk.client.session.fork({
              sessionID: props.sessionID,
              messageID: props.messageID,
            })
            const msg = message()
            const prompt = msg
              ? sync.data.part[msg.id].reduce(
                  (agg, part) => {
                    if (part.type === "text") {
                      if (!part.synthetic) agg.input += part.text
                    }
                    if (part.type === "file") agg.parts.push(part)
                    return agg
                  },
                  { input: "", parts: [] as PromptInfo["parts"] },
                )
              : undefined
            route.navigate({
              sessionID: result.data!.id,
              type: "session",
              prompt,
            })
            dialog.clear()
          },
        },
      ]}
    />
  )
}
