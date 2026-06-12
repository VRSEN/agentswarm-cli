import { createMemo, createResource, createSignal, onCleanup, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog, type DialogContext } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { useLocal } from "@tui/context/local"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import type { ProviderAuthAuthorization, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"
import * as Clipboard from "@tui/util/clipboard"
import { useToast } from "../ui/toast"
import { CONSOLE_MANAGED_ICON, isConsoleManagedProvider } from "@tui/util/provider-origin"
import {
  getStoredProviderAuthMethod,
  getVisibleProviderAuthMethods,
  hasStoredProviderCredential,
} from "@tui/util/provider-auth"
import { refreshAfterProviderAuth } from "@tui/util/provider-auth-refresh"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencyBrand } from "@/agency-swarm/brand"
import { AgencyProduct } from "@/agency-swarm/product"
import { isAgencySwarmFrameworkMode, isSupportedAgencyAuthProvider } from "../session-error"
import { errorMessage as toErrorMessage } from "@/util/error"
import { Log } from "@opencode-ai/core/util/log"
import open from "open"
import type { Provider } from "@opencode-ai/sdk/v2"
import { useConnected } from "./use-connected"
import { DialogAddons } from "./dialog-addons"
import { Telemetry } from "@/telemetry/telemetry"
import { useBindings } from "../keymap"

const PROVIDER_PRIORITY: Record<string, number> = {
  openai: 0,
  anthropic: 1,
  openrouter: 2,
  "github-copilot": 3,
  google: 4,
  "opencode-go": 5,
  opencode: 100,
}

const log = Log.create({ service: "tui.dialog-provider" })

function captureProviderAuthConfigured(input: {
  providerID: string
  authMethod: "api" | "oauth"
  frameworkMode: boolean
}) {
  void Telemetry.capture("provider_auth_configured", {
    auth_method: input.authMethod,
    framework_mode: input.frameworkMode,
    provider_id: input.providerID,
    source: "auth_dialog",
  })
}

function captureProviderRequested(input: { providerID: string; frameworkMode: boolean; connectedBefore: boolean }) {
  void Telemetry.capture("provider_requested", {
    connected_before: input.connectedBefore,
    framework_mode: input.frameworkMode,
    provider_id: input.providerID,
    source: "auth_dialog",
  })
}

function captureProviderAuthStarted(input: {
  providerID: string
  authMethod: "api" | "oauth"
  frameworkMode: boolean
}) {
  void Telemetry.capture("provider_auth_started", {
    auth_method: input.authMethod,
    framework_mode: input.frameworkMode,
    provider_id: input.providerID,
    source: "auth_dialog",
  })
}

function captureProviderAuthFailed(input: {
  providerID: string
  authMethod: "api" | "oauth"
  frameworkMode: boolean
  step: "api_key_save" | "oauth_authorize" | "oauth_callback" | "post_auth_refresh"
  error: unknown
}) {
  void Telemetry.capture("provider_auth_failed", {
    auth_method: input.authMethod,
    error_bucket: Telemetry.errorBucket(input.error),
    framework_mode: input.frameworkMode,
    provider_id: input.providerID,
    source: "auth_dialog",
    step: input.step,
  })
}

function sdkError(error: unknown, result: { response?: { status?: number } }) {
  return {
    data: error,
    status: result.response?.status,
  }
}

const CUSTOM_PROVIDER_OPTION_VALUE = "__opencode_custom_provider__"
const CUSTOM_PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/

type ProviderOptionBase = {
  title: string
  value: string
  description?: string
  category: string
}

type ProviderOption =
  | (ProviderOptionBase & {
      type: "provider"
      providerID: string
    })
  | (ProviderOptionBase & {
      type: "custom"
    })

export function providerOptions(list: { id: string; name: string }[]): ProviderOption[] {
  return [
    ...pipe(
      list,
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => ({
        type: "provider" as const,
        title: provider.name,
        value: provider.id,
        providerID: provider.id,
        description: {
          opencode: "(Recommended)",
          anthropic: "(API key)",
          openrouter: "(API key)",
          openai: "(Browser sign-in or API key)",
          "opencode-go": "Low cost subscription for everyone",
        }[provider.id],
        category: provider.id in PROVIDER_PRIORITY ? "Popular" : "Providers",
      })),
    ),
    {
      type: "custom",
      title: "Other",
      value: CUSTOM_PROVIDER_OPTION_VALUE,
      description: "Custom provider",
      category: "Providers",
    },
  ]
}

