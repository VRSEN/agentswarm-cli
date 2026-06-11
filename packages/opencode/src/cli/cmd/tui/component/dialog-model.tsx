import { createMemo, createResource, createSignal } from "solid-js"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { map, pipe, flatMap, entries, filter, sortBy, take } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import {
  createDialogProviderOptions,
  createDialogProviderOptionsWithFilter,
  DialogAuth,
  DialogProvider,
} from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import { isAgencySupportedProvider, isAgencySwarmFrameworkMode } from "../session-error"
import * as fuzzysort from "fuzzysort"
import { useConnected } from "./use-connected"
import { AgencySwarmOllama } from "@/agency-swarm/ollama"
import { useToast } from "../ui/toast"
import { downloadOllamaModel } from "./download-ollama-model"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { readAgencyProviderOptions } from "../util/agency-target"
import { resolveModelLabel } from "../util/model-label"

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  const toast = useToast()
  const [query, setQuery] = createSignal("")

  const rawConnected = useConnected()
  const frameworkMode = isAgencySwarmFrameworkMode({
    currentProviderID: local.model.current()?.providerID,
    configuredModel: sync.data.config.model,
    agentModel: local.agent.current()?.model,
    productMode: local.product.current(),
  })
  const agencyOptions = createMemo(() =>
    readAgencyProviderOptions({
      configuredProvider: sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
      connectedProvider: sync.data.provider.find((item) => item.id === AgencySwarmAdapter.PROVIDER_ID),
    }),
  )
  const discoveryInput = createMemo(() => {
    if (!frameworkMode) return undefined
    const options = agencyOptions()
    return {
      baseURL: options.baseURL,
      token: options.token,
      timeoutMs: options.discoveryTimeoutMs,
    }
  })
  const [discovery] = createResource(
    discoveryInput,
    async (input): Promise<AgencySwarmAdapter.AgencyDescriptor[]> => {
      try {
        const result = await AgencySwarmAdapter.discover(input)
        return result.agencies
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error
        return []
      }
    },
    {
      initialValue: [],
    },
  )
  // In Agent Swarm framework mode, restrict `/models` to the agency-supported set
  // so users cannot pick a provider the send guard (`shouldBlockAgencyPromptSubmit`)
  // would immediately block.
  const agencyProviderIDs = frameworkMode
    ? sync.data.provider_next.all
        .filter((provider) => isAgencySupportedProvider(provider.id))
        .map((provider) => provider.id)
    : undefined
  const providers = frameworkMode
    ? createDialogProviderOptionsWithFilter({ providerIDs: agencyProviderIDs })
    : createDialogProviderOptions()
  const enabledProviders = createMemo(() =>
    frameworkMode
      ? sync.data.provider.filter((provider) => isAgencySupportedProvider(provider.id))
      : sync.data.provider,
  )
  // Treat framework mode as "not connected" when no agency-supported provider is usable,
  // so the disconnected fallback (filtered popular providers) keeps `/models` actionable
  // instead of rendering an empty dialog.
  const connected = createMemo(() => rawConnected() && enabledProviders().length > 0)

  const showExtra = createMemo(() => connected() && !props.providerID)

  const options = createMemo(() => {
    const needle = query().trim()
    const showSections = showExtra() && needle.length === 0
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()
    const label = (providerID: string, modelID: string, fallback: string) => {
      if (!frameworkMode) return fallback
      const options = agencyOptions()
      return resolveModelLabel({
        providers: sync.data.provider,
        agencies: discovery(),
        agencyID: options.agency,
        allowSingleAgency: !options.agency,
        agentID: options.recipientAgent,
        providerID,
        modelID,
        fallback,
        scope: options.recipientAgent ? "agent" : "agency",
      })
    }

    function toOptions(items: typeof favorites, category: string) {
      if (!showSections) return []
      return items.flatMap((item) => {
        const provider = enabledProviders().find((x) => x.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        return [
          {
            key: item,
            value: { providerID: provider.id, modelID: model.id },
            title: label(provider.id, model.id, model.name ?? item.modelID),
            description: provider.name,
            category,
            disabled: provider.id === "opencode" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 && provider.id === "opencode" ? "Free" : undefined,
            onSelect: () => {
              void onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter(
        (item) => !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID),
      ),
      "Recent",
    )

    const providerOptions = pipe(
      enabledProviders(),
      sortBy(
        (provider) => provider.id !== "opencode",
        (provider) => provider.name,
      ),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => (props.providerID ? info.providerID === props.providerID : true)),
          map(([model, info]) => ({
            value: { providerID: provider.id, modelID: model },
            title: label(provider.id, model, info.name ?? model),
            description: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
              ? "(Favorite)"
              : undefined,
            category: connected() ? provider.name : undefined,
            disabled: provider.id === "opencode" && model.includes("-nano"),
            footer: info.cost?.input === 0 && provider.id === "opencode" ? "Free" : undefined,
            onSelect() {
              void onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            if (!showSections) return true
            if (favorites.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            if (recents.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            return true
          }),
          sortBy(
            (x) => x.footer !== "Free",
            (x) => x.title,
          ),
        ),
      ),
    )

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    if (needle) {
      return [
        ...fuzzysort.go(needle, providerOptions, { keys: ["title", "category"] }).map((x) => x.obj),
        ...fuzzysort.go(needle, popularProviders, { keys: ["title"] }).map((x) => x.obj),
      ]
    }

    return [...favoriteOptions, ...recentOptions, ...providerOptions, ...popularProviders]
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((x) => x.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return "Select model"
    return value.name
  })

  async function onSelect(providerID: string, modelID: string) {
    if (frameworkMode && providerID === AgencySwarmOllama.PROVIDER_ID) {
      try {
        await AgencySwarmOllama.ensure(modelID, {
          onServerStart() {
            toast.show({
              variant: "info",
              message: "Starting Ollama server...",
              duration: 5000,
            })
          },
        })
      } catch (error) {
        if (AgencySwarmOllama.isMissingModelError(error)) {
          const downloaded = await downloadOllamaModel({
            dialog,
            toast,
            modelID,
          })
          if (!downloaded) return
        } else {
          toast.show({
            variant: "warning",
            message: error instanceof Error ? error.message : String(error),
            duration: 8000,
          })
          return
        }
      }
      try {
        await AgencySwarmOllama.ensure(modelID)
      } catch (error) {
        toast.show({
          variant: "warning",
          message: AgencySwarmOllama.isMissingModelError(error)
            ? AgencySwarmOllama.formatMissingModelInstallHint(modelID)
            : error instanceof Error
              ? error.message
              : String(error),
          duration: 8000,
        })
        return
      }
    }
    local.model.set({ providerID, modelID }, { recent: true, explicit: true })
    const list = local.model.variant.list()
    const cur = local.model.variant.selected()
    if (cur === "default" || (cur && list.includes(cur))) {
      dialog.clear()
      return
    }
    if (list.length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  return (
    <DialogSelect<ReturnType<typeof options>[number]["value"]>
      options={options()}
      actions={[
        {
          title: frameworkMode ? "Manage provider auth" : connected() ? "Connect provider" : "View all providers",
          command: "model.dialog.provider",
          onTrigger() {
            dialog.replace(() => (frameworkMode ? <DialogAuth /> : <DialogProvider />))
          },
        },
        {
          command: "model.dialog.favorite",
          title: "Favorite",
          disabled: !connected(),
          onTrigger: (option) => {
            local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
          },
        },
      ]}
      onFilter={setQuery}
      flat={true}
      skipFilter={true}
      title={title()}
      current={local.model.current()}
    />
  )
}
