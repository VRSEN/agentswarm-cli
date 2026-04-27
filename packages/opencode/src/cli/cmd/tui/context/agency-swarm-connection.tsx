import { createMemo, createEffect, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { Log } from "@/util"
import { createSimpleContext } from "./helper"
import { useLocal } from "./local"
import { useSync } from "./sync"
import { useDialog } from "@tui/ui/dialog"
import { DialogAgencySwarmConnect } from "../component/dialog-provider"
import { isAgencySwarmFrameworkMode } from "../session-error"

export const AGENCY_SWARM_HEALTH_FAILURE_THRESHOLD = 2
export const AGENCY_SWARM_HEALTH_IDLE_INTERVAL_MS = 5_000
export const AGENCY_SWARM_HEALTH_RECOVERED_INTERVAL_MS = 15_000

const log = Log.create({ service: "tui.agency-swarm-connection" })

type AgencySwarmConfig = {
  baseURL: string
  token?: string
  timeoutMs: number
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type AgencySwarmConnectionState = {
  active: boolean
  baseURL?: string
  status: "idle" | "connected" | "disconnected"
  failureCount: number
  recoveredOnce: boolean
  lastError?: string
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

export function resolveAgencySwarmConnectionConfig(input: {
  configured?: {
    options?: unknown
  }
  connected?: {
    key?: string
  }
}) {
  const options =
    input.configured?.options && typeof input.configured.options === "object"
      ? (input.configured.options as Record<string, unknown>)
      : {}
  const baseURL = AgencySwarmAdapter.normalizeBaseURL(
    readString(options["baseURL"]) ?? readString(options["base_url"]) ?? AgencySwarmAdapter.DEFAULT_BASE_URL,
  )
  const timeoutMs =
    readPositiveNumber(options["discoveryTimeoutMs"]) ??
    readPositiveNumber(options["discovery_timeout_ms"]) ??
    AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS
  const configToken = readString(options["token"])
  const token = readString(input.connected?.key) ?? configToken

  return {
    baseURL,
    timeoutMs,
    token,
  } satisfies AgencySwarmConfig
}

export function createAgencySwarmConnectionMonitor(input: {
  frameworkMode: () => boolean
  config: () => AgencySwarmConfig | undefined
  openConnectDialog: () => boolean
  fetchImpl?: Fetcher
  failureThreshold?: number
  idleIntervalMs?: number
  recoveredIntervalMs?: number
}) {
  const fetchImpl: Fetcher = input.fetchImpl ?? fetch
  const failureThreshold = input.failureThreshold ?? AGENCY_SWARM_HEALTH_FAILURE_THRESHOLD
  const idleIntervalMs = input.idleIntervalMs ?? AGENCY_SWARM_HEALTH_IDLE_INTERVAL_MS
  const recoveredIntervalMs = input.recoveredIntervalMs ?? AGENCY_SWARM_HEALTH_RECOVERED_INTERVAL_MS

  const [store, setStore] = createStore<AgencySwarmConnectionState>({
    active: false,
    baseURL: undefined,
    status: "idle",
    failureCount: 0,
    recoveredOnce: false,
    lastError: undefined,
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let dialogShownForBaseURL: string | undefined

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = undefined
  }

  const openConnectDialog = () => {
    if (!input.openConnectDialog()) {
      log.error("agency-swarm reconnect dialog could not open while the bridge was unhealthy", {
        baseURL: store.baseURL,
        failureCount: store.failureCount,
        lastError: store.lastError,
      })
      return
    }
    const baseURL = store.baseURL
    if (baseURL) dialogShownForBaseURL = baseURL
  }

  createEffect(() => {
    const enabled = input.frameworkMode()
    const config = enabled ? input.config() : undefined
    generation += 1
    const currentGeneration = generation

    clearTimer()

    if (!enabled || !config) {
      if (enabled && !config) {
        log.error("agency-swarm framework mode is active but no bridge config is available", {
          baseURL: store.baseURL,
        })
      }
      dialogShownForBaseURL = undefined
      setStore({
        active: false,
        baseURL: undefined,
        status: "idle",
        failureCount: 0,
        lastError: undefined,
      })
      return
    }

    if (store.baseURL !== config.baseURL) {
      const recovered = store.recoveredOnce || store.status === "disconnected" || store.failureCount > 0
      dialogShownForBaseURL = undefined
      setStore({
        active: true,
        baseURL: config.baseURL,
        status: "connected",
        failureCount: 0,
        recoveredOnce: recovered,
        lastError: undefined,
      })
    } else {
      setStore({
        active: true,
        baseURL: config.baseURL,
      })
    }

    const schedule = () => {
      const intervalMs = store.recoveredOnce ? recoveredIntervalMs : idleIntervalMs
      clearTimer()
      timer = setTimeout(() => {
        void ping()
      }, intervalMs)
    }

    const ping = async () => {
      try {
        const response = await fetchImpl(AgencySwarmAdapter.joinURL(config.baseURL, "openapi.json"), {
          method: "GET",
          headers: config.token ? { Authorization: `Bearer ${config.token}` } : undefined,
          signal: AbortSignal.timeout(config.timeoutMs),
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        if (currentGeneration !== generation) return

        const recovered = store.recoveredOnce || store.status === "disconnected" || store.failureCount > 0
        dialogShownForBaseURL = undefined
        setStore({
          active: true,
          baseURL: config.baseURL,
          status: "connected",
          failureCount: 0,
          recoveredOnce: recovered,
          lastError: undefined,
        })
      } catch (error) {
        if (currentGeneration !== generation) return

        const failureCount = store.baseURL === config.baseURL ? store.failureCount + 1 : 1
        const disconnected = failureCount >= failureThreshold
        const lastError = error instanceof Error ? error.message : String(error)

        setStore({
          active: true,
          baseURL: config.baseURL,
          status: disconnected ? "disconnected" : "connected",
          failureCount,
          lastError,
        })

        if (disconnected && dialogShownForBaseURL !== config.baseURL) {
          log.error("agency-swarm bridge marked disconnected after repeated health-check failures", {
            baseURL: config.baseURL,
            failureCount,
            lastError,
          })
          openConnectDialog()
        }
      } finally {
        if (currentGeneration !== generation) return
        schedule()
      }
    }

    void ping()
  })

  onCleanup(() => {
    clearTimer()
  })

  return {
    status: createMemo(() => store.status),
    requiresReconnect: createMemo(() => store.active && store.status === "disconnected"),
    baseURL: createMemo(() => store.baseURL),
    failureCount: createMemo(() => store.failureCount),
    openConnectDialog,
  }
}

export const { use: useAgencySwarmConnection, provider: AgencySwarmConnectionProvider } = createSimpleContext({
  name: "AgencySwarmConnection",
  init: () => {
    const dialog = useDialog()
    const local = useLocal()
    const sync = useSync()

    const frameworkMode = createMemo(() =>
      isAgencySwarmFrameworkMode({
        currentProviderID: local.model.current()?.providerID,
        configuredModel: sync.data.config.model,
        agentModel: local.agent.current()?.model,
      }),
    )

    const config = createMemo(() => {
      const connected = sync.data.provider.find((provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID)
      const configured = sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID]
      if (!configured && !connected) return undefined
      return resolveAgencySwarmConnectionConfig({
        configured,
        connected,
      })
    })

    const monitor = createAgencySwarmConnectionMonitor({
      frameworkMode,
      config,
      openConnectDialog: () => {
        if (dialog.stack.length > 0) return false
        dialog.replace(() => <DialogAgencySwarmConnect />)
        return true
      },
    })

    return {
      ...monitor,
      frameworkMode,
    }
  },
})
