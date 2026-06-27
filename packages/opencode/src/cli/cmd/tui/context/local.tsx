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
import type { Part } from "@opencode-ai/sdk/v2"
import { isAgencySupportedProvider } from "../session-error"

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
const AGENCY_SWARM_BRIDGE_METADATA_KEY = "agencySwarmBridge"

function isProviderEnabled(input: { providerID: string; enabledProviders?: string[]; disabledProviders?: string[] }) {
  if (input.enabledProviders && !input.enabledProviders.includes(input.providerID)) return false
  if (input.disabledProviders?.includes(input.providerID)) return false
  return true
}

export function inferProductMode(input: {
  storedMode?: ProductMode
  storedModel?: StoredModelSelection
  storedBridge?: boolean
  agentName?: string
  currentProviderID?: string
  configuredModel?: string
  hasAgencySwarmProvider?: boolean
  enabledProviders?: string[]
  disabledProviders?: string[]
  argModel?: string
  agentModel?: ModelSelection
}) {
  const agencySwarmEnabled = isProviderEnabled({
    providerID: AgencySwarmAdapter.PROVIDER_ID,
    enabledProviders: input.enabledProviders,
    disabledProviders: input.disabledProviders,
  })
  if (input.storedMode === "plan" && input.agentName && input.agentName !== "plan") return "build"
  if (input.storedMode) return input.storedMode
  if (input.storedBridge === true) return agencySwarmEnabled ? "run" : "build"
  if (input.agentName === "plan") return "plan"
  if (input.storedBridge === false) return "build"
  if (
    input.agentName === "build" &&
    !input.argModel &&
    input.storedModel &&
    input.currentProviderID &&
    input.currentProviderID !== AgencySwarmAdapter.PROVIDER_ID
  ) {
    return "build"
  }
  if (input.hasAgencySwarmProvider && agencySwarmEnabled) return "run"
  if (
    agencySwarmEnabled &&
    isAgencySwarmRunMode({
      argModel: input.argModel,
      currentProviderID: input.currentProviderID,
      configuredModel: input.configuredModel,
      agentModel: input.agentModel,
    })
  ) {
    return "run"
  }
  return "build"
}

export function readAgencySwarmBridge(parts: Part[] | undefined) {
  for (const part of parts ?? []) {
    if (part.type !== "text" && part.type !== "subtask" && part.type !== "compaction") continue
    const value = part.metadata?.[AGENCY_SWARM_BRIDGE_METADATA_KEY]
    if (typeof value === "boolean") return value
  }
}

type SessionBridgeMessage = {
  id: string
  role: "user" | "assistant"
  parentID?: string
  providerID?: string
}

export function readSessionAgencySwarmBridge(input: {
  messages: SessionBridgeMessage[]
  parts: Record<string, Part[] | undefined>
}) {
  const children = new Map<string, boolean>()
  for (const item of input.messages) {
    if (item.role !== "assistant" || !item.parentID) continue
    children.set(item.parentID, item.providerID === AgencySwarmAdapter.PROVIDER_ID)
  }
  for (let index = input.messages.length - 1; index >= 0; index--) {
    const message = input.messages[index]
    if (!message || message.role !== "user") continue
    const bridge = readAgencySwarmBridge(input.parts[message.id])
    if (bridge !== undefined) return bridge
    const child = children.get(message.id)
    if (child !== undefined) return child
  }
}

