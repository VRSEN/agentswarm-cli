import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import { batch, createEffect, createMemo, on } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useRoute } from "@tui/context/route"
import { useEvent } from "@tui/context/event"
import { uniqueBy } from "remeda"
import path from "path"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { isAgencySwarmModel, isAgencySwarmRunMode } from "@/agency-swarm/run-mode"
import { Global } from "@opencode-ai/core/global"
import { Flag } from "@opencode-ai/core/flag/flag"
import { iife } from "@/util/iife"
import { useToast } from "../ui/toast"
import { useArgs } from "./args"
import { useSDK } from "./sdk"
import { RGBA } from "@opentui/core"
import { Provider } from "@/provider/provider"
import { Filesystem } from "@/util/filesystem"

export function parseModel(model: string) {
  const [providerID, ...rest] = model.split("/")
  return {
    providerID: providerID,
    modelID: rest.join("/"),
  }
}

type ModelSelection = {
  providerID: string
  modelID: string
}

type StoredModelSelection = ModelSelection & {
  explicit?: boolean
}

export type ProductMode = "build" | "plan" | "run"

export function isUsableModel(input: {
  model: ModelSelection
  providers: {
    id: string
    models: Record<string, unknown>
  }[]
  argModel?: string
  configModel?: string
  configuredProviders?: Record<string, unknown>
  enabledProviders?: string[]
  disabledProviders?: string[]
  productMode?: ProductMode
}) {
  const provider = input.providers.find((x) => x.id === input.model.providerID)
  if (provider?.models[input.model.modelID]) return true
  if (input.model.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  if (input.model.modelID !== AgencySwarmAdapter.DEFAULT_MODEL_ID) return false
  if (input.enabledProviders && !input.enabledProviders.includes(AgencySwarmAdapter.PROVIDER_ID)) return false
  if (input.disabledProviders?.includes(AgencySwarmAdapter.PROVIDER_ID)) return false
  const selectedAgencySwarmModel = [input.argModel, input.configModel].some(
    (value) => value === `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
  )
  if (!selectedAgencySwarmModel) return false
  return true
}

export function selectCurrentModel(input: {
  storedModel?: StoredModelSelection
  agentModel?: ModelSelection
  recentModels?: ModelSelection[]
  providers: {
    id: string
    models: Record<string, unknown>
  }[]
  providerDefaults?: Record<string, string>
  argModel?: string
  configModel?: string
  configuredProviders?: Record<string, unknown>
  enabledProviders?: string[]
  disabledProviders?: string[]
  productMode?: ProductMode
}) {
  function isModelValid(model: ModelSelection) {
    return isUsableModel({
      model,
      providers: input.providers,
      argModel: input.argModel,
      configModel: input.configModel,
      configuredProviders: input.configuredProviders,
      enabledProviders: input.enabledProviders,
      disabledProviders: input.disabledProviders,
    })
  }

  function isAllowedProductModel(model: ModelSelection) {
    if (input.productMode !== "build" && input.productMode !== "plan") return true
    return model.providerID !== AgencySwarmAdapter.PROVIDER_ID
  }

  function getFirstValidModel(...modelFns: (() => ModelSelection | undefined)[]) {
    for (const modelFn of modelFns) {
      const model = modelFn()
      if (!model) continue
      if (!isAllowedProductModel(model)) continue
      if (isModelValid(model)) return { providerID: model.providerID, modelID: model.modelID }
    }
  }

  const fallbackModel = () => {
    if (input.argModel) {
      const { providerID, modelID } = Provider.parseModel(input.argModel)
      if (isAllowedProductModel({ providerID, modelID }) && isModelValid({ providerID, modelID })) {
        return {
          providerID,
          modelID,
        }
      }
    }

    if (input.configModel) {
      const { providerID, modelID } = Provider.parseModel(input.configModel)
      if (isAllowedProductModel({ providerID, modelID }) && isModelValid({ providerID, modelID })) {
        return {
          providerID,
          modelID,
        }
      }
    }

    for (const item of input.recentModels ?? []) {
      if (isAllowedProductModel(item) && isModelValid(item)) {
        return item
      }
    }

    const provider = input.providers.find((item) => {
      if (input.productMode !== "build" && input.productMode !== "plan") return true
      return item.id !== AgencySwarmAdapter.PROVIDER_ID
    })
    if (!provider) return undefined
    const defaultModel = input.providerDefaults?.[provider.id]
    const firstModel = Object.values(provider.models)[0] as { id?: string } | undefined
    const model = defaultModel ?? firstModel?.id
    if (!model) return undefined
    return {
      providerID: provider.id,
      modelID: model,
    }
  }

  const explicitArgModel = input.argModel ? Provider.parseModel(input.argModel) : undefined
  if (
    explicitArgModel &&
    explicitArgModel.providerID !== AgencySwarmAdapter.PROVIDER_ID &&
    isModelValid(explicitArgModel)
  ) {
    return explicitArgModel
  }

  if (shouldPreferConfiguredAgencySwarmModel(input) && !input.storedModel?.explicit) {
    return getFirstValidModel(fallbackModel, () => input.agentModel)
  }

  return getFirstValidModel(
    () => input.storedModel,
    () => input.agentModel,
    fallbackModel,
  )
}

export function shouldSyncAgentModel(input: {
  storedModel?: StoredModelSelection
  argModel?: string
  configModel?: string
}) {
  if (input.storedModel) return false
  if (shouldPreferConfiguredAgencySwarmModel(input)) return false
  return true
}

export const { use: useLocal, provider: LocalProvider } = createSimpleContext({
  name: "Local",
  init: () => {
    const sync = useSync()
    const sdk = useSDK()
    const toast = useToast()
    const args = useArgs()
    const [productStore, setProductStore] = createStore<{
      mode: ProductMode | undefined
    }>({
      mode: undefined,
    })

    function isModelValid(model: ModelSelection) {
      return isUsableModel({
        model,
        providers: sync.data.provider.map((item) => ({
          id: item.id,
          models: item.models,
        })),
        argModel: args.model,
        configModel: sync.data.config.model,
        configuredProviders: sync.data.config.provider,
        enabledProviders: sync.data.config.enabled_providers,
        disabledProviders: sync.data.config.disabled_providers,
      })
    }

    const agent = iife(() => {
      const agents = createMemo(() => sync.data.agent.filter((x) => x.mode !== "subagent" && !x.hidden))
      const visibleAgents = createMemo(() => sync.data.agent.filter((x) => !x.hidden))
      const [agentStore, setAgentStore] = createStore({
        current: undefined as string | undefined,
      })
      const { theme } = useTheme()
      const colors = createMemo(() => [
        theme.secondary,
        theme.accent,
        theme.success,
        theme.warning,
        theme.primary,
        theme.error,
        theme.info,
      ])
      return {
        list() {
          return agents()
        },
        current() {
          return agents().find((x) => x.name === agentStore.current) ?? agents().at(0)
        },
        set(name: string) {
          if (!agents().some((x) => x.name === name))
            return toast.show({
              variant: "warning",
              message: `Agent not found: ${name}`,
              duration: 3000,
            })
          setAgentStore("current", name)
        },
        move(direction: 1 | -1) {
          batch(() => {
            const current = this.current()
            if (!current) return
            let next = agents().findIndex((x) => x.name === current.name) + direction
            if (next < 0) next = agents().length - 1
            if (next >= agents().length) next = 0
            const value = agents()[next]
            setAgentStore("current", value.name)
          })
        },
        color(name: string) {
          const index = visibleAgents().findIndex((x) => x.name === name)
          if (index === -1) return colors()[0]
          const agent = visibleAgents()[index]

          if (agent?.color) {
            const color = agent.color
            if (color.startsWith("#")) return RGBA.fromHex(color)
            // already validated by config, just satisfying TS here
            return theme[color as keyof typeof theme] as RGBA
          }
          return colors()[index % colors().length]
        },
      }
    })

    const model = iife(() => {
      const [modelStore, setModelStore] = createStore<{
        ready: boolean
        model: Record<string, StoredModelSelection>
        recent: ModelSelection[]
        favorite: ModelSelection[]
        variant: Record<string, string | undefined>
      }>({
        ready: false,
        model: {},
        recent: [],
        favorite: [],
        variant: {},
      })

      const filePath = path.join(Global.Path.state, "model.json")
      const state = {
        pending: false,
      }

      function save() {
        if (!modelStore.ready) {
          state.pending = true
          return
        }
        state.pending = false
        void Filesystem.writeJson(filePath, {
          recent: modelStore.recent,
          favorite: modelStore.favorite,
          variant: modelStore.variant,
        })
      }

      Filesystem.readJson(filePath)
        .then((x: any) => {
          if (Array.isArray(x.recent)) setModelStore("recent", x.recent)
          if (Array.isArray(x.favorite)) setModelStore("favorite", x.favorite)
          if (typeof x.variant === "object" && x.variant !== null) setModelStore("variant", x.variant)
        })
        .catch(() => {})
        .finally(() => {
          setModelStore("ready", true)
          if (state.pending) save()
        })

      const currentModel = createMemo(() => {
        const a = agent.current()
        if (!a) return
        return selectCurrentModel({
          storedModel: modelStore.model[a.name],
          agentModel: a.model,
          recentModels: modelStore.recent,
          providers: sync.data.provider.map((item) => ({
            id: item.id,
            models: item.models,
          })),
          providerDefaults: sync.data.provider_default,
          argModel: args.model,
          configModel: sync.data.config.model,
          configuredProviders: sync.data.config.provider,
          enabledProviders: sync.data.config.enabled_providers,
          disabledProviders: sync.data.config.disabled_providers,
          productMode: productStore.mode,
        })
      })

      return {
        current: currentModel,
        override(name: string) {
          return modelStore.model[name]
        },
        get ready() {
          return modelStore.ready
        },
        recent() {
          return modelStore.recent
        },
        favorite() {
          return modelStore.favorite
        },
        parsed: createMemo(() => {
          const value = currentModel()
          if (!value) {
            return {
              provider: "Connect a provider",
              model: "No provider selected",
              reasoning: false,
            }
          }
          const provider = sync.data.provider.find((x) => x.id === value.providerID)
          const info = provider?.models[value.modelID]
          return {
            provider: provider?.name ?? value.providerID,
            model: info?.name ?? value.modelID,
            reasoning: info?.capabilities?.reasoning ?? false,
          }
        }),
        cycle(direction: 1 | -1) {
          const current = currentModel()
          if (!current) return
          const recent = modelStore.recent
          const index = recent.findIndex((x) => x.providerID === current.providerID && x.modelID === current.modelID)
          if (index === -1) return
          let next = index + direction
          if (next < 0) next = recent.length - 1
          if (next >= recent.length) next = 0
          const val = recent[next]
          if (!val) return
          const a = agent.current()
          if (!a) return
          setModelStore("model", a.name, { ...val, explicit: true })
        },
        cycleFavorite(direction: 1 | -1) {
          const favorites = modelStore.favorite.filter((item) => isModelValid(item))
          if (!favorites.length) {
            toast.show({
              variant: "info",
              message: "Add a favorite model to use this shortcut",
              duration: 3000,
            })
            return
          }
          const current = currentModel()
          let index = -1
          if (current) {
            index = favorites.findIndex((x) => x.providerID === current.providerID && x.modelID === current.modelID)
          }
          if (index === -1) {
            index = direction === 1 ? 0 : favorites.length - 1
          } else {
            index += direction
            if (index < 0) index = favorites.length - 1
            if (index >= favorites.length) index = 0
          }
          const next = favorites[index]
          if (!next) return
          const a = agent.current()
          if (!a) return
          setModelStore("model", a.name, { ...next, explicit: true })
          const uniq = uniqueBy([next, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
          if (uniq.length > 10) uniq.pop()
          setModelStore(
            "recent",
            uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
          )
          save()
        },
        set(model: ModelSelection, options?: { recent?: boolean; explicit?: boolean }) {
          batch(() => {
            if (!isModelValid(model)) {
              toast.show({
                message: `Model ${model.providerID}/${model.modelID} is not valid`,
                variant: "warning",
                duration: 3000,
              })
              return
            }
            const a = agent.current()
            if (!a) return
            setModelStore("model", a.name, { ...model, explicit: options?.explicit })
            if (options?.recent) {
              const uniq = uniqueBy([model, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
              if (uniq.length > 10) uniq.pop()
              setModelStore(
                "recent",
                uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
              )
              save()
            }
          })
        },
        toggleFavorite(model: ModelSelection) {
          batch(() => {
            if (!isModelValid(model)) {
              toast.show({
                message: `Model ${model.providerID}/${model.modelID} is not valid`,
                variant: "warning",
                duration: 3000,
              })
              return
            }
            const exists = modelStore.favorite.some(
              (x) => x.providerID === model.providerID && x.modelID === model.modelID,
            )
            const next = exists
              ? modelStore.favorite.filter((x) => x.providerID !== model.providerID || x.modelID !== model.modelID)
              : [model, ...modelStore.favorite]
            setModelStore(
              "favorite",
              next.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
            )
            save()
          })
        },
        variant: {
          selected() {
            const m = currentModel()
            if (!m) return undefined
            const key = `${m.providerID}/${m.modelID}`
            return modelStore.variant[key]
          },
          current() {
            const v = this.selected()
            if (!v) return undefined
            if (!this.list().includes(v)) return undefined
            return v
          },
          list() {
            const m = currentModel()
            if (!m) return []
            const provider = sync.data.provider.find((x) => x.id === m.providerID)
            const info = provider?.models[m.modelID]
            if (!info?.variants) return []
            return Object.keys(info.variants)
          },
          set(value: string | undefined) {
            const m = currentModel()
            if (!m) return
            const key = `${m.providerID}/${m.modelID}`
            setModelStore("variant", key, value ?? "default")
            save()
          },
          cycle() {
            const variants = this.list()
            if (variants.length === 0) return
            const current = this.current()
            if (!current) {
              this.set(variants[0])
              return
            }
            const index = variants.indexOf(current)
            if (index === -1 || index === variants.length - 1) {
              this.set(undefined)
              return
            }
            this.set(variants[index + 1])
          },
        },
      }
    })

    const session = iife(() => {
      const [sessionStore, setSessionStore] = createStore<{
        ready: boolean
        pinned: string[]
        dismissedRecent: string[]
        recentOrder: string[]
      }>({
        ready: false,
        pinned: [],
        dismissedRecent: [],
        recentOrder: [],
      })

      const filePath = path.join(Global.Path.state, "session.json")
      const state = {
        pending: false,
      }

      function save() {
        if (!sessionStore.ready) {
          state.pending = true
          return
        }
        state.pending = false
        void Filesystem.writeJson(filePath, {
          pinned: sessionStore.pinned,
          dismissedRecent: sessionStore.dismissedRecent,
          recentOrder: sessionStore.recentOrder,
        })
      }

      Filesystem.readJson(filePath)
        .then((x: any) => {
          if (Array.isArray(x.pinned)) setSessionStore("pinned", x.pinned)
          if (Array.isArray(x.dismissedRecent)) setSessionStore("dismissedRecent", x.dismissedRecent)
          if (Array.isArray(x.recentOrder)) setSessionStore("recentOrder", x.recentOrder)
        })
        .catch(() => {})
        .finally(() => {
          setSessionStore("ready", true)
          if (state.pending) save()
        })

      const route = useRoute()
      const event = useEvent()
      let cycling = false

      const slots = createMemo(() => {
        const rootSessions = sync.data.session.filter((x) => x.parentID === undefined)
        const existing = new Set(rootSessions.map((x) => x.id))
        const dismissed = new Set(sessionStore.dismissedRecent)
        const pins = sessionStore.pinned.filter((id) => existing.has(id))
        const pinnedSet = new Set(pins)
        const recent = rootSessions
          .filter((x) => !pinnedSet.has(x.id) && !dismissed.has(x.id))
          .toSorted((a, b) => b.time.updated - a.time.updated)
          .map((x) => x.id)
        return [...pins, ...recent].slice(0, 9)
      })

      function prune(sessionID: string) {
        batch(() => {
          if (sessionStore.pinned.includes(sessionID)) {
            setSessionStore(
              "pinned",
              sessionStore.pinned.filter((x) => x !== sessionID),
            )
          }
          if (sessionStore.dismissedRecent.includes(sessionID)) {
            setSessionStore(
              "dismissedRecent",
              sessionStore.dismissedRecent.filter((x) => x !== sessionID),
            )
          }
          if (sessionStore.recentOrder.includes(sessionID)) {
            setSessionStore(
              "recentOrder",
              sessionStore.recentOrder.filter((x) => x !== sessionID),
            )
          }
          save()
        })
      }

      event.on("session.deleted", (evt) => {
        prune(evt.properties.info.id)
      })

      if (Flag.OPENCODE_EXPERIMENTAL_SESSION_SWITCHING) {
        createEffect(
          on(
            () => (sessionStore.ready && route.data.type === "session" ? route.data.sessionID : undefined),
            (sessionID) => {
              if (!sessionID) return
              if (cycling) {
                cycling = false
                return
              }
              const filtered = sessionStore.recentOrder.filter((x) => x !== sessionID)
              const next = [sessionID, ...filtered].slice(0, 20)
              setSessionStore("recentOrder", next)
              save()
            },
          ),
        )
      }

      return {
        get ready() {
          return sessionStore.ready
        },
        pinned() {
          return sessionStore.pinned
        },
        dismissedRecent() {
          return sessionStore.dismissedRecent
        },
        recentOrder() {
          return sessionStore.recentOrder
        },
        slots,
        isPinned(sessionID: string) {
          return sessionStore.pinned.includes(sessionID)
        },
        isDismissed(sessionID: string) {
          return sessionStore.dismissedRecent.includes(sessionID)
        },
        togglePin(sessionID: string) {
          batch(() => {
            const exists = sessionStore.pinned.includes(sessionID)
            const next = exists
              ? sessionStore.pinned.filter((x) => x !== sessionID)
              : [sessionID, ...sessionStore.pinned]
            setSessionStore("pinned", next)
            save()
          })
        },
        toggleRecent(sessionID: string) {
          batch(() => {
            const exists = sessionStore.dismissedRecent.includes(sessionID)
            const next = exists
              ? sessionStore.dismissedRecent.filter((x) => x !== sessionID)
              : [sessionID, ...sessionStore.dismissedRecent]
            setSessionStore("dismissedRecent", next)
            save()
          })
        },
        quickSwitch(slot: number) {
          const target = slots()[slot - 1]
          if (!target) return
          if (route.data.type === "session" && route.data.sessionID === target) return
          route.navigate({ type: "session", sessionID: target })
        },
        cycleRecent(direction: 1 | -1) {
          if (route.data.type !== "session") {
            toast.show({
              variant: "info",
              message: "Open a session first to cycle between recent sessions",
              duration: 3000,
            })
            return
          }
          const current = route.data.sessionID
          const order = sessionStore.recentOrder.filter((id) =>
            sync.data.session.some((s) => s.id === id && s.parentID === undefined),
          )
          if (order.length < 2) {
            toast.show({
              variant: "info",
              message: "No other recent sessions to cycle to",
              duration: 3000,
            })
            return
          }
          const index = order.indexOf(current)
          if (index === -1) return
          const next = index + direction
          if (next < 0 || next >= order.length) return
          const target = order[next]
          if (!target || target === current) return
          cycling = true
          route.navigate({ type: "session", sessionID: target })
        },
      }
    })

    const mcp = {
      isEnabled(name: string) {
        const status = sync.data.mcp[name]
        return status?.status === "connected"
      },
      async toggle(name: string) {
        const status = sync.data.mcp[name]
        if (status?.status === "connected") {
          // Disable: disconnect the MCP
          await sdk.client.mcp.disconnect({ name })
        } else {
          // Enable/Retry: connect the MCP (handles disabled, failed, and other states)
          await sdk.client.mcp.connect({ name })
        }
      },
    }

    // Current model already follows agent.model unless a local override exists.
    // Keep this effect only for invalid-model warnings while following agent config.
    createEffect(() => {
      const value = agent.current()
      if (!value) return
      if (
        !shouldSyncAgentModel({
          storedModel: model.override(value.name),
          argModel: args.model,
          configModel: sync.data.config.model,
        })
      ) {
        return
      }
      if (value.model && !isModelValid(value.model)) {
        toast.show({
          variant: "warning",
          message: `Agent ${value.name}'s configured model ${value.model.providerID}/${value.model.modelID} is not valid`,
          duration: 3000,
        })
      }
    })

    const product = {
      current(): ProductMode {
        if (productStore.mode) return productStore.mode
        if (
          isAgencySwarmRunMode({
            currentProviderID: model.current()?.providerID,
            configuredModel: sync.data.config.model,
            agentModel: agent.current()?.model,
          })
        ) {
          return "run"
        }
        return agent.current()?.name === "plan" ? "plan" : "build"
      },
      async set(mode: ProductMode) {
        setProductStore("mode", mode)
        if (mode === "build" || mode === "plan") {
          agent.set(mode)
          const value = model.current()
          if (!value || value.providerID === AgencySwarmAdapter.PROVIDER_ID) return
          model.set(value, { explicit: true })
          await updateConfigModel(value)
          return
        }
        const runModel = {
          providerID: AgencySwarmAdapter.PROVIDER_ID,
          modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
        }
        await updateConfigModel(runModel)
        model.set(runModel, { explicit: true })
      },
    }

    async function updateConfigModel(value: ModelSelection) {
      await sdk.client.global.config.update(
        {
          config: {
            model: `${value.providerID}/${value.modelID}`,
          },
        },
        {
          throwOnError: true,
        },
      )
      await sdk.client.instance.dispose()
      await sync.bootstrap()
    }

    const result = {
      model,
      agent,
      mcp,
      session,
      product,
    }
    return result
  },
})

function shouldPreferConfiguredAgencySwarmModel(input: { argModel?: string; configModel?: string }) {
  const model = input.argModel ?? input.configModel
  return (
    isAgencySwarmModel(model) && model === `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`
  )
}