export function normalizeCustomProviderID(value: string) {
  const providerID = value.trim().replace(/^@ai-sdk\//, "")
  if (!CUSTOM_PROVIDER_ID.test(providerID)) return
  return providerID
}

export function createDialogProviderOptions() {
  return createDialogProviderOptionsWithFilter()
}

type DialogProviderProps = {
  providerIDs?: readonly string[]
  title?: string
}

export function listRemovableAuthProviders(input: {
  all: { id: string; name: string }[]
  providers: Provider[]
  providerAuth: Record<string, ProviderAuthMethod[]>
  consoleManagedProviders: string[]
}) {
  return input.all.filter((provider) => {
    if (provider.id === AgencySwarmAdapter.PROVIDER_ID) return false
    if (!hasStoredProviderCredential(input.providers, input.providerAuth, provider.id)) return false
    if (isConsoleManagedProvider(input.consoleManagedProviders, provider.id)) return false
    return true
  })
}

export function createDialogProviderOptionsWithFilter(props: DialogProviderProps = {}) {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const local = useLocal()
  const { theme } = useTheme()
  const onboarded = useConnected()
  const allowed = createMemo(() => (props.providerIDs ? new Set(props.providerIDs) : undefined))
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
      productMode: local.product?.current(),
    }),
  )

  async function promptCustomProviderID(): Promise<string | undefined> {
    const value = await DialogPrompt.show(dialog, "Other", {
      placeholder: "Provider id",
      description: () => (
        <text fg={theme.textMuted}>
          This only stores a credential. Configure the provider in {AgencyBrand.config}.json to use it.
        </text>
      ),
    })
    if (value === null) return

    const providerID = normalizeCustomProviderID(value)
    if (providerID) return providerID

    toast.show({
      variant: "error",
      message:
        "Provider ids must start with a lowercase letter or number and only use lowercase letters, numbers, hyphens, and underscores",
    })
    return promptCustomProviderID()
  }

  const options = createMemo(() => {
    const allowedIDs = allowed()
    const providers = allowedIDs
      ? sync.data.provider_next.all.filter((item) => allowedIDs.has(item.id))
      : sync.data.provider_next.all
    return pipe(
      providerOptions(providers),
      (items) => (allowedIDs ? items.filter((item) => item.type !== "custom") : items),
      map((provider) => {
        if (provider.type === "custom") {
          return {
            title: provider.title,
            value: provider.value,
            description: provider.description,
            category: provider.category,
            async onSelect() {
              const providerID = await promptCustomProviderID()
              if (!providerID) return
              return dialog.replace(() => <ApiMethod providerID={providerID} title="API key" custom />)
            },
          }
        }

        const providerID = provider.providerID
        const consoleManaged = isConsoleManagedProvider(sync.data.console_state.consoleManagedProviders, providerID)
        const connected = sync.data.provider_next.connected.includes(providerID)

        const stored = sync.data.provider_next.all.find((item) => item.id === providerID)
        const storedAuthMethod = connected && stored ? getStoredProviderAuthMethod(stored) : undefined
        const description = ((): string | undefined => {
          if (providerID === "openai" && storedAuthMethod) {
            if (storedAuthMethod === "oauth") return "(Browser sign-in)"
            if (storedAuthMethod === "api") return "(API key)"
            if (storedAuthMethod === "env") return "(API key from env)"
            if (storedAuthMethod === "config") return "(API key from config)"
          }
          return provider.description
        })()
        return {
          title: provider.title,
          value: provider.value,
          description,
          footer: consoleManaged ? sync.data.console_state.activeOrgName : undefined,
          category: provider.category,
          gutter: consoleManaged
            ? () => <text fg={theme.textMuted}>{CONSOLE_MANAGED_ICON}</text>
            : connected && onboarded()
              ? () => <text fg={theme.success}>✓</text>
              : undefined,
          async onSelect() {
            if (consoleManaged) return
            const selectedFrameworkMode = frameworkMode()
            captureProviderRequested({
              providerID,
              frameworkMode: selectedFrameworkMode,
              connectedBefore: connected,
            })

            const methods = getVisibleProviderAuthMethods(
              providerID,
              sync.data.provider_auth[providerID] ?? [
                {
                  type: "api",
                  label: "API key",
                },
              ],
              {
                frameworkMode: frameworkMode(),
              },
            )
            const visibleMethods = methods.length
              ? methods
              : [
                  {
                    type: "api" as const,
                    label: "API key",
                  },
                ]
            let index: number | null = 0
            if (visibleMethods.length > 1) {
              index = await new Promise<number | null>((resolve) => {
                dialog.replace(
                  () => (
                    <DialogSelect
                      title={`Select ${provider.title} auth method`}
                      options={visibleMethods.map((x, index) => ({
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
            const method = visibleMethods[index]
            if (method.type === "oauth") {
              captureProviderAuthStarted({
                providerID,
                authMethod: "oauth",
                frameworkMode: selectedFrameworkMode,
              })
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
                providerID,
                method: index,
                inputs,
              })
              if (result.error) {
                captureProviderAuthFailed({
                  providerID,
                  authMethod: "oauth",
                  frameworkMode: selectedFrameworkMode,
                  step: "oauth_authorize",
                  error: sdkError(result.error, result),
                })
                log.error("provider oauth authorize failed", {
                  providerID,
                  method: method.label,
                  frameworkMode: frameworkMode(),
                  error: toErrorMessage(result.error),
                })
                toast.show({
                  variant: "error",
                  message: toErrorMessage(result.error),
                  duration: 5000,
                })
                return
              }
              if (result.data?.method === "code") {
                dialog.replace(() => (
                  <CodeMethod providerID={providerID} title={method.label} index={index} authorization={result.data!} />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod providerID={providerID} title={method.label} index={index} authorization={result.data!} />
                ))
              }
            }
            if (method.type === "api") {
              captureProviderAuthStarted({
                providerID,
                authMethod: "api",
                frameworkMode: selectedFrameworkMode,
              })
              let metadata: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({ dialog, prompts: method.prompts })
                if (!value) return
                metadata = value
              }
              return dialog.replace(() => (
                <ApiMethod providerID={providerID} title={method.label} metadata={metadata} />
              ))
            }
          },
        }
      }),
    )
  })
  return options
}

export function DialogProvider(props: DialogProviderProps = {}) {
  const options = createDialogProviderOptionsWithFilter(props)
  return <DialogSelect title={props.title ?? "Connect a provider"} options={options()} />
}

function DialogRemoveCredential() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const options = createMemo(() =>
    pipe(
      listRemovableAuthProviders({
        all: sync.data.provider_next.all,
        providers: sync.data.provider,
        providerAuth: sync.data.provider_auth,
        consoleManagedProviders: sync.data.console_state.consoleManagedProviders,
      }),
      sortBy((provider) => PROVIDER_PRIORITY[provider.id] ?? 99),
      map((provider) => ({
        title: provider.name,
        value: provider.id,
        onSelect: async () => {
          await sdk.client.auth.remove({
            providerID: provider.id,
          })
          await refreshAfterProviderAuth({
            sessionStatus: () => sync.data.session_status,
            dispose: () => sdk.client.instance.dispose(),
            bootstrap: () => sync.bootstrap(),
          })
          toast.show({
            variant: "success",
            message: `${provider.name} credential removed`,
            duration: 3000,
          })
          dialog.replace(() => <DialogAuth />)
        },
      })),
    ),
  )
  return <DialogSelect title="Remove credential" options={options()} />
}

export function DialogAuth() {
  const dialog = useDialog()
  const sync = useSync()
  const local = useLocal()
  useKeyboard((evt) => {
    closeDialogAuthOnEscape(dialog, evt)
  })
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
      productMode: local.product?.current(),
    }),
  )
  const providerIDs = frameworkMode()
    ? sync.data.provider_next.all
        .filter((provider) =>
          isSupportedAgencyAuthProvider(provider.id, provider, sync.data.provider_auth[provider.id] ?? []),
        )
        .map((provider) => provider.id)
    : undefined
  const providerOptions = createDialogProviderOptionsWithFilter({ providerIDs })
  const options = createMemo<DialogSelectOption<string>[]>(() => {
    const removable = listRemovableAuthProviders({
      all: sync.data.provider_next.all,
      providers: sync.data.provider,
      providerAuth: sync.data.provider_auth,
      consoleManagedProviders: sync.data.console_state.consoleManagedProviders,
    })
    if (removable.length === 0) return providerOptions()

    return [
      {
        title: "Remove credential",
        value: "__remove__",
        description: "Delete a stored provider credential",
        category: "Manage",
        onSelect: () => {
          dialog.replace(() => <DialogRemoveCredential />)
        },
      },
      ...providerOptions(),
    ]
  })

  return (
    <DialogSelect title={frameworkMode() ? "Manage Agent Swarm auth" : "Manage provider auth"} options={options()} />
  )
}

export function closeDialogAuthOnEscape(
  dialog: Pick<ReturnType<typeof useDialog>, "clear">,
  evt: {
    name?: string
    preventDefault(): void
    stopPropagation(): void
  },
) {
  if (evt.name !== "escape") return false
  evt.preventDefault()
  evt.stopPropagation()
  dialog.clear()
  return true
}

/** After auth in Agency Swarm mode, offer model selection (CLI model drives `client_config` for that provider). */
function DialogPostAuthModelChoice(props: { providerID: string }) {
  const dialog = useDialog()
  const sync = useSync()
  const providerName = createMemo(() => {
    const p = sync.data.provider_next.all.find((x) => x.id === props.providerID)
    return p?.name ?? props.providerID
  })
  return (
    <DialogSelect
      title={`${providerName()} connected`}
      options={[
        {
          title: "Select model",
          value: "model",
          description: "Choose which model to use for this session",
          onSelect: () => dialog.replace(() => <DialogModel providerID={props.providerID} />),
        },
        {
          title: "Done",
          value: "done",
          description: "Keep your current model selection",
          onSelect: () => dialog.clear(),
        },
      ]}
    />
  )
}

function finishProviderAuth(input: { providerID: string; frameworkMode: boolean; dialog: DialogContext }) {
  const done = () => {
    if (!AgencyProduct.shouldShowPostAuthModelSelection()) {
      input.dialog.clear()
      return
    }
    if (input.frameworkMode) {
      input.dialog.replace(() => <DialogPostAuthModelChoice providerID={input.providerID} />)
      return
    }
    input.dialog.replace(() => <DialogModel providerID={input.providerID} />)
  }
  if (input.frameworkMode && AgencyProduct.shouldShowAddons()) {
    input.dialog.replace(() => <DialogAddons providerID={input.providerID} onDone={done} />)
    return
  }
  done()
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

export function agencyConnectServerOptions(input: {
  options: Record<string, unknown>
  baseURL: string
  currentBaseURL: string
  localServers: string[]
  discoveryTimeoutMs: number
  configToken?: string
}) {
  const sameServer = input.currentBaseURL === input.baseURL
  const nextOptions: Record<string, unknown> = {
    ...input.options,
    baseURL: input.baseURL,
    localServers: normalizeLocalServers([...input.localServers, input.baseURL]),
    discoveryTimeoutMs: input.discoveryTimeoutMs,
    agency: sameServer ? (readString(input.options["agency"]) ?? null) : null,
    recipientAgent: sameServer
      ? (readString(input.options["recipientAgent"]) ?? readString(input.options["recipient_agent"]) ?? null)
      : null,
    recipient_agent: sameServer ? (readString(input.options["recipient_agent"]) ?? null) : null,
  }
  if (!input.configToken) nextOptions["token"] = null
  return nextOptions
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

    const nextOptions = agencyConnectServerOptions({
      options: current.options,
      baseURL,
      currentBaseURL: current.baseURL,
      localServers: current.localServers,
      discoveryTimeoutMs: current.discoveryTimeoutMs,
      configToken: current.configToken,
    })

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
    await refreshAfterProviderAuth({
      sessionStatus: () => sync.data.session_status,
      dispose: () => sdk.client.instance.dispose(),
      bootstrap: () => sync.bootstrap(),
    })
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
            .then(() =>
              refreshAfterProviderAuth({
                sessionStatus: () => sync.data.session_status,
                dispose: () => sdk.client.instance.dispose(),
                bootstrap: () => sync.bootstrap(),
              }),
            )
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
      .then(() =>
        refreshAfterProviderAuth({
          sessionStatus: () => sync.data.session_status,
          dispose: () => sdk.client.instance.dispose(),
          bootstrap: () => sync.bootstrap(),
        }),
      )
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

function describeBrowserOpenFailure(error: unknown) {
  const detail = toErrorMessage(error)
  if (!detail) return "Could not open your default browser automatically. Open the link above to continue."
  return `Could not open your default browser automatically. Open the link above to continue. ${detail}`
}

function watchBrowserOpen(url: string, onFailure: (message: string) => void) {
  return open(url)
    .then((subprocess) => {
      let settled = false
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        onFailure(describeBrowserOpenFailure(error))
      }
      const timer = setTimeout(() => {
        settled = true
      }, 500)
      subprocess.once?.("error", (error) => {
        clearTimeout(timer)
        fail(error)
      })
      subprocess.once?.("exit", (code) => {
        if (code === null || code === 0) return
        clearTimeout(timer)
        fail(new Error(`Browser open failed with exit code ${code}`))
      })
    })
    .catch((error) => onFailure(describeBrowserOpenFailure(error)))
}

function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const local = useLocal()
  const toast = useToast()
  const [error, setError] = createSignal<string>()
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
      productMode: local.product?.current(),
    }),
  )

  useBindings(() => ({
    bindings: [
      {
        key: "c",
        desc: "Copy provider code",
        group: "Dialog",
        cmd: () => {
          const code =
            props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
          Clipboard.copy(code)
            .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
            .catch(toast.error)
        },
      },
    ],
  }))

  onMount(async () => {
    if (frameworkMode()) {
      void watchBrowserOpen(props.authorization.url, (message) => {
        log.error("failed to open browser for provider oauth", {
          providerID: props.providerID,
          frameworkMode: frameworkMode(),
          message,
        })
        setError(message)
        toast.show({
          variant: "warning",
          message,
          duration: 7000,
        })
      })
    }
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      const message = toErrorMessage(result.error)
      captureProviderAuthFailed({
        providerID: props.providerID,
        authMethod: "oauth",
        frameworkMode: frameworkMode(),
        step: "oauth_callback",
        error: sdkError(result.error, result),
      })
      log.error("provider oauth callback failed", {
        providerID: props.providerID,
        frameworkMode: frameworkMode(),
        message,
      })
      setError(message)
      toast.show({
        variant: "error",
        message,
        duration: 5000,
      })
      return
    }
    try {
      await refreshAfterProviderAuth({
        sessionStatus: () => sync.data.session_status,
        dispose: () => sdk.client.instance.dispose(),
        bootstrap: () => sync.bootstrap(),
      })
      captureProviderAuthConfigured({
        providerID: props.providerID,
        authMethod: "oauth",
        frameworkMode: frameworkMode(),
      })
      finishProviderAuth({ providerID: props.providerID, frameworkMode: frameworkMode(), dialog })
    } catch (error) {
      const message = toErrorMessage(error)
      captureProviderAuthFailed({
        providerID: props.providerID,
        authMethod: "oauth",
        frameworkMode: frameworkMode(),
        step: "post_auth_refresh",
        error,
      })
      log.error("provider oauth post-callback bootstrap failed", {
        providerID: props.providerID,
        frameworkMode: frameworkMode(),
        message,
      })
      setError(message)
      toast.show({
        variant: "error",
        message,
        duration: 5000,
      })
    }
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
      <text fg={theme.textMuted}>
        {frameworkMode()
          ? "Your default browser should open. If it does not, use the link above."
          : "Finish sign-in in your browser, then wait here."}
      </text>
      <Show when={error()}>{(message) => <text fg={theme.error}>{message()}</text>}</Show>
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
  const local = useLocal()
  const toast = useToast()
  const [error, setError] = createSignal<string>()
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
      productMode: local.product?.current(),
    }),
  )

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const result = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!result.error) {
          try {
            await refreshAfterProviderAuth({
              sessionStatus: () => sync.data.session_status,
              dispose: () => sdk.client.instance.dispose(),
              bootstrap: () => sync.bootstrap(),
            })
            captureProviderAuthConfigured({
              providerID: props.providerID,
              authMethod: "oauth",
              frameworkMode: frameworkMode(),
            })
            finishProviderAuth({ providerID: props.providerID, frameworkMode: frameworkMode(), dialog })
          } catch (error) {
            const message = toErrorMessage(error)
            captureProviderAuthFailed({
              providerID: props.providerID,
              authMethod: "oauth",
              frameworkMode: frameworkMode(),
              step: "post_auth_refresh",
              error,
            })
            log.error("provider oauth code-flow bootstrap failed", {
              providerID: props.providerID,
              frameworkMode: frameworkMode(),
              message,
            })
            setError(message)
            toast.show({
              variant: "error",
              message,
              duration: 5000,
            })
          }
          return
        }
        const message = toErrorMessage(result.error)
        captureProviderAuthFailed({
          providerID: props.providerID,
          authMethod: "oauth",
          frameworkMode: frameworkMode(),
          step: "oauth_callback",
          error: sdkError(result.error, result),
        })
        log.error("provider oauth code callback failed", {
          providerID: props.providerID,
          frameworkMode: frameworkMode(),
          message,
        })
        setError(message)
        toast.show({
          variant: "error",
          message,
          duration: 5000,
        })
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>{(message) => <text fg={theme.error}>{message()}</text>}</Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
  metadata?: Record<string, string>
  custom?: boolean
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const local = useLocal()
  const toast = useToast()
  const { theme } = useTheme()
  const [error, setError] = createSignal<string>()
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
      productMode: local.product?.current(),
    }),
  )
  const description = () => {
    const builtin =
      {
        opencode: (
          <box gap={1}>
            <text fg={theme.textMuted}>
              OpenCode Zen gives you access to all the best coding models at the cheapest prices with a single API key.
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

    return (
      <box gap={1}>
        {builtin}
        <Show when={error()}>{(message) => <text fg={theme.error}>{message()}</text>}</Show>
      </box>
    )
  }

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={description}
      onConfirm={async (value) => {
        if (!value) return
        const result = await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
            ...(props.metadata ? { metadata: props.metadata } : {}),
          },
        })
        if (result.error) {
          const message = toErrorMessage(result.error)
          captureProviderAuthFailed({
            providerID: props.providerID,
            authMethod: "api",
            frameworkMode: frameworkMode(),
            step: "api_key_save",
            error: sdkError(result.error, result),
          })
          log.error("provider api credential save failed", {
            providerID: props.providerID,
            frameworkMode: frameworkMode(),
            message,
          })
          setError(message)
          toast.show({
            variant: "error",
            message,
            duration: 5000,
          })
          return
        }
        try {
          await refreshAfterProviderAuth({
            sessionStatus: () => sync.data.session_status,
            dispose: () => sdk.client.instance.dispose(),
            bootstrap: () => sync.bootstrap(),
          })
          captureProviderAuthConfigured({
            providerID: props.providerID,
            authMethod: "api",
            frameworkMode: frameworkMode(),
          })
          if (props.custom && !sync.data.provider_next.all.some((provider) => provider.id === props.providerID)) {
            toast.show({
              variant: "info",
              message: `Saved credential for ${props.providerID}. Configure it in ${AgencyBrand.config}.json to use it.`,
            })
            dialog.clear()
            return
          }
          finishProviderAuth({ providerID: props.providerID, frameworkMode: frameworkMode(), dialog })
        } catch (error) {
          const message = toErrorMessage(error)
          captureProviderAuthFailed({
            providerID: props.providerID,
            authMethod: "api",
            frameworkMode: frameworkMode(),
            step: "post_auth_refresh",
            error,
          })
          log.error("provider api auth bootstrap failed", {
            providerID: props.providerID,
            frameworkMode: frameworkMode(),
            message,
          })
          setError(message)
          toast.show({
            variant: "error",
            message,
            duration: 5000,
          })
        }
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