function isAllowedProductModel(input: { model: ModelSelection; productMode?: ProductMode }) {
  if (input.productMode === "run") return isAgencySupportedProvider(input.model.providerID)
  if (input.productMode !== "build" && input.productMode !== "plan") return true
  return input.model.providerID !== AgencySwarmAdapter.PROVIDER_ID
}

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
  if (!isAllowedProductModel(input)) return false
  if (
    !isProviderEnabled({
      providerID: input.model.providerID,
      enabledProviders: input.enabledProviders,
      disabledProviders: input.disabledProviders,
    })
  ) {
    return false
  }
  const provider = input.providers.find((x) => x.id === input.model.providerID)
  if (provider?.models[input.model.modelID]) return true
  if (input.model.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  if (input.model.modelID !== AgencySwarmAdapter.DEFAULT_MODEL_ID) return false
  if (input.productMode === "run") return true
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
  storedMode?: ProductMode
  storedBridge?: boolean
  agentName?: string
  currentProviderID?: string
  hasAgencySwarmProvider?: boolean
}) {
  const hasProductModeContext =
    input.storedMode !== undefined ||
    input.storedBridge !== undefined ||
    input.agentName !== undefined ||
    input.currentProviderID !== undefined ||
    input.hasAgencySwarmProvider !== undefined
  const productMode =
    input.productMode ??
    (hasProductModeContext
      ? inferProductMode({
          storedMode: input.storedMode,
          storedModel: input.storedModel,
          storedBridge: input.storedBridge,
          agentName: input.agentName,
          currentProviderID: input.currentProviderID ?? input.storedModel?.providerID ?? input.agentModel?.providerID,
          configuredModel: input.configModel,
          hasAgencySwarmProvider: input.hasAgencySwarmProvider,
          enabledProviders: input.enabledProviders,
          disabledProviders: input.disabledProviders,
          argModel: input.argModel,
          agentModel: input.agentModel,
        })
      : undefined)

  function isModelValid(model: ModelSelection) {
    return isUsableModel({
      model,
      providers: input.providers,
      argModel: input.argModel,
      configModel: input.configModel,
      configuredProviders: input.configuredProviders,
      enabledProviders: input.enabledProviders,
      disabledProviders: input.disabledProviders,
      productMode,
    })
  }

  function getFirstValidModel(...modelFns: (() => ModelSelection | undefined)[]) {
    for (const modelFn of modelFns) {
      const model = modelFn()
      if (!model) continue
      if (!isAllowedProductModel({ model, productMode })) continue
      if (isModelValid(model)) return { providerID: model.providerID, modelID: model.modelID }
    }
  }

  const fallbackModel = () => {
    if (input.argModel) {
      const { providerID, modelID } = Provider.parseModel(input.argModel)
      if (
        isAllowedProductModel({ model: { providerID, modelID }, productMode }) &&
        isModelValid({ providerID, modelID })
      ) {
        return {
          providerID,
          modelID,
        }
      }
    }

    if (input.configModel) {
      const { providerID, modelID } = Provider.parseModel(input.configModel)
      if (
        isAllowedProductModel({ model: { providerID, modelID }, productMode }) &&
        isModelValid({ providerID, modelID })
      ) {
        return {
          providerID,
          modelID,
        }
      }
    }

    for (const item of input.recentModels ?? []) {
      if (isAllowedProductModel({ model: item, productMode }) && isModelValid(item)) {
        return item
      }
    }

    for (const provider of input.providers) {
      const firstModel = Object.values(provider.models)[0] as { id?: string } | undefined
      for (const model of [input.providerDefaults?.[provider.id], firstModel?.id]) {
        if (!model) continue
        const item = {
          providerID: provider.id,
          modelID: model,
        }
        if (isModelValid(item)) return item
      }
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

  if (
    productMode !== "build" &&
    productMode !== "plan" &&
    shouldPreferConfiguredAgencySwarmModel(input) &&
    !input.storedModel?.explicit
  ) {
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
    const route = useRoute()
    const [productStore, setProductStore] = createStore<{
      mode: ProductMode | undefined
      sessionID: string | undefined
    }>({
      mode: undefined,
      sessionID: undefined,
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
        productMode: currentStoredMode(),
      })
    }

    function isModelValidForMode(model: ModelSelection, mode: ProductMode) {
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
        productMode: mode,
      })
    }

    function showInvalidModelToast(model: ModelSelection) {
      toast.show({
        message: `Model ${model.providerID}/${model.modelID} is not valid`,
        variant: "warning",
        duration: 3000,
      })
    }

    const agent = iife(() => {
      const agents = createMemo(() => sync.data.agent.filter((x) => x.mode !== "subagent" && !x.hidden))
      const visibleAgents = createMemo(() => sync.data.agent.filter((x) => !x.hidden))
      const [agentStore, setAgentStore] = createStore({
        current: undefined as string | undefined,
        sessionID: undefined as string | undefined,
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
          setAgentStore("sessionID", currentSessionID())
        },
        sessionID() {
          return agentStore.sessionID
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
            setAgentStore("sessionID", currentSessionID())
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
        const agentName = currentModelAgentName(a)
        const selectedAgent = agent.list().find((item) => item.name === agentName) ?? a
        return selectCurrentModel({
          storedModel: modelStore.model[agentName],
          agentModel: selectedAgent.model,
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
          storedMode: currentStoredMode(),
          storedBridge: currentSessionAgencySwarmBridge(),
          agentName,
          hasAgencySwarmProvider: !!sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
        })
      })

      function preserveRunMode(a: { name: string; model?: ModelSelection }, current?: ModelSelection) {
        const mode = inferProductMode({
          storedMode: currentStoredMode(),
          storedModel: modelStore.model[a.name],
          storedBridge: currentSessionAgencySwarmBridge(),
          agentName: a.name,
          currentProviderID: current?.providerID,
          configuredModel: sync.data.config.model,
          hasAgencySwarmProvider: !!sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
          enabledProviders: sync.data.config.enabled_providers,
          disabledProviders: sync.data.config.disabled_providers,
          argModel: args.model,
          agentModel: a.model,
        })
        if (mode === "run") setProductMode("run")
      }

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
          const recent = modelStore.recent.filter((item) => isModelValidForMode(item, product.current()))
          const index = recent.findIndex((x) => x.providerID === current.providerID && x.modelID === current.modelID)
          if (index === -1) return
          let next = index + direction
          if (next < 0) next = recent.length - 1
          if (next >= recent.length) next = 0
          const val = recent[next]
          if (!val) return
          const a = agent.current()
          if (!a) return
          preserveRunMode(a, current)
          setModelStore("model", modelStoreKey(a), { ...val, explicit: true })
        },
        cycleFavorite(direction: 1 | -1) {
          const favorites = modelStore.favorite.filter((item) => isModelValidForMode(item, product.current()))
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
          preserveRunMode(a, current)
          setModelStore("model", modelStoreKey(a), { ...next, explicit: true })
          const uniq = uniqueBy([next, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
          if (uniq.length > 10) uniq.pop()
          setModelStore(
            "recent",
            uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
          )
          save()
        },
        set(model: ModelSelection, options?: { recent?: boolean; explicit?: boolean; preserveRun?: boolean }) {
          batch(() => {
            if (!isModelValid(model)) {
              showInvalidModelToast(model)
              return
            }
            const a = agent.current()
            if (!a) return
            if (options?.preserveRun) {
              setProductMode("run")
              agent.set("build")
            }
            setModelStore("model", modelStoreKey(a), { ...model, explicit: options?.explicit })
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
              showInvalidModelToast(model)
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

    function currentSessionUserMessage() {
      if (route.data.type !== "session") return undefined
      return sync.data.message[route.data.sessionID]?.findLast((item) => item.role === "user")
    }

    function currentSessionAgencySwarmBridge() {
      if (route.data.type !== "session") return undefined
      return readSessionAgencySwarmBridge({
        messages: sync.data.message[route.data.sessionID] ?? [],
        parts: sync.data.part,
      })
    }

    function currentSessionID() {
      return route.data.type === "session" ? route.data.sessionID : undefined
    }

    function currentStoredMode() {
      const sessionID = currentSessionID()
      if (!sessionID) return productStore.mode
      if (productStore.sessionID !== sessionID) return undefined
      return productStore.mode
    }

    function setProductMode(mode: ProductMode) {
      batch(() => {
        setProductStore("mode", mode)
        setProductStore("sessionID", currentSessionID())
      })
    }

    function currentModelAgentName(current: { name: string }) {
      const mode = currentStoredMode()
      if (mode === "run") return "build"
      if (mode === "build" || mode === "plan") return current.name
      if (agent.sessionID() === currentSessionID()) return current.name
      return currentSessionUserMessage()?.agent ?? current.name
    }

    function modelStoreKey(current: { name: string }) {
      return currentModelAgentName(current)
    }

    const product = {
      current(): ProductMode {
        const value = model.current()
        const current = agent.current()
        const agentName = current ? currentModelAgentName(current) : currentSessionUserMessage()?.agent
        const selectedAgent = agent.list().find((item) => item.name === agentName) ?? current
        return inferProductMode({
          storedMode: currentStoredMode(),
          storedModel: agentName ? model.override(agentName) : undefined,
          storedBridge: currentSessionAgencySwarmBridge(),
          agentName,
          currentProviderID: value?.providerID,
          configuredModel: sync.data.config.model,
          hasAgencySwarmProvider: !!sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
          enabledProviders: sync.data.config.enabled_providers,
          disabledProviders: sync.data.config.disabled_providers,
          argModel: args.model,
          agentModel: selectedAgent?.model,
        })
      },
      async set(mode: ProductMode) {
        if (mode === "build" || mode === "plan") {
          const currentAgent = agent.current()
          const currentOverride = currentAgent ? model.override(currentAgent.name) : undefined
          const currentModel = model.current()
          setProductMode(mode)
          agent.set(mode)
          if (!currentOverride?.explicit) return
          if (!currentModel || currentModel.providerID === AgencySwarmAdapter.PROVIDER_ID) return
          model.set(currentModel, { explicit: true })
          return
        }
        const bridge = {
          providerID: AgencySwarmAdapter.PROVIDER_ID,
          modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
        }
        if (!isModelValidForMode(bridge, "run")) {
          showInvalidModelToast(bridge)
          return
        }
        const current = model.override("build")
        const value =
          current?.explicit && isModelValidForMode(current, "run")
            ? { providerID: current.providerID, modelID: current.modelID }
            : bridge
        setProductMode(mode)
        agent.set("build")
        model.set(value, { explicit: true })
      },
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
