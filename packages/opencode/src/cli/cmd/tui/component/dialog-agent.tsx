import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { displayAgentName } from "@/agent/display"
import { useLocal } from "@tui/context/local"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useToast } from "@tui/ui/toast"
import { createMemo, createResource } from "solid-js"
import { DialogAgencySwarmConnect } from "./dialog-provider"
import { isAgencySwarmFrameworkMode } from "../session-error"
import {
  buildAgencyTargetOptions,
  readAgencyProviderOptions,
  resolveAgencyTargetFromPicker,
  resolveAgencyTargetSelection,
} from "../util/agency-target"

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
  | {
      kind: "connect"
    }

export function DialogAgent() {
  const local = useLocal()
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()
  const toast = useToast()

  const currentModel = createMemo(() => local.model.current())
  const agencySwarmEnabled = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: currentModel()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
    }),
  )

  const providerOptions = createMemo(() => {
    return readAgencyProviderOptions({
      configuredProvider: sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
      connectedProvider: sync.data.provider.find((item) => item.id === AgencySwarmAdapter.PROVIDER_ID),
    })
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
          title: displayAgentName(item.name),
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
        title: "Discovering agency-swarm agents...",
        disabled: true,
        category: "agency-swarm",
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
        category: "agency-swarm",
      })
      result.push({
        value: {
          kind: "connect",
        },
        title: "Open /connect",
        description: "Select a local server or update token",
        category: "agency-swarm",
      })
      return result
    }

    const agencies = discovered?.agencies ?? []
    for (const agency of agencies) {
      const category = `Swarm: ${agency.name}`
      const entry = agency.agents.find((agent) => agent.isEntryPoint) ?? agency.agents[0]
      const description =
        agency.description && agency.description !== entry?.description ? agency.description : undefined
      result.push({
        value: {
          kind: "agency",
          agency: agency.id,
        },
        title: agency.name,
        description,
        category,
      })
      for (const agent of agency.agents) {
        result.push({
          value: {
            kind: "recipient",
            agency: agency.id,
            recipientAgent: agent.id,
          },
          title: `- ${agent.name}`,
          description: agent.description || (agent.isEntryPoint ? "Entry point" : undefined),
          category,
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
        description: `Check ${providerOptions().baseURL} and run \`agentswarm agency agencies\``,
        disabled: true,
        category: "agency-swarm",
      })
    }

    return result
  })

  const current = createMemo<AgentOptionValue | undefined>(() => {
    if (!agencySwarmEnabled()) {
      return {
        kind: "local",
        agent: local.agent.current()?.name ?? "build",
      }
    }

    const selected = resolveAgencyTargetSelection({
      agencies: discovery()?.agencies ?? [],
      configuredAgency: providerOptions().agency,
      configuredRecipient: providerOptions().recipientAgent,
    })
    if (selected) {
      if (!selected.recipientAgent) {
        return {
          kind: "agency",
          agency: selected.agency,
        }
      }
      return {
        kind: "recipient",
        agency: selected.agency,
        recipientAgent: selected.recipientAgent,
      }
    }

    if (providerOptions().agency) {
      return {
        kind: "agency",
        agency: providerOptions().agency!,
      }
    }

    return undefined
  })

  return (
    <DialogSelect
      title={agencySwarmEnabled() ? "Select swarm" : "Select agent"}
      current={current()}
      options={options()}
      onSelect={(option) => {
        if (option.value.kind === "local") {
          local.agent.set(option.value.agent)
          dialog.clear()
          return
        }

        if (option.value.kind === "connect") {
          dialog.replace(() => <DialogAgencySwarmConnect />)
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
    const selected = resolveAgencyTargetFromPicker({
      agencies: discovery()?.agencies ?? [],
      selectedAgency: value.agency,
      selectedRecipient: value.kind === "recipient" ? value.recipientAgent : undefined,
    })
    const nextOptions = buildAgencyTargetOptions({
      providerOptions: options,
      agency: value.agency,
      recipientAgent: selected?.recipientAgent ?? null,
    })

    await sdk.client.global.config.update(
      {
        config: {
          model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              name: "agency-swarm",
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

    const selectedMessage =
      value.kind === "agency"
        ? `Selected swarm ${selected?.agencyLabel ?? value.agency}`
        : `Selected ${selected?.label ?? value.recipientAgent} in swarm ${selected?.agencyLabel ?? value.agency}`
    toast.show({
      variant: "success",
      message: selectedMessage,
      duration: 3000,
    })
  }
}
