import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo } from "solid-js"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function tokenTotal(message: AssistantMessage) {
  const total = message.tokens.total
  if (typeof total === "number" && total > 0) return total
  return (
    message.tokens.input +
    message.tokens.output +
    message.tokens.reasoning +
    message.tokens.cache.read +
    message.tokens.cache.write
  )
}

function contextLimit(model: { limit?: { context?: number } } | undefined) {
  const context = model?.limit?.context
  if (typeof context !== "number" || context <= 0) return undefined
  if (context >= Number.MAX_SAFE_INTEGER) return undefined
  return context
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const session = createMemo(() => props.api.state.session.get(props.session_id))
  const cost = createMemo(() => session()?.cost ?? 0)

  const state = createMemo(() => {
    const last = msg().findLast((item): item is AssistantMessage => item.role === "assistant" && tokenTotal(item) > 0)
    if (!last) {
      return {
        tokens: 0,
        percent: null,
      }
    }

    const tokens = tokenTotal(last)
    const model = props.api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
    const limit = contextLimit(model)
    return {
      tokens,
      percent: limit ? Math.round((tokens / limit) * 100) : null,
    }
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>Context</b>
      </text>
      <text fg={theme().textMuted}>{state().tokens.toLocaleString()} tokens</text>
      <text fg={theme().textMuted}>
        {state().percent === null ? "Usage percent unavailable" : `${state().percent}% used`}
      </text>
      <text fg={theme().textMuted}>{money.format(cost())} spent</text>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: InternalTuiPlugin = {
  id,
  tui,
}

export default plugin
