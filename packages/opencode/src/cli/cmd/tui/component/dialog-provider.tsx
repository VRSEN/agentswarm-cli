import { createMemo, createResource, createSignal, onCleanup, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import type { ProviderAuthAuthorization, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"
import { useKeyboard } from "@opentui/solid"
import { Clipboard } from "@tui/util/clipboard"
import { useToast } from "../ui/toast"
import { CONSOLE_MANAGED_ICON, isConsoleManagedProvider } from "@tui/util/provider-origin"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"

const PROVIDER_PRIORITY: Record<string, number> = {
  opencode: 0,
  "opencode-go": 1,
  openai: 2,
  "github-copilot": 3,
  anthropic: 4,
  google: 5,
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const options = createMemo(() => {
    return pipe(
      sync.data.provider_next.all,
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => {
        const consoleManaged = isConsoleManagedProvider(sync.data.console_state.consoleManagedProviders, provider.id)
        const connected = sync.data.provider_next.connected.includes(provider.id)

        return {
          title: provider.name,
          value: provider.id,
          description: {
            opencode: "(Recommended)",
            anthropic: "(API key)",
            openai: "(ChatGPT Plus/Pro or API key)",
            "opencode-go": "Low cost subscription for everyone",
          }[provider.id],
          footer: consoleManaged ? sync.data.console_state.activeOrgName : undefined,
          category: provider.id in PROVIDER_PRIORITY ? "Popular" : "Other",
          gutter: consoleManaged ? (
            <text fg={theme.textMuted}>{CONSOLE_MANAGED_ICON}</text>
          ) : connected ? (
            <text fg={theme.success}>✓</text>
          ) : undefined,
          async onSelect() {
            if (consoleManaged) return

            const methods = sync.data.provider_auth[provider.id] ?? [
              {
                type: "api",
                label: "API key",
              },
            ]
            let index: number | null = 0
            if (methods.length > 1) {
              index = await new Promise<number | null>((resolve) => {
                dialog.replace(
                  () => (
                    <DialogSelect
                      title="Select auth method"
                      options={methods.map((x, index) => ({
                        title: x.label,
                        value: index,
                      }))}
                      onSelect={(option) => resolve(option.value)}
                    />
                  ),
                  () => resolve(null),
                )
              })
            }
            if (index == null) return
            const method = methods[index]
            if (method.type === "oauth") {
              let inputs: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({
                  dialog,
                  prompts: method.prompts,
                })
                if (!value) return
                inputs = value
              }

              const result = await sdk.client.provider.oauth.authorize({
                providerID: provider.id,
                method: index,
                inputs,
              })
              if (result.error) {
                toast.show({
                  variant: "error",
                  message: JSON.stringify(result.error),
                })
                dialog.clear()
                return
              }
              if (result.data?.method === "code") {
                dialog.replace(() => (
                  <CodeMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
            }
            if (method.type === "api") {
              let metadata: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({ dialog, prompts: method.prompts })
                if (!value) return
                metadata = value
              }
              return dialog.replace(() => (
                <ApiMethod providerID={provider.id} title={method.label} metadata={metadata} />
              ))
            }
          },
        }
      }),
    )
  })
  return options
}

export function DialogProvider() {
  const options = createDialogProviderOptions()
  return <DialogSelect title="Connect a provider" options={options()} />
}

export function DialogProviderAuth() {
  const options = createDialogProviderOptions()
  const filtered = createMemo(() => options().filter((item) => item.value === "openai"))
  return <DialogSelect title="Authenticate provider" options={filtered()} />
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

export function DialogAgencySwarmConnect() {
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
      timeoutMs: cfg().discoveryTimeoutMs,
    }),
    async (input): Promise<Record<string, { available: boolean; agencies: string[]; error?: string }>> => {
      const checks = await Promise.all(
        input.servers.map(async (baseURL) => {
          try {
            const response = await fetch(AgencySwarmAdapter.joinURL(baseURL, "openapi.json"), {
              method: "GET",
              headers: input.token ? { Authorization: `Bearer ${input.token}` } : undefined,
              signal: AbortSignal.timeout(input.timeoutMs),
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

  const options = createMemo<DialogSelectOption<Option>[]>(() => {
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
      discoveryTimeoutMs: current.discoveryTimeoutMs,
      agency: sameServer ? (readString(current.options["agency"]) ?? null) : null,
      recipientAgent:
        sameServer ? (readString(current.options["recipientAgent"]) ?? readString(current.options["recipient_agent"]) ?? null) : null,
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

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const toast = useToast()

  useKeyboard((evt) => {
    if (evt.name === "c" && !evt.ctrl && !evt.meta) {
      const code = props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
      Clipboard.copy(code)
        .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
        .catch(toast.error)
    }
  })

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
      <text fg={theme.text}>
        c <span style={{ fg: theme.textMuted }}>copy</span>
      </text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
  metadata?: Record<string, string>
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={
        {
          opencode: (
            <box gap={1}>
              <text fg={theme.textMuted}>
                OpenCode Zen gives you access to all the best coding models at the cheapest prices with a single API
                key.
              </text>
              <text fg={theme.text}>
                Go to <span style={{ fg: theme.primary }}>https://opencode.ai/zen</span> to get a key
              </text>
            </box>
          ),
          "opencode-go": (
            <box gap={1}>
              <text fg={theme.textMuted}>
                OpenCode Go is a $10 per month subscription that provides reliable access to popular open coding models
                with generous usage limits.
              </text>
              <text fg={theme.text}>
                Go to <span style={{ fg: theme.primary }}>https://opencode.ai/zen</span> and enable OpenCode Go
              </text>
            </box>
          ),
        }[props.providerID] ?? undefined
      }
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
            ...(props.metadata ? { metadata: props.metadata } : {}),
          },
        })
        await sdk.client.instance.dispose()
        await sync.bootstrap()
        dialog.replace(() => <DialogModel providerID={props.providerID} />)
      }}
    />
  )
}

interface PromptsMethodProps {
  dialog: ReturnType<typeof useDialog>
  prompts: NonNullable<ProviderAuthMethod["prompts"]>[number][]
}
async function PromptsMethod(props: PromptsMethodProps) {
  const inputs: Record<string, string> = {}
  for (const prompt of props.prompts) {
    if (prompt.when) {
      const value = inputs[prompt.when.key]
      if (value === undefined) continue
      const matches = prompt.when.op === "eq" ? value === prompt.when.value : value !== prompt.when.value
      if (!matches) continue
    }

    if (prompt.type === "select") {
      const value = await new Promise<string | null>((resolve) => {
        props.dialog.replace(
          () => (
            <DialogSelect
              title={prompt.message}
              options={prompt.options.map((x) => ({
                title: x.label,
                value: x.value,
                description: x.hint,
              }))}
              onSelect={(option) => resolve(option.value)}
            />
          ),
          () => resolve(null),
        )
      })
      if (value === null) return null
      inputs[prompt.key] = value
      continue
    }

    const value = await new Promise<string | null>((resolve) => {
      props.dialog.replace(
        () => (
          <DialogPrompt title={prompt.message} placeholder={prompt.placeholder} onConfirm={(value) => resolve(value)} />
        ),
        () => resolve(null),
      )
    })
    if (value === null) return null
    inputs[prompt.key] = value
  }
  return inputs
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
