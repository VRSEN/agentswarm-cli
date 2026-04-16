import { createStore } from "solid-js/store"
import { batch, createEffect, createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { uniqueBy } from "remeda"
import path from "path"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { Global } from "@/global"
import { iife } from "@/util/iife"
import { createSimpleContext } from "./helper"
import { useToast } from "../ui/toast"
import { Provider } from "@/provider/provider"
import { useArgs } from "./args"
import { useSDK } from "./sdk"
import { RGBA } from "@opentui/core"
import { Filesystem } from "@/util/filesystem"

export function isUsableModel(input: {
  model: {
    providerID: string
    modelID: string
  }
  providers: {
    id: string
    models: Record<string, unknown>
  }[]
  argModel?: string
  configModel?: string
  configuredProviders?: Record<string, unknown>
}) {
  const provider = input.providers.find((x) => x.id === input.model.providerID)
  if (provider?.models[input.model.modelID]) return true
  if (input.model.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  if (input.model.modelID !== AgencySwarmAdapter.DEFAULT_MODEL_ID) return false
  const selectedAgencySwarmModel = [input.argModel, input.configModel].some(
    (value) => value === `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
  )
  if (!selectedAgencySwarmModel) return false
  return !!input.configuredProviders?.[AgencySwarmAdapter.PROVIDER_ID]
}

export function selectCurrentModel(input: {
  storedModel?: {
    providerID: string
    modelID: string
  }
  agentModel?: {
    providerID: string
    modelID: string
  }
  recentModels?: {
    providerID: string
    modelID: string
  }[]
  providers: {
    id: string
    models: Record<string, unknown>
  }[]
  providerDefaults?: Record<string, string>
  argModel?: string
  configModel?: string
  configuredProviders?: Record<string, unknown>
}) {
  function isModelValid(model: { providerID: string; modelID: string }) {
    return isUsableModel({
      model,
      providers: input.providers,
      argModel: input.argModel,
      configModel: input.configModel,
      configuredProviders: input.configuredProviders,
    })
  }

  function getFirstValidModel(...modelFns: (() => { providerID: string; modelID: string } | undefined)[]) {
    for (const modelFn of modelFns) {
      const model = modelFn()
      if (!model) continue
      if (isModelValid(model)) return model
    }
  }

  const fallbackModel = () => {
    if (input.argModel) {
      const { providerID, modelID } = Provider.parseModel(input.argModel)
      if (isModelValid({ providerID, modelID })) {
        return {
          providerID,
          modelID,
        }
      }
    }

    if (input.configModel) {
      const { providerID, modelID } = Provider.parseModel(input.configModel)
      if (isModelValid({ providerID, modelID })) {
        return {
          providerID,
          modelID,
        }
      }
    }

    for (const item of input.recentModels ?? []) {
      if (isModelValid(item)) {
        return item
      }
    }

    const provider = input.providers[0]
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

  if (shouldPreferConfiguredAgencySwarmModel(input) && !input.storedModel) {
    return getFirstValidModel(
      fallbackModel,
      () => input.agentModel,
    )
  }

  return getFirstValidModel(
    () => input.storedModel,
    () => input.agentModel,
    fallbackModel,
  )
}

export const { use: useLocal, provider: LocalProvider } = createSimpleContext({
  name: "Local",
  init: () => {
    const sync = useSync()
    const sdk = useSDK()
    const toast = useToast()
    const args = useArgs()

    function isModelValid(model: { providerID: string; modelID: string }) {
      return isUsableModel({
        model,
        providers: sync.data.provider.map((item) => ({
          id: item.id,
          models: item.models,
        })),
        argModel: args.model,
        configModel: sync.data.config.model,
        configuredProviders: sync.data.config.provider,
      })
    }

    const agent = iife(() => {
      const agents = createMemo(() => sync.data.agent.filter((x) => x.mode !== "subagent" && !x.hidden))
      const visibleAgents = createMemo(() => sync.data.agent.filter((x) => !x.hidden))
      const [agentStore, setAgentStore] = createStore<{
        current: string
      }>({
        current: agents()[0].name,
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
          return agents().find((x) => x.name === agentStore.current) ?? agents()[0]
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
            let next = agents().findIndex((x) => x.name === agentStore.current) + direction
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
        model: Record<
          string,
          {
            providerID: string
            modelID: string
          }
        >
        recent: {
          providerID: string
          modelID: string
        }[]
        favorite: {
          providerID: string
          modelID: string
        }[]
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
        Filesystem.writeJson(filePath, {
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
        })
      })

      return {
        current: currentModel,
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
          setModelStore("model", agent.current().name, { ...val })
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
          setModelStore("model", agent.current().name, { ...next })
          const uniq = uniqueBy([next, ...modelStore.recent], (x) => `${x.providerID}/${x.modelID}`)
          if (uniq.length > 10) uniq.pop()
          setModelStore(
            "recent",
            uniq.map((x) => ({ providerID: x.providerID, modelID: x.modelID })),
          )
          save()
        },
        set(model: { providerID: string; modelID: string }, options?: { recent?: boolean }) {
          batch(() => {
            if (!isModelValid(model)) {
              toast.show({
                message: `Model ${model.providerID}/${model.modelID} is not valid`,
                variant: "warning",
                duration: 3000,
              })
              return
            }
            setModelStore("model", agent.current().name, model)
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
        toggleFavorite(model: { providerID: string; modelID: string }) {
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

    // Automatically update model when agent changes
    createEffect(() => {
      const value = agent.current()
      if (value.model) {
        if (isModelValid(value.model))
          model.set({
            providerID: value.model.providerID,
            modelID: value.model.modelID,
          })
        else
          toast.show({
            variant: "warning",
            message: `Agent ${value.name}'s configured model ${value.model.providerID}/${value.model.modelID} is not valid`,
            duration: 3000,
          })
      }
    })

    const result = {
      model,
      agent,
      mcp,
    }
    return result
  },
})

function shouldPreferConfiguredAgencySwarmModel(input: { argModel?: string; configModel?: string }) {
  const model = input.argModel ?? input.configModel
  return model === `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`
}
