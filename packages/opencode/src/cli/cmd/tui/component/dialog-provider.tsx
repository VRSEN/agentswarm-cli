import { createMemo, createResource, onCleanup, onMount } from "solid-js"
import { useSync } from "@tui/context/sync"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { useToast } from "../ui/toast"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"

export function DialogProvider() {
  return <DialogAgencySwarmConnect />
}

type Option =
  | {
      kind: "server"
      baseURL: string
    }
  | {
      kind: "custom"
    }
  | {
      kind: "token"
    }
  | {
      kind: "clear_token"
    }
  | {
      kind: "status"
    }

function DialogAgencySwarmConnect() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()

  const cfg = createMemo(() => {
    const configured = sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID]
    const connected = sync.data.provider.find((item) => item.id === AgencySwarmAdapter.PROVIDER_ID)
    const options =
      configured?.options && typeof configured.options === "object"
        ? (configured.options as Record<string, unknown>)
        : {}
    const baseURL = AgencySwarmAdapter.normalizeBaseURL(
      readString(options["baseURL"]) ?? readString(options["base_url"]) ?? AgencySwarmAdapter.DEFAULT_BASE_URL,
    )
    const discoveryTimeoutMs =
      readPositiveNumber(options["discoveryTimeoutMs"]) ??
      readPositiveNumber(options["discovery_timeout_ms"]) ??
      AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS
    const localServers = normalizeLocalServers(
      readStringArray(options["localServers"] ?? options["local_servers"]).concat([baseURL]),
    )
    const configToken = readString(options["token"])
    const authToken = readString(connected?.key)

    return {
      configured,
      options,
      baseURL,
      localServers,
      discoveryTimeoutMs,
      configToken,
      token: authToken ?? configToken,
    }
  })

  const servers = createMemo(() =>
    normalizeLocalServers(["http://127.0.0.1:8000", "http://127.0.0.1:8080", ...cfg().localServers]),
  )

  const [status, { refetch }] = createResource(
    () => ({
      servers: servers(),
      token: cfg().token,
    }),
    async (input): Promise<Record<string, { available: boolean; agencies: string[]; error?: string }>> => {
      const checks = await Promise.all(
        input.servers.map(async (baseURL) => {
          try {
            const response = await fetch(AgencySwarmAdapter.joinURL(baseURL, "openapi.json"), {
              method: "GET",
              headers: input.token ? { Authorization: `Bearer ${input.token}` } : undefined,
              signal: AbortSignal.timeout(300),
            })
            if (!response.ok) {
              return [baseURL, { available: false, agencies: [], error: `HTTP ${response.status}` }] as const
            }
            const openapi = (await response.json()) as Record<string, unknown>
            const agencies = AgencySwarmAdapter.parseAgencyIDsFromOpenAPI(openapi)
            if (agencies.length === 0) {
              return [baseURL, { available: false, agencies, error: "No agencies found" }] as const
            }
            return [baseURL, { available: true, agencies }] as const
          } catch (error) {
            return [
              baseURL,
              {
                available: false,
                agencies: [],
                error: error instanceof Error ? error.message : String(error),
              },
            ] as const
          }
        }),
      )
      return Object.fromEntries(checks)
    },
    {
      initialValue: {},
    },
  )

  onMount(() => {
    void refetch()
    const timer = setInterval(() => {
      void refetch()
    }, 2000)
    onCleanup(() => clearInterval(timer))
  })

  const options = createMemo(() => {
    const map = status()
    const result: DialogSelectOption<Option>[] = servers().map((baseURL) => {
      const info = map[baseURL]
      const current = cfg().baseURL === baseURL
      const availability = !info
        ? "Checking..."
        : info.available
          ? `Available - ${info.agencies.length} ${info.agencies.length === 1 ? "agency" : "agencies"}`
          : "Unavailable"
      return {
        value: {
          kind: "server",
          baseURL,
        } satisfies Option,
        title: baseURL,
        description: current ? `${availability} - current` : availability,
        category: "Local servers",
      }
    })

    if (
      !status.loading &&
      !result.some((item) => item.value.kind === "server" && status()?.[item.value.baseURL]?.available)
    ) {
      result.push({
        value: {
          kind: "status",
        },
        title: "No local agency-swarm servers are available",
        description: "Start a local server or add another local port",
        disabled: true,
        category: "Status",
      })
    }

    result.push({
      value: {
        kind: "custom",
      },
      title: "Add local port",
      description: "Example: 5555",
      category: "Actions",
    })
    result.push({
      value: {
        kind: "token",
      },
      title: cfg().token ? "Update token" : "Set token",
      description: "For authenticated agency-swarm servers",
      category: "Authentication",
    })
    if (cfg().token) {
      result.push({
        value: {
          kind: "clear_token",
        },
        title: "Clear token",
        description: "Remove stored agency-swarm token",
        category: "Authentication",
      })
    }

    return result
  })

  const onServer = async (baseURL: string) => {
    const current = cfg()
    const info = status()?.[baseURL]
    if (info && !info.available) {
      toast.show({
        variant: "warning",
        message: `Server ${baseURL} is unavailable.`,
        duration: 4000,
      })
      return
    }

    const sameServer = current.baseURL === baseURL
    const remembered = normalizeLocalServers([...current.localServers, baseURL])
    const nextOptions: Record<string, unknown> = {
      ...current.options,
      baseURL,
      localServers: remembered,
      local_servers: remembered,
      discoveryTimeoutMs: current.discoveryTimeoutMs,
      agency: sameServer ? (readString(current.options["agency"]) ?? null) : null,
      recipientAgent: sameServer ? (readString(current.options["recipientAgent"]) ?? null) : null,
      recipient_agent: sameServer ? (readString(current.options["recipient_agent"]) ?? null) : null,
    }
    if (!current.configToken) nextOptions["token"] = null

    await sdk.client.global.config.update(
      {
        config: {
          model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              name: current.configured?.name ?? "agency-swarm",
              options: nextOptions,
            },
          },
        },
      },
      { throwOnError: true },
    )
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.clear()
    toast.show({
      variant: "success",
      message: `Connected to ${baseURL}`,
      duration: 3000,
    })
  }

  const clearConfigToken = async () => {
    const current = cfg()
    await sdk.client.global.config.update(
      {
        config: {
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              name: current.configured?.name ?? "agency-swarm",
              options: {
                ...current.options,
                token: null,
              },
            },
          },
        },
      },
      { throwOnError: true },
    )
  }

  const onSetToken = () => {
    dialog.replace(() => (
      <DialogPrompt
        title="Set Agency token"
        placeholder="Bearer token"
        onConfirm={(value) => {
          const token = value.trim()
          if (!token) return
          void sdk.client.auth
            .set({
              providerID: AgencySwarmAdapter.PROVIDER_ID,
              auth: {
                type: "api",
                key: token,
              },
            })
            .then(clearConfigToken)
            .then(() => sdk.client.instance.dispose())
            .then(() => sync.bootstrap())
            .then(() => {
              toast.show({
                variant: "success",
                message: "Agency token saved",
                duration: 3000,
              })
              dialog.replace(() => <DialogAgencySwarmConnect />)
            })
            .catch((error) => toast.error(error))
        }}
      />
    ))
  }

  const onClearToken = () => {
    void sdk.client.auth
      .remove({
        providerID: AgencySwarmAdapter.PROVIDER_ID,
      })
      .then(clearConfigToken)
      .then(() => sdk.client.instance.dispose())
      .then(() => sync.bootstrap())
      .then(() => {
        toast.show({
          variant: "success",
          message: "Agency token removed",
          duration: 3000,
        })
        return refetch()
      })
      .catch((error) => toast.error(error))
  }

  const onCustomPort = () => {
    dialog.replace(() => (
      <DialogPrompt
        title="Add local Agency port"
        placeholder="8000"
        onConfirm={(value) => {
          const baseURL = normalizeLocalServerInput(value)
          if (!baseURL) {
            toast.show({
              variant: "warning",
              message: "Enter a local port like 8000 or a local URL like http://127.0.0.1:8000",
              duration: 5000,
            })
            return
          }
          void onServer(baseURL).catch((error) => toast.error(error))
        }}
      />
    ))
  }

  return (
    <DialogSelect<Option>
      title="Connect to local agency-swarm server"
      current={{
        kind: "server",
        baseURL: cfg().baseURL,
      }}
      options={options()}
      onSelect={(option) => {
        if (option.value.kind === "server") {
          void onServer(option.value.baseURL).catch((error) => toast.error(error))
          return
        }
        if (option.value.kind === "custom") {
          onCustomPort()
          return
        }
        if (option.value.kind === "token") {
          onSetToken()
          return
        }
        if (option.value.kind === "clear_token") {
          onClearToken()
        }
      }}
    />
  )
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function readPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined
  if (!Number.isFinite(value)) return undefined
  if (value <= 0) return undefined
  return value
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== "string") return []
    const trimmed = item.trim()
    if (!trimmed) return []
    return [trimmed]
  })
}

function normalizeLocalServers(values: string[]): string[] {
  return Array.from(
    new Set(
      values.flatMap((item) => {
        const normalized = normalizeLocalServerInput(item)
        if (!normalized) return []
        return [normalized]
      }),
    ),
  )
}

function normalizeLocalServerInput(value: string): string | undefined {
  const raw = value.trim()
  if (!raw) return undefined

  const numeric = Number(raw)
  if (Number.isFinite(numeric) && numeric > 0 && numeric <= 65535) {
    return AgencySwarmAdapter.normalizeBaseURL(`http://127.0.0.1:${numeric}`)
  }

  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "0.0.0.0") return undefined
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return AgencySwarmAdapter.normalizeBaseURL(url.toString())
  } catch {
    return undefined
  }
}
