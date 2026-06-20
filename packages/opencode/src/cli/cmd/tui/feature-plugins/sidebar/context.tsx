import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createMemo } from "solid-js"
import { useLocal } from "../../context/local"
import { contextLimit, tokenTotal } from "../../util/usage-display"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function View(props: { api: TuiPluginApi; session_id: string }) {
  const local = useLocal()
  const theme = () => props.api.theme.current
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const session = createMemo(() => props.api.state.session.get(props.session_id))
  const cost = createMemo(() => session()?.cost ?? 0)
  const model = createMemo(() => {
    const current = local.model.current()
    if (!current) return undefined
    return props.api.state.provider.find((item) => item.id === current.providerID)?.models[current.modelID]
  })

  const state = createMemo(() => {
    const last = msg().findLast((item): item is AssistantMessage => item.role === "assistant" && tokenTotal(item) > 0)
    if (!last) {
      const limit = contextLimit(model())
      return {
        tokens: 0,
        percent: limit ? 0 : null,
      }
    }

    const tokens = tokenTotal(last)
    const lastModel = props.api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
    const limit = contextLimit(lastModel)
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
      {state().percent === null ? null : <text fg={theme().textMuted}>{state().percent}% used</text>}
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
