import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { useLocal } from "@tui/context/local"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useToast } from "@tui/ui/toast"
import { createMemo, createResource } from "solid-js"

type AgentOptionValue =
  | {
      kind: "local"
      agent: string
    }
  | {
      kind: "agency"
      agency: string
    }
  | {
      kind: "recipient"
      agency: string
      recipientAgent: string
    }

export function DialogAgent() {
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()
  const toast = useToast()

  const currentModel = createMemo(() => local.model.current())
  const agencySwarmEnabled = createMemo(() => currentModel()?.providerID === AgencySwarmAdapter.PROVIDER_ID)

  const providerOptions = createMemo(() => {
    const provider = sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID]
    const options = provider?.options
    const baseURL =
      readString(options?.["baseURL"]) ?? readString(options?.["base_url"]) ?? AgencySwarmAdapter.DEFAULT_BASE_URL
    const token = readString(options?.["token"])
    const agency = readString(options?.["agency"])
    const recipientAgent = readString(options?.["recipientAgent"]) ?? readString(options?.["recipient_agent"])
    const discoveryTimeoutMs =
      readPositiveNumber(options?.["discoveryTimeoutMs"]) ??
      readPositiveNumber(options?.["discovery_timeout_ms"]) ??
      AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS

    return {
      baseURL: AgencySwarmAdapter.normalizeBaseURL(baseURL),
      token,
      agency,
      recipientAgent,
      discoveryTimeoutMs,
      rawOptions: (options && typeof options === "object" ? options : {}) as Record<string, unknown>,
    }
  })

  const discoveryInput = createMemo(() => {
    if (!agencySwarmEnabled()) return undefined
    return {
      baseURL: providerOptions().baseURL,
      token: providerOptions().token,
      timeoutMs: providerOptions().discoveryTimeoutMs,
    }
  })

  const [discovery] = createResource(
    discoveryInput,
    async (input): Promise<{ agencies: AgencySwarmAdapter.AgencyDescriptor[]; error?: string }> => {
      try {
        const result = await AgencySwarmAdapter.discover({
          baseURL: input.baseURL,
          token: input.token,
          timeoutMs: input.timeoutMs,
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

  const options = createMemo<DialogSelectOption<AgentOptionValue>[]>(() => {
    if (!agencySwarmEnabled()) {
      return local.agent.list().map((item) => {
        return {
          value: {
            kind: "local",
            agent: item.name,
          } as AgentOptionValue,
          title: item.name,
          description: item.native ? "native" : item.description,
        }
      })
    }

    const result: DialogSelectOption<AgentOptionValue>[] = []
    const discovered = discovery()
    const error = discovered?.error

    if (discovery.loading && !error) {
      result.push({
        value: {
          kind: "agency",
          agency: "__loading__",
        },
        title: "Discovering Agency Swarm agents...",
        disabled: true,
        category: "Agency Swarm",
      })
      return result
    }

    if (error) {
      result.push({
        value: {
          kind: "agency",
          agency: "__error__",
        },
        title: "Agency discovery failed",
        description: error,
        disabled: true,
        category: "Agency Swarm",
      })
      return result
    }

    const agencies = discovered?.agencies ?? []
    for (const agency of agencies) {
      result.push({
        value: {
          kind: "agency",
          agency: agency.id,
        },
        title: agency.id,
        description: agency.description || `Use ${agency.name}`,
        category: "Agency Swarm Agencies",
      })
    }

    for (const agency of agencies) {
      for (const recipient of agency.agents) {
        result.push({
          value: {
            kind: "recipient",
            agency: agency.id,
            recipientAgent: recipient.id,
          },
          title: `${recipient.name} (${agency.id})`,
          description: recipient.description || (recipient.isEntryPoint ? "Entry point" : undefined),
          category: "Agency Swarm Recipient Agents",
        })
      }
    }

    if (result.length === 0) {
      result.push({
        value: {
          kind: "agency",
          agency: "__empty__",
        },
        title: "No agencies discovered",
        description: `Check ${providerOptions().baseURL} and run \`agency agencii agencies\``,
        disabled: true,
        category: "Agency Swarm",
      })
    }

    return result
  })

  const current = createMemo<AgentOptionValue | undefined>(() => {
    if (!agencySwarmEnabled()) {
      return {
        kind: "local",
        agent: local.agent.current().name,
      }
    }

    const configuredAgency = providerOptions().agency
    const configuredRecipient = providerOptions().recipientAgent

    if (configuredAgency && configuredRecipient) {
      return {
        kind: "recipient",
        agency: configuredAgency,
        recipientAgent: configuredRecipient,
      }
    }

    if (configuredAgency) {
      return {
        kind: "agency",
        agency: configuredAgency,
      }
    }

    return undefined
  })

  return (
    <DialogSelect
      title={agencySwarmEnabled() ? "Select Agency Swarm target" : "Select agent"}
      current={current()}
      options={options()}
      onSelect={(option) => {
        if (option.value.kind === "local") {
          local.agent.set(option.value.agent)
          dialog.clear()
          return
        }

        void setAgencySwarmTarget(option.value).catch((error) => {
          toast.show({
            variant: "error",
            message: error instanceof Error ? error.message : String(error),
            duration: 6000,
          })
        })
      }}
    />
  )

  async function setAgencySwarmTarget(value: Extract<AgentOptionValue, { kind: "agency" | "recipient" }>) {
    const options = providerOptions()
    const nextOptions: Record<string, unknown> = {
      ...options.rawOptions,
      baseURL: options.baseURL,
      discoveryTimeoutMs: options.discoveryTimeoutMs,
      agency: value.agency,
      recipientAgent: value.kind === "recipient" ? value.recipientAgent : null,
    }
    if (options.token) {
      nextOptions["token"] = options.token
    }

    await sdk.client.global.config.update(
      {
        config: {
          model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              name: "Agency Swarm",
              options: nextOptions,
            },
          },
        },
      },
      {
        throwOnError: true,
      },
    )

    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.clear()

    const selected =
      value.kind === "recipient"
        ? `Selected ${value.recipientAgent} in agency ${value.agency}`
        : `Selected agency ${value.agency}`
    toast.show({
      variant: "success",
      message: selected,
      duration: 3000,
    })
  }
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
