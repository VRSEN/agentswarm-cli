import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, createResource, Match, Show, Switch } from "solid-js"
import { useLocal } from "../../context/local"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { isAgencySwarmFrameworkMode } from "../../session-error"
import { countAgencyAgents, formatAgencyCounts } from "../../util/agency-counts"
import {
  readAgencyProviderOptions,
  resolveAgencyHandoffRecipientFromMessages,
  resolveAgencyTargetSelection,
} from "../../util/agency-target"

const id = "internal:sidebar-agency"

type Discovery = {
  agencies: AgencySwarmAdapter.AgencyDescriptor[]
  error?: string
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const local = useLocal()
  const theme = () => props.api.theme.current
  const options = createMemo(() => {
    const framework = isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: props.api.state.config.model,
      agentModel: local.agent.current()?.model,
    })
    if (!framework) return undefined
    const configuredProvider = props.api.state.config.provider?.[AgencySwarmAdapter.PROVIDER_ID]
    const connectedProvider = props.api.state.provider.find((item) => item.id === AgencySwarmAdapter.PROVIDER_ID)
    if (!configuredProvider && !connectedProvider) return undefined
    return readAgencyProviderOptions({
      configuredProvider,
      connectedProvider,
    })
  })
  const [discovery] = createResource(
    options,
    async (opts): Promise<Discovery> => {
      try {
        const result = await AgencySwarmAdapter.discover({
          baseURL: opts.baseURL,
          token: opts.token,
          timeoutMs: opts.discoveryTimeoutMs,
        })
        return { agencies: result.agencies }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error
        return {
          agencies: [],
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    {
      initialValue: { agencies: [] },
    },
  )
  const selection = createMemo(() => {
    const opts = options()
    if (!opts) return undefined
    return resolveAgencyTargetSelection({
      agencies: discovery().agencies,
      configuredAgency: opts.agency,
      configuredRecipient: opts.recipientAgent,
    })
  })
  const agency = createMemo(() => {
    const selected = selection()
    if (!selected) return undefined
    return discovery().agencies.find((item) => item.id === selected.agency)
  })
  const messages = createMemo(() => [...props.api.state.session.messages(props.session_id)])
  const parts = createMemo(() =>
    Object.fromEntries(messages().map((item) => [item.id, [...props.api.state.part(item.id)]])),
  )
  const handoff = createMemo(() => {
    const opts = options()
    if (!opts) return undefined
    return resolveAgencyHandoffRecipientFromMessages({
      frameworkMode: true,
      agency: opts.agency,
      currentRecipient: opts.recipientAgent,
      currentRecipientSelectedAt: opts.recipientAgentSelectedAt,
      sessionID: props.session_id,
      messages: messages(),
      partsByMessage: parts(),
    })
  })
  const active = createMemo(() => {
    const item = agency()
    const selected = selection()
    const agentID = handoff()?.agent ?? selected?.recipientAgent
    if (!item || !agentID) return undefined
    return item.agents.find((agent) => agent.id === agentID)?.name ?? agentID
  })
  const empty = createMemo(() => {
    if (!discovery().agencies.length) return "No swarms"
    return "Pick with /agents"
  })

  return (
    <Show when={options()}>
      <box>
        <text fg={theme().text}>
          <b>Swarm</b>
        </text>
        <Switch>
          <Match when={discovery.loading}>
            <text fg={theme().textMuted}>Loading agents...</text>
          </Match>
          <Match when={discovery().error}>
            <text fg={theme().textMuted}>Agents unavailable</text>
          </Match>
          <Match when={agency()}>
            {(item) => (
              <>
                <text fg={theme().text}>{item().name}</text>
                <text fg={theme().textMuted}>{formatAgencyCounts(countAgencyAgents(item().agents))}</text>
                <Show when={active()}>{(value) => <text fg={theme().textMuted}>Active: {value()}</text>}</Show>
              </>
            )}
          </Match>
          <Match when={!agency()}>
            <text fg={theme().textMuted}>{empty()}</text>
          </Match>
        </Switch>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
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
