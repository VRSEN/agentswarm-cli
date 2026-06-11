import {
  BoxRenderable,
  RGBA,
  TextareaRenderable,
  MouseEvent,
  PasteEvent,
  decodePasteBytes,
  type KeyEvent,
  type Renderable,
} from "@opentui/core"
import type { CommandContext } from "@opentui/keymap"
import {
  createEffect,
  createMemo,
  createResource,
  onMount,
  createSignal,
  onCleanup,
  on,
  Show,
  Switch,
  Match,
} from "solid-js"
import "opentui-spinner/solid"
import path from "path"
import { fileURLToPath } from "url"
import { Filesystem } from "@/util/filesystem"
import { useLocal } from "@tui/context/local"
import { tint, useTheme } from "@tui/context/theme"
import { useAgencySwarmConnection } from "@tui/context/agency-swarm-connection"
import { EmptyBorder, SplitBorder } from "@tui/component/border"
import { Spinner } from "@tui/component/spinner"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import { useProject } from "@tui/context/project"
import { useSync } from "@tui/context/sync"
import { useEvent } from "@tui/context/event"
import { editorSelectionKey, useEditorContext, type EditorSelection } from "@tui/context/editor"
import { MessageID, PartID } from "@/session/schema"
import { createStore, produce, unwrap } from "solid-js/store"
import { usePromptHistory, type PromptInfo } from "./history"
import { computePromptTraits } from "./traits"
import { assign } from "./part"
import { usePromptStash } from "./stash"
import { DialogStash } from "../dialog-stash"
import { type AutocompleteRef, Autocomplete } from "./autocomplete"
import { useRenderer, useTerminalDimensions, type JSX } from "@opentui/solid"
import * as Editor from "@tui/util/editor"
import { useExit } from "../../context/exit"
import * as Clipboard from "../../util/clipboard"
import type { AssistantMessage, FilePart, Part, UserMessage } from "@opencode-ai/sdk/v2"
import { TuiEvent } from "../../event"
import { iife } from "@/util/iife"
import { Locale } from "@/util/locale"
import { formatDuration } from "@/util/format"
import { createColors, createFrames } from "../../ui/spinner.ts"
import { useDialog } from "@tui/ui/dialog"
import { DialogAgencySwarmConnect, DialogAuth, DialogProvider as DialogProviderConnect } from "../dialog-provider"
import { DialogAlert } from "../../ui/dialog-alert"
import { useToast } from "../../ui/toast"
import { useKV } from "../../context/kv"
import { createFadeIn } from "../../util/signal"
import { DialogSkill } from "../dialog-skill"
import { downloadOllamaModel } from "../download-ollama-model"
import { CONSOLE_MANAGED_ICON, consoleManagedProviderLabel } from "@tui/util/provider-origin"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencySwarmOllama } from "@/agency-swarm/ollama"
import { AgencySwarmRunSession } from "@/agency-swarm/run-session"
import {
  describeAgencyAuthFailure,
  isAgencySwarmFrameworkMode,
  shouldBlockAgencyPromptSubmit,
  shouldHideNativeCommandInRunMode,
  shouldOpenAgencyAuthDialog,
} from "../../session-error"
import { cancelQueuedRunModeMessages } from "../../util/run-queued-messages"
import { errorMessage as toErrorMessage } from "@/util/error"
import {
  displayRunOnlyAgentLabel,
  readAgencyProviderOptions,
  resolveAgencyHandoffRecipientFromParts,
  resolveAgencyHandoffRecipientFromMessages,
  resolveAgencyTargetSelection,
  shouldAdoptAgencyHandoffRecipient,
} from "../../util/agency-target"
import { hasAgencyHandoffEvidence } from "@/session/agency-swarm-utils"
import {
  confirmWorkspaceFileChanges,
  openWorkspaceSelect,
  warpWorkspaceSession,
  type WorkspaceSelection,
} from "../dialog-workspace-create"
import { DialogWorkspaceUnavailable } from "../dialog-workspace-unavailable"
import { useArgs } from "@tui/context/args"
import { Flag } from "@opencode-ai/core/flag/flag"
import { type WorkspaceStatus } from "../workspace-label"
import { useCommandPalette } from "../../context/command-palette"
import { useBindings, useCommandShortcut, useLeaderActive, useOpencodeKeymap } from "../../keymap"
import { useTuiConfig } from "../../context/tui-config"
import { Telemetry } from "@/telemetry/telemetry"
import { captureCommand } from "@/telemetry/command"

export type PromptProps = {
  sessionID?: string
  workspaceID?: string
  visible?: boolean
  disabled?: boolean
  onSubmit?: () => void
  ref?: (ref: PromptRef | undefined) => void
  hint?: JSX.Element
  right?: JSX.Element
  showPlaceholder?: boolean
  placeholders?: {
    normal?: string[]
    shell?: string[]
  }
}

export type PromptRef = {
  focused: boolean
  current: PromptInfo
  set(prompt: PromptInfo): void
  reset(): void
  blur(): void
  focus(): void
  submit(): void
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type TaskTelemetryProperties = {
  framework_mode: boolean
  has_agent_parts: boolean
  has_file_parts: boolean
  mode: "normal"
  provider_id: string
}

type TaskTelemetryState = {
  properties: TaskTelemetryProperties
  started: number
}

const DRAFT_RETENTION_MIN_CHARS = 20

function randomIndex(count: number) {
  if (count <= 0) return 0
  return Math.floor(Math.random() * count)
}

function fadeColor(color: RGBA, alpha: number) {
  return RGBA.fromValues(color.r, color.g, color.b, color.a * alpha)
}

function hasEditorRangeSelection(selection: EditorSelection["ranges"][number]) {
  return (
    selection.selection.start.line !== selection.selection.end.line ||
    selection.selection.start.character !== selection.selection.end.character
  )
}

function getEditorRangeLabel(selection: EditorSelection["ranges"][number]) {
  if (!hasEditorRangeSelection(selection)) return
  if (selection.selection.start.line === selection.selection.end.line) return `#${selection.selection.start.line}`
  return `#${selection.selection.start.line}-${selection.selection.end.line}`
}

function escapeEditorContextText(value: string) {
  return value.replace(/[<>`]/g, (char) => {
    if (char === "<") return "\\u003c"
    if (char === ">") return "\\u003e"
    return "\\u0060"
  })
}

function formatEditorContext(selection: EditorSelection) {
  const selected = selection.ranges.filter(hasEditorRangeSelection)
  const file = escapeEditorContextText(selection.filePath)
  if (selected.length === 0)
    return `<system-reminder>Note: The user opened the file "${file}". This may or may not be relevant to the current task.</system-reminder>\n`

  const ranges = selected.map((range, index) => {
    const prefix = selected.length > 1 ? `Selection ${index + 1}: ` : ""
    return `Note: The user selected ${prefix}${getEditorRangeLabel(range)} from "${file}". \`\`\`${escapeEditorContextText(range.text)}\`\`\`\n\n`
  })

  return `<system-reminder>${ranges.join("\n")} This may or may not be relevant to the current task.</system-reminder>\n`
}

let stashed: { prompt: PromptInfo; cursor: number } | undefined

type AgencyAssistantMessageInfo = {
  id: string
  sessionID: string
  role: string
  providerID?: string
  agent?: string
}

export function Prompt(props: PromptProps) {
  let input: TextareaRenderable
  let anchor: BoxRenderable
  const [inputTarget, setInputTarget] = createSignal<TextareaRenderable | undefined>()

  const leader = useLeaderActive()
  const local = useLocal()
  const agencyConnection = useAgencySwarmConnection()
  const args = useArgs()
  const sdk = useSDK()
  const editor = useEditorContext()
  const route = useRoute()
  const project = useProject()
  const sync = useSync()
  const event = useEvent()
  const tuiConfig = useTuiConfig()
  const dialog = useDialog()
  const toast = useToast()
  const status = createMemo(() => sync.data.session_status?.[props.sessionID ?? ""] ?? { type: "idle" })
  const history = usePromptHistory()
  const stash = usePromptStash()
  const command = useCommandPalette()
  const keymap = useOpencodeKeymap()
  const agentShortcut = useCommandShortcut("agent.cycle")
  const paletteShortcut = useCommandShortcut("command.palette.show")
  const renderer = useRenderer()
  const dimensions = useTerminalDimensions()
  const { theme, syntax } = useTheme()
  const kv = useKV()
  const animationsEnabled = createMemo(() => kv.get("animations_enabled", true))
  const list = createMemo(() => props.placeholders?.normal ?? [])
  const shell = createMemo(() => props.placeholders?.shell ?? [])
  const [auto, setAuto] = createSignal<AutocompleteRef>()
  const [handoffRecipient, setHandoffRecipient] = createSignal<
    | {
        sessionID: string
        messageID: string
        agent: string
        selectedAt?: number
      }
    | undefined
  >()
  const assistantMessagesByID = new Map<string, AgencyAssistantMessageInfo>()
  const taskTelemetryByMessageID = new Map<string, TaskTelemetryState>()
  const activeOrgName = createMemo(() => sync.data.console_state.activeOrgName)
  const canSwitchOrgs = createMemo(() => sync.data.console_state.switchableOrgCount > 1)
  const frameworkMode = createMemo(() =>
    isAgencySwarmFrameworkMode({
      currentProviderID: local.model.current()?.providerID,
      configuredModel: sync.data.config.model,
      agentModel: local.agent.current()?.model,
    }),
  )
  const effectiveAgentName = createMemo(() => (frameworkMode() ? "build" : (local.agent.current()?.name ?? "build")))
  const agencyProviderOptions = createMemo(() =>
    readAgencyProviderOptions({
      configuredProvider: sync.data.config.provider?.[AgencySwarmAdapter.PROVIDER_ID],
      connectedProvider: sync.data.provider.find((item) => item.id === AgencySwarmAdapter.PROVIDER_ID),
    }),
  )
  const frameworkRecipientDiscoveryInput = createMemo(() => {
    if (!frameworkMode()) return undefined
    const options = agencyProviderOptions()
    if (!options.recipientAgent) return undefined
    return {
      baseURL: options.baseURL,
      token: options.token,
      timeoutMs: options.discoveryTimeoutMs,
    }
  })
  const [frameworkRecipientDiscovery] = createResource(
    frameworkRecipientDiscoveryInput,
    async (input): Promise<AgencySwarmAdapter.AgencyDescriptor[]> => {
      try {
        const result = await AgencySwarmAdapter.discover({
          baseURL: input.baseURL,
          token: input.token,
          timeoutMs: input.timeoutMs,
        })
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
  const sessionHandoffRecipient = createMemo(() => {
    if (!props.sessionID) return undefined
    const options = agencyProviderOptions()
    return resolveAgencyHandoffRecipientFromMessages({
      frameworkMode: frameworkMode(),
      agency: options.agency,
      currentRecipient: options.recipientAgent,
      currentRecipientSelectedAt: options.recipientAgentSelectedAt,
      sessionID: props.sessionID,
      messages: sync.data.message[props.sessionID] ?? [],
      partsByMessage: sync.data.part,
    })
  })
  const effectiveHandoffRecipient = createMemo(() => {
    const handoff = handoffRecipient()
    if (handoff && handoff.sessionID === props.sessionID) return handoff
    return sessionHandoffRecipient()
  })
  const frameworkRecipientLabel = createMemo(() => {
    if (!frameworkMode()) return undefined
    const options = agencyProviderOptions()
    const handoff = effectiveHandoffRecipient()
    if (handoff) {
      const agency = frameworkRecipientDiscovery().find((item) => item.id === options.agency)
      const recipient = agency?.agents.find((agent) => agent.id === handoff.agent)
      return recipient?.name ?? handoff.agent
    }

    const selection = resolveAgencyTargetSelection({
      agencies: frameworkRecipientDiscovery(),
      configuredAgency: options.agency,
      configuredRecipient: options.recipientAgent,
    })
    return selection?.label ?? options.recipientAgent
  })

  createEffect(
    on(
      () => props.sessionID,
      () => {
        setHandoffRecipient(undefined)
        assistantMessagesByID.clear()
      },
    ),
  )

  createEffect(() => {
    const handoff = handoffRecipient()
    if (!handoff) return
    const options = agencyProviderOptions()
    if (options.recipientAgentSelectedAt === handoff.selectedAt) return
    if (options.recipientAgent === handoff.agent) return
    setHandoffRecipient(undefined)
  })

  function partsWithUpdatedPart(updated: (typeof sync.data.part)[string][number]) {
    const current = sync.data.part?.[updated.messageID] ?? []
    const index = current.findIndex((part) => part.id === updated.id)
    if (index === -1) return [...current, updated]
    return current.map((part, currentIndex) => (currentIndex === index ? updated : part))
  }

  function adoptAgencyHandoffRecipient(info: AgencyAssistantMessageInfo, parts: (typeof sync.data.part)[string]) {
    if (info.sessionID !== props.sessionID) return
    if (info.role !== "assistant") return
    if (info.providerID !== AgencySwarmAdapter.PROVIDER_ID) return

    const options = agencyProviderOptions()
    const handoffAgent = resolveAgencyHandoffRecipientFromParts(parts) ?? info.agent
    if (!handoffAgent) return
    if (
      !shouldAdoptAgencyHandoffRecipient({
        frameworkMode: frameworkMode(),
        agency: options.agency,
        currentRecipient: options.recipientAgent,
        assistantAgent: handoffAgent,
        handoffEvidence: hasAgencyHandoffEvidence(parts),
      })
    ) {
      return
    }

    setHandoffRecipient({
      sessionID: info.sessionID,
      messageID: info.id,
      agent: handoffAgent,
      selectedAt: options.recipientAgentSelectedAt,
    })
  }

  function captureTaskSucceeded(messageID: string) {
    const task = taskTelemetryByMessageID.get(messageID)
    if (!task) return
    taskTelemetryByMessageID.delete(messageID)
    void Telemetry.capture("task_succeeded", {
      ...task.properties,
      duration_bucket: Telemetry.durationBucket(Date.now() - task.started),
    })
  }

  function captureTaskFailed(messageID: string, error: unknown) {
    const task = taskTelemetryByMessageID.get(messageID)
    if (!task) return
    taskTelemetryByMessageID.delete(messageID)
    void Telemetry.capture("task_failed", {
      ...task.properties,
      duration_bucket: Telemetry.durationBucket(Date.now() - task.started),
      error_bucket: Telemetry.errorBucket(error),
    })
  }

  function hasLocalToolCalls(parts: readonly Part[]) {
    return parts.some((part) => part.type === "tool" && part.metadata?.providerExecuted !== true)
  }

  function isCancelledAssistantCompletion(info: AssistantMessage) {
    return info.finish === "cancelled" || info.error?.name === "MessageAbortedError"
  }

  function isFinalAssistantCompletion(info: AssistantMessage, parts: readonly Part[]) {
    if (info.finish === undefined || ["tool-calls", "cancelled"].includes(info.finish)) return false
    if (info.time.completed === undefined) return false
    if (info.providerID !== AgencySwarmAdapter.PROVIDER_ID && hasLocalToolCalls(parts)) return false
    return true
  }

  function taskError(error: AssistantMessage["error"]) {
    return error?.data ?? error
  }

  function sdkError(error: unknown, result: { response?: { status?: number } }) {
    return {
      data: error,
      status: result.response?.status,
    }
  }

  function captureTaskFromAssistant(info: AssistantMessage, parts: readonly Part[]) {
    const task = taskTelemetryByMessageID.get(info.parentID)
    if (!task) return
    if (isCancelledAssistantCompletion(info)) {
      taskTelemetryByMessageID.delete(info.parentID)
      return
    }
    if (info.error) {
      captureTaskFailed(info.parentID, taskError(info.error))
      return
    }
    if (isFinalAssistantCompletion(info, parts)) captureTaskSucceeded(info.parentID)
  }

  function captureTaskCompleted(
    messageID: string,
    result: Awaited<ReturnType<typeof sdk.client.session.prompt>> | undefined,
  ) {
    if (result && "error" in result && result.error) {
      captureTaskFailed(messageID, sdkError(result.error, result))
      return
    }
    const info = result?.data?.info
    if (!info) {
      captureTaskFailed(messageID, undefined)
      return
    }
    if (isCancelledAssistantCompletion(info)) {
      taskTelemetryByMessageID.delete(messageID)
      return
    }
    if (info?.error) {
      captureTaskFailed(messageID, taskError(info.error))
      return
    }
    if (isFinalAssistantCompletion(info, result?.data?.parts ?? [])) {
      captureTaskSucceeded(messageID)
      return
    }
    captureTaskFailed(messageID, undefined)
  }

  onCleanup(
    event.on("message.updated", (evt) => {
      const info = evt.properties.info
      const parts = sync.data.part?.[info.id] ?? []
      if (info.role === "assistant") captureTaskFromAssistant(info, parts)
      assistantMessagesByID.set(info.id, info)
      adoptAgencyHandoffRecipient(info, parts)
    }),
  )
  onCleanup(
    event.on("message.part.updated", (evt) => {
      const part = evt.properties.part
      if (part.sessionID !== props.sessionID) return
      const info =
        assistantMessagesByID.get(part.messageID) ??
        sync.data.message?.[part.sessionID]?.find((message) => message.id === part.messageID)
      if (!info) return
      adoptAgencyHandoffRecipient(info, partsWithUpdatedPart(part))
    }),
  )
  const fileContextEnabled = createMemo(() => kv.get("file_context_enabled", true))
  const [dismissedEditorSelectionKey, setDismissedEditorSelectionKey] = createSignal<string>()
  const editorContext = createMemo(() => {
    const selection = fileContextEnabled() ? editor.selection() : undefined
    if (!selection) return
    return editorSelectionKey(selection) === dismissedEditorSelectionKey() ? undefined : selection
  })
  const editorPath = createMemo(() => editorContext()?.filePath)
  const editorSelectionLabel = createMemo(() => {
    const ranges = editorContext()?.ranges
    if (!ranges) return
    const first = ranges.find(hasEditorRangeSelection) ?? ranges[0]
    if (!first) return
    return [getEditorRangeLabel(first), ranges.length > 1 ? `+${ranges.length - 1}` : undefined]
      .filter(Boolean)
      .join(" ")
  })
  const editorFileLabel = createMemo(() => {
    const value = editorPath()
    if (!value) return
    const filename = path.basename(value)
    const file = /^index\.[^./]+$/.test(filename)
      ? [path.basename(path.dirname(value)), filename].filter(Boolean).join("/")
      : filename
    return `${file.split(path.sep).join("/")}${editorSelectionLabel() ?? ""}`
  })
  const editorFileLabelDisplay = createMemo(() => {
    const file = editorFileLabel()
    if (!file) return
    return Locale.truncateMiddle(file, Math.max(12, Math.min(48, Math.floor(dimensions().width / 3))))
  })
  const editorContextLabelState = createMemo(() => editor.labelState())
  const [workspaceSelection, setWorkspaceSelection] = createSignal<WorkspaceSelection>()
  const [workspaceCreating, setWorkspaceCreating] = createSignal(false)
  const [workspaceCreatingDots, setWorkspaceCreatingDots] = createSignal(3)
  const [warpNotice, setWarpNotice] = createSignal<string>()
  const [cursorVersion, setCursorVersion] = createSignal(0)
  const currentProviderLabel = createMemo(() => {
    const current = local.model.current()
    const provider = local.model.parsed().provider
    if (!current) return provider
    if (
      current.providerID === AgencySwarmAdapter.PROVIDER_ID &&
      current.modelID === AgencySwarmAdapter.DEFAULT_MODEL_ID
    ) {
      return ""
    }
    return consoleManagedProviderLabel(sync.data.console_state.consoleManagedProviders, current.providerID, provider)
  })
  const hasRightContent = createMemo(() => Boolean(props.right))
  const defaultWorkspaceID = createMemo(() => props.workspaceID ?? project.workspace.current())

  function selectWorkspace(selection: WorkspaceSelection | undefined) {
    setWorkspaceSelection(selection)
  }

  function setCreatingWorkspace(creating: boolean) {
    setWorkspaceCreating(creating)
  }

  function showWarpNotice(name: string) {
    setWarpNotice(`Warped to ${name}`)
    setTimeout(() => setWarpNotice(undefined), 4000)
  }

  async function createWorkspace(selection: Extract<WorkspaceSelection, { type: "new" }>) {
    setCreatingWorkspace(true)
    const result = await sdk.client.experimental.workspace
      .create({ type: selection.workspaceType, branch: null })
      .catch(() => undefined)
    if (result == undefined || result.error || !result.data) {
      selectWorkspace(undefined)
      setCreatingWorkspace(false)
      toast.show({
        message: "Creating workspace failed",
        variant: "error",
      })
      return
    }

    await project.workspace.sync()
    const workspace = result.data
    selectWorkspace({
      type: "existing",
      workspaceID: workspace.id,
      workspaceType: workspace.type,
      workspaceName: workspace.name,
    })
    setCreatingWorkspace(false)
    return workspace
  }

  async function warpSession(selection: WorkspaceSelection) {
    if (!props.sessionID) {
      selectWorkspace(selection)
      dialog.clear()
      if (selection.type === "new") void createWorkspace(selection)
      return
    }
    const sourceWorkspaceID = project.workspace.current()
    const copyChanges = await confirmWorkspaceFileChanges({ dialog, sdk, sourceWorkspaceID })
    if (copyChanges === undefined) return
    selectWorkspace(selection)
    dialog.clear()

    const workspace =
      selection.type === "none"
        ? { id: null, name: "local project" }
        : selection.type === "existing"
          ? { id: selection.workspaceID, name: selection.workspaceName }
          : await createWorkspace(selection)
    if (!workspace) return

    const warped = await warpWorkspaceSession({
      dialog,
      sdk,
      sync,
      project,
      toast,
      sourceWorkspaceID,
      workspaceID: workspace.id,
      sessionID: props.sessionID,
      copyChanges,
    })
    if (warped) showWarpNotice(workspace.name)
  }

  createEffect(() => {
    if (!workspaceCreating()) {
      setWorkspaceCreatingDots(3)
      return
    }
    const timer = setInterval(() => setWorkspaceCreatingDots((dots) => (dots % 3) + 1), 1000)
    onCleanup(() => clearInterval(timer))
  })

  function promptModelWarning() {
    const agency = frameworkMode()
    toast.show({
      variant: "warning",
      message: agency ? "Connect to an agency-swarm server to send prompts" : "Connect a provider to send prompts",
      duration: 3000,
    })
    if (agency || sync.data.provider.length === 0) {
      dialog.replace(() => (agency ? <DialogAgencySwarmConnect /> : <DialogProviderConnect />))
    }
  }

  function dismissEditorContext() {
    setDismissedEditorSelectionKey(editorSelectionKey(editorContext()))
    editor.clearSelection()
  }
  const fileStyleId = syntax().getStyleId("extmark.file")!
  const agentStyleId = syntax().getStyleId("extmark.agent")!
  const pasteStyleId = syntax().getStyleId("extmark.paste")!
  let promptPartTypeId = 0
  event.on(TuiEvent.PromptAppend.type, (evt) => {
    if (!input || input.isDestroyed) return
    input.insertText(evt.properties.text)
    setTimeout(() => {
      // setTimeout is a workaround and needs to be addressed properly
      if (!input || input.isDestroyed) return
      input.getLayoutNode().markDirty()
      input.gotoBufferEnd()
      renderer.requestRender()
    }, 0)
  })

  createEffect(() => {
    if (!input || input.isDestroyed) return
    if (props.disabled) input.cursorColor = theme.backgroundElement
    if (!props.disabled) input.cursorColor = theme.text
  })

  const lastUserMessage = createMemo(() => {
    if (!props.sessionID) return undefined
    const messages = sync.data.message[props.sessionID]
    if (!messages) return undefined
    return messages.findLast((m): m is UserMessage => m.role === "user")
  })

  const usage = createMemo(() => {
    if (!props.sessionID) return
    const session = sync.session.get(props.sessionID)
    const msg = sync.data.message[props.sessionID] ?? []
    const last = msg.findLast((item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0)
    if (!last) return

    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    if (tokens <= 0) return

    const model = sync.data.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
    const pct = model?.limit.context ? `${Math.round((tokens / model.limit.context) * 100)}%` : undefined
    const cost = session?.cost ?? 0
    return {
      context: pct ? `${Locale.number(tokens)} (${pct})` : Locale.number(tokens),
      cost: cost > 0 ? money.format(cost) : undefined,
    }
  })

  const [store, setStore] = createStore<{
    prompt: PromptInfo
    mode: "normal" | "shell"
    extmarkToPartIndex: Map<number, number>
    interrupt: number
    placeholder: number
  }>({
    placeholder: randomIndex(list().length),
    prompt: {
      input: "",
      parts: [],
    },
    mode: "normal",
    extmarkToPartIndex: new Map(),
    interrupt: 0,
  })
  const showAgencyReconnect = createMemo(() => store.mode === "normal" && agencyConnection.requiresReconnect())

  createEffect(
    on(
      () => props.sessionID,
      () => {
        setStore("placeholder", randomIndex(list().length))
      },
      { defer: true },
    ),
  )

  // Initialize agent/model/variant from last user message when session changes
  let syncedSessionID: string | undefined
  createEffect(() => {
    const sessionID = props.sessionID
    const msg = lastUserMessage()

    if (sessionID !== syncedSessionID) {
      if (!sessionID || !msg) return

      syncedSessionID = sessionID

      // Only set agent if it's a primary agent (not a subagent)
      const isPrimaryAgent = local.agent.list().some((x) => x.name === msg.agent)
      if (msg.agent && isPrimaryAgent) {
        // Keep command line --agent if specified.
        if (!args.agent) local.agent.set(msg.agent)
        if (msg.model) {
          local.model.set(msg.model, { explicit: frameworkMode() })
          local.model.variant.set(msg.model.variant)
        }
      }
    }
  })

  const promptCommands = createMemo(() =>
    [
      {
        title: "Clear prompt",
        name: "prompt.clear",
        category: "Prompt",
        hidden: true,
        run: () => {
          clearPrompt()
          dialog.clear()
        },
      },
      {
        title: "Submit prompt",
        name: "prompt.submit",
        category: "Prompt",
        hidden: true,
        run: async () => {
          if (!input.focused) return
          const handled = await submit()
          if (!handled) return

          dialog.clear()
        },
      },
      {
        title: "Remove editor context",
        name: "prompt.editor_context.clear",
        category: "Prompt",
        enabled: Boolean(editorContext()),
        run: () => {
          dismissEditorContext()
          dialog.clear()
        },
      },
      {
        title: "Paste",
        name: "prompt.paste",
        category: "Prompt",
        hidden: true,
        run: async (ctx: CommandContext<Renderable, KeyEvent>) => {
          ctx.event.preventDefault()
          ctx.event.stopPropagation()
          const content = await Clipboard.read()
          if (content?.mime.startsWith("image/")) {
            await pasteAttachment({
              filename: "clipboard",
              mime: content.mime,
              content: content.data,
            })
            return
          }
          if (content?.mime === "text/plain") {
            await pasteInputText(content.data)
          }
        },
      },
      {
        title: "Interrupt session",
        name: "session.interrupt",
        category: "Session",
        hidden: true,
        enabled: status().type !== "idle",
        run: () => {
          if (auto()?.visible) return
          if (!input.focused) return
          // TODO: this should be its own command
          if (store.mode === "shell") {
            setStore("mode", "normal")
            return
          }
          if (!props.sessionID) return

          setStore("interrupt", store.interrupt + 1)

          setTimeout(() => {
            setStore("interrupt", 0)
          }, 5000)

          if (store.interrupt >= 2) {
            const sessionID = props.sessionID
            void cancelQueuedRunModeMessages({
              frameworkMode: frameworkMode(),
              messages: sync.data.message[sessionID] ?? [],
              parts: sync.data.part,
              abort: async () => {
                await sdk.client.session.abort({ sessionID })
              },
              deleteMessage: async (messageID) => {
                await sdk.client.session.deleteMessage({
                  sessionID,
                  messageID,
                })
              },
            })
              .then((queued) => {
                if (queued.length === 0) return
                toast.show({
                  message: `Cancelled ${queued.length} queued message${queued.length === 1 ? "" : "s"}`,
                  variant: "success",
                  duration: 3000,
                })
              })
              .catch((error) => {
                toast.show({
                  message: toErrorMessage(error),
                  variant: "error",
                  duration: 5000,
                })
              })
            setStore("interrupt", 0)
          }
          dialog.clear()
        },
      },
      {
        title: "Open editor",
        category: "Session",
        enabled: !frameworkMode(),
        hidden: frameworkMode(),
        name: "prompt.editor",
        slashName: "editor",
        run: async () => {
          dialog.clear()

          // replace summarized text parts with the actual text
          const text = store.prompt.parts
            .filter((p) => p.type === "text")
            .reduce((acc, p) => {
              if (!p.source) return acc
              return acc.replace(p.source.text.value, p.text)
            }, store.prompt.input)

          const nonTextParts = store.prompt.parts.filter((p) => p.type !== "text")

          const value = text
          const content = await Editor.open({ value, renderer })
          if (!content) return

          input.setText(content)

          // Update positions for nonTextParts based on their location in new content
          // Filter out parts whose virtual text was deleted
          // this handles a case where the user edits the text in the editor
          // such that the virtual text moves around or is deleted
          const updatedNonTextParts = nonTextParts
            .map((part) => {
              let virtualText = ""
              if (part.type === "file" && part.source?.text) {
                virtualText = part.source.text.value
              } else if (part.type === "agent" && part.source) {
                virtualText = part.source.value
              }

              if (!virtualText) return part

              const newStart = content.indexOf(virtualText)
              // if the virtual text is deleted, remove the part
              if (newStart === -1) return null

              const newEnd = newStart + virtualText.length

              if (part.type === "file" && part.source?.text) {
                return {
                  ...part,
                  source: {
                    ...part.source,
                    text: {
                      ...part.source.text,
                      start: newStart,
                      end: newEnd,
                    },
                  },
                }
              }

              if (part.type === "agent" && part.source) {
                return {
                  ...part,
                  source: {
                    ...part.source,
                    start: newStart,
                    end: newEnd,
                  },
                }
              }

              return part
            })
            .filter((part) => part !== null)

          setStore("prompt", {
            input: content,
            // keep only the non-text parts because the text parts were
            // already expanded inline
            parts: updatedNonTextParts,
          })
          restoreExtmarksFromParts(updatedNonTextParts)
          input.cursorOffset = Bun.stringWidth(content)
        },
      },
      {
        title: "Skills",
        name: "prompt.skills",
        category: "Prompt",
        slashName: "skills",
        run: () => {
          dialog.replace(() => (
            <DialogSkill
              onSelect={(skill) => {
                input.setText(`/${skill} `)
                setStore("prompt", {
                  input: `/${skill} `,
                  parts: [],
                })
                input.gotoBufferEnd()
              }}
            />
          ))
        },
      },
      {
        title: "Warp",
        desc: "Change the workspace for the session",
        name: "workspace.set",
        category: "Session",
        enabled: Flag.OPENCODE_EXPERIMENTAL_WORKSPACES,
        slashName: "warp",
        run: () => {
          void openWorkspaceSelect({
            dialog,
            sdk,
            sync,
            project,
            toast,
            onSelect: (selection) => {
              void warpSession(selection)
            },
          })
        },
      },
    ].map((entry) => ({
      namespace: "palette",
      ...entry,
    })),
  )

  useBindings(() => ({
    commands: promptCommands(),
  }))

  useBindings(() => ({
    enabled: command.matcher,
    bindings: tuiConfig.keybinds.gather("prompt.palette", [
      "prompt.submit",
      "prompt.editor",
      "prompt.editor_context.clear",
      "prompt.stash",
      "prompt.stash.pop",
      "prompt.stash.list",
      "session.interrupt",
      "workspace.set",
    ]),
  }))

  const ref: PromptRef = {
    get focused() {
      return input.focused
    },
    get current() {
      return store.prompt
    },
    focus() {
      input.focus()
    },
    blur() {
      input.blur()
    },
    set(prompt) {
      input.setText(prompt.input)
      setStore("prompt", prompt)
      restoreExtmarksFromParts(prompt.parts)
      input.gotoBufferEnd()
    },
    reset() {
      input.clear()
      input.extmarks.clear()
      setStore("prompt", {
        input: "",
        parts: [],
      })
      setStore("extmarkToPartIndex", new Map())
    },
    submit() {
      void submit()
    },
  }

  onMount(() => {
    const saved = stashed
    stashed = undefined
    if (store.prompt.input) return
    if (saved && saved.prompt.input) {
      input.setText(saved.prompt.input)
      setStore("prompt", saved.prompt)
      restoreExtmarksFromParts(saved.prompt.parts)
      input.cursorOffset = saved.cursor
    }
  })

  onCleanup(() => {
    if (store.prompt.input) {
      stashed = { prompt: unwrap(store.prompt), cursor: input.cursorOffset }
    }
    setInputTarget(undefined)
    props.ref?.(undefined)
  })

  createEffect(() => {
    if (!input || input.isDestroyed) return
    if (props.visible === false || dialog.stack.length > 0) {
      if (input.focused) input.blur()
      return
    }

    // Slot/plugin updates can remount the background prompt while a dialog is open.
    // Keep focus with the dialog and let the prompt reclaim it after the dialog closes.
    if (!input.focused) input.focus()
  })

  createEffect(() => {
    if (!input || input.isDestroyed) return
    input.traits = {
      ...input.traits,
      ...computePromptTraits({
        mode: store.mode,
        autocompleteVisible: !!auto()?.visible,
        hasAttachmentPrompt: hasAttachmentPrompt(),
      }),
    }
  })

  const isDialogBlockingPrompt = () => dialog.stack.length > 0

  function hasAttachmentPrompt() {
    if (store.prompt.parts.some((part) => part.type === "file")) return true
    return /^\[(?:Image|PDF) \d+\]/.test(store.prompt.input.trimStart())
  }

  function restoreExtmarksFromParts(parts: PromptInfo["parts"]) {
    input.extmarks.clear()
    setStore("extmarkToPartIndex", new Map())

    parts.forEach((part, partIndex) => {
      let start = 0
      let end = 0
      let virtualText = ""
      let styleId: number | undefined

      if (part.type === "file" && part.source?.text) {
        start = part.source.text.start
        end = part.source.text.end
        virtualText = part.source.text.value
        styleId = fileStyleId
      } else if (part.type === "agent" && part.source) {
        start = part.source.start
        end = part.source.end
        virtualText = part.source.value
        styleId = agentStyleId
      } else if (part.type === "text" && part.source?.text) {
        start = part.source.text.start
        end = part.source.text.end
        virtualText = part.source.text.value
        styleId = pasteStyleId
      }

      if (virtualText) {
        const extmarkId = input.extmarks.create({
          start,
          end,
          virtual: true,
          styleId,
          typeId: promptPartTypeId,
        })
        setStore("extmarkToPartIndex", (map: Map<number, number>) => {
          const newMap = new Map(map)
          newMap.set(extmarkId, partIndex)
          return newMap
        })
      }
    })
  }

  function syncExtmarksWithPromptParts() {
    const allExtmarks = input.extmarks.getAllForTypeId(promptPartTypeId)
    setStore(
      produce((draft) => {
        const newMap = new Map<number, number>()
        const newParts: typeof draft.prompt.parts = []

        for (const extmark of allExtmarks) {
          const partIndex = draft.extmarkToPartIndex.get(extmark.id)
          if (partIndex !== undefined) {
            const part = draft.prompt.parts[partIndex]
            if (part) {
              if (part.type === "agent" && part.source) {
                part.source.start = extmark.start
                part.source.end = extmark.end
              } else if (part.type === "file" && part.source?.text) {
                part.source.text.start = extmark.start
                part.source.text.end = extmark.end
              } else if (part.type === "text" && part.source?.text) {
                part.source.text.start = extmark.start
                part.source.text.end = extmark.end
              }
              newMap.set(extmark.id, newParts.length)
              newParts.push(part)
            }
          }
        }

        draft.extmarkToPartIndex = newMap
        draft.prompt.parts = newParts
      }),
    )
  }

  const stashCommands = createMemo(() =>
    [
      {
        title: "Stash prompt",
        name: "prompt.stash",
        category: "Prompt",
        enabled: !!store.prompt.input,
        run: () => {
          if (!store.prompt.input) return
          stash.push({
            input: store.prompt.input,
            parts: store.prompt.parts,
          })
          input.extmarks.clear()
          input.clear()
          setStore("prompt", { input: "", parts: [] })
          setStore("extmarkToPartIndex", new Map())
          dialog.clear()
        },
      },
      {
        title: "Stash pop",
        name: "prompt.stash.pop",
        category: "Prompt",
        enabled: stash.list().length > 0,
        run: () => {
          const entry = stash.pop()
          if (entry) {
            input.setText(entry.input)
            setStore("prompt", { input: entry.input, parts: entry.parts })
            restoreExtmarksFromParts(entry.parts)
            input.gotoBufferEnd()
          }
          dialog.clear()
        },
      },
      {
        title: "Stash list",
        name: "prompt.stash.list",
        category: "Prompt",
        enabled: stash.list().length > 0,
        run: () => {
          dialog.replace(() => (
            <DialogStash
              onSelect={(entry) => {
                input.setText(entry.input)
                setStore("prompt", { input: entry.input, parts: entry.parts })
                restoreExtmarksFromParts(entry.parts)
                input.gotoBufferEnd()
              }}
            />
          ))
        },
      },
    ].map((entry) => ({
      namespace: "palette",
      ...entry,
    })),
  )

  useBindings(() => ({
    commands: stashCommands(),
  }))

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: inputTarget() !== undefined && !props.disabled,
      bindings: tuiConfig.keybinds.get("prompt.paste"),
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: inputTarget() !== undefined && !props.disabled && store.prompt.input !== "",
      bindings: tuiConfig.keybinds.get("prompt.clear"),
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: (() => {
        cursorVersion()
        return (
          inputTarget() !== undefined &&
          !props.disabled &&
          store.mode === "normal" &&
          !auto()?.visible &&
          input?.visualCursor.offset === 0
        )
      })(),
      bindings: [
        {
          key: "!",
          desc: "Shell mode",
          group: "Prompt",
          cmd: () => {
            setStore("placeholder", randomIndex(shell().length))
            setStore("mode", "shell")
          },
        },
      ],
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: inputTarget() !== undefined && store.mode === "shell",
      bindings: [{ key: "escape", desc: "Exit shell mode", group: "Prompt", cmd: () => setStore("mode", "normal") }],
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: (() => {
        cursorVersion()
        return inputTarget() !== undefined && store.mode === "shell" && input?.visualCursor.offset === 0
      })(),
      bindings: [{ key: "backspace", desc: "Exit shell mode", group: "Prompt", cmd: () => setStore("mode", "normal") }],
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: (() => {
        cursorVersion()
        return inputTarget() !== undefined && !props.disabled && !auto()?.visible && input !== undefined
      })(),
      commands: [
        {
          name: "prompt.history.previous",
          title: "Previous prompt history",
          category: "Prompt",
          run() {
            if (input.cursorOffset !== 0) {
              if (input.scrollY + input.visualCursor.visualRow === 0) input.cursorOffset = 0
              return false
            }

            const item = history.move(-1, input.plainText)
            if (!item) return false
            input.setText(item.input)
            setStore("prompt", item)
            setStore("mode", item.mode ?? "normal")
            restoreExtmarksFromParts(item.parts)
            input.cursorOffset = 0
          },
        },
      ],
      bindings: tuiConfig.keybinds.get("prompt.history.previous"),
    }
  })

  useBindings(() => {
    return {
      target: inputTarget,
      enabled: (() => {
        cursorVersion()
        return inputTarget() !== undefined && !props.disabled && !auto()?.visible && input !== undefined
      })(),
      commands: [
        {
          name: "prompt.history.next",
          title: "Next prompt history",
          category: "Prompt",
          run() {
            if (input.cursorOffset !== input.plainText.length) {
              if (
                input.scrollY + input.visualCursor.visualRow ===
                Math.max(0, input.editorView.getTotalVirtualLineCount() - 1)
              )
                input.cursorOffset = input.plainText.length
              return false
            }

            const item = history.move(1, input.plainText)
            if (!item) return false
            input.setText(item.input)
            setStore("prompt", item)
            setStore("mode", item.mode ?? "normal")
            restoreExtmarksFromParts(item.parts)
            input.cursorOffset = input.plainText.length
          },
        },
      ],
      bindings: tuiConfig.keybinds.get("prompt.history.next"),
    }
  })

  let submitting = false
  async function submit() {
    // Prevent overlapping invocations (e.g. a double-pressed Enter, or the
    // input's native onSubmit racing another dispatch). Without this guard,
    // a second call slips past the empty-input check before the first call
    // clears `store.prompt.input`, then awaits its own `session.create` and
    // ultimately reads the now-empty store — sending a phantom empty prompt
    // to a freshly created session.
    if (submitting) return false
    submitting = true
    try {
      return await submitInner()
    } finally {
      submitting = false
    }
  }

  async function submitInner() {
    setWarpNotice(undefined)

    // IME: double-defer may fire before onContentChange flushes the last
    // composed character (e.g. Korean hangul) to the store, so read
    // plainText directly and sync before any downstream reads.
    if (input && !input.isDestroyed && input.plainText !== store.prompt.input) {
      setStore("prompt", "input", input.plainText)
      syncExtmarksWithPromptParts()
    }
    if (props.disabled) return false
    if (isDialogBlockingPrompt()) return false
    if (workspaceCreating()) return false
    if (!store.prompt.input) return false
    if (auto()?.visible && !hasAttachmentPrompt()) {
      const first = store.prompt.input.split(/\s|\n/, 1)[0]
      const exact = first.startsWith("/")
        ? command.slashes().find((item) => [item.display, ...(item.aliases ?? [])].includes(first))
        : undefined
      if (!exact) return false
    }
    const agent = local.agent.current()
    if (!agent) return false
    const trimmed = store.prompt.input.trim()
    if (trimmed === "exit" || trimmed === "quit" || trimmed === ":q") {
      void exit()
      return true
    }
    let inputText = store.prompt.input

    // Expand pasted text inline before submitting
    const allExtmarks = input.extmarks.getAllForTypeId(promptPartTypeId)
    const sortedExtmarks = allExtmarks.sort((a: { start: number }, b: { start: number }) => b.start - a.start)

    for (const extmark of sortedExtmarks) {
      const partIndex = store.extmarkToPartIndex.get(extmark.id)
      if (partIndex !== undefined) {
        const part = store.prompt.parts[partIndex]
        if (part?.type === "text" && part.text) {
          const before = inputText.slice(0, extmark.start)
          const after = inputText.slice(extmark.end)
          inputText = before + part.text + after
        }
      }
    }

    // Filter out text parts (pasted content) since they're now expanded inline
    const nonTextParts = store.prompt.parts.filter((part) => part.type !== "text")
    const firstLineEnd = inputText.indexOf("\n")
    const firstLine = firstLineEnd === -1 ? inputText : inputText.slice(0, firstLineEnd)
    const firstWord = firstLine.split(" ")[0]
    const localSlash = firstWord.startsWith("/")
      ? command.slashes().find((item) => [item.display, ...(item.aliases ?? [])].includes(firstWord))
      : undefined

    const clearSubmittedPrompt = (submittedMode: typeof store.mode) => {
      history.append({
        ...store.prompt,
        mode: submittedMode,
      })
      input.extmarks.clear()
      setStore("prompt", {
        input: "",
        parts: [],
      })
      setStore("extmarkToPartIndex", new Map())
      props.onSubmit?.()
      input.clear()
    }

    if (localSlash) {
      localSlash.onSelect()
      clearSubmittedPrompt(store.mode)
      return true
    }

    const selectedModel = local.model.current()
    if (!selectedModel) {
      void promptModelWarning()
      return false
    }
    const authProviders =
      selectedModel.providerID === "openrouter"
        ? sync.data.provider.filter(
            (provider) => provider.id === AgencySwarmAdapter.PROVIDER_ID || provider.id === "openrouter",
          )
        : sync.data.provider
    const openrouterEnvNames =
      selectedModel.providerID === "openrouter"
        ? [
            ...new Set([
              ...authProviders.filter((provider) => provider.id === "openrouter").flatMap((provider) => provider.env),
              "OPENROUTER_API_KEY",
            ]),
          ]
        : []
    const authEnv =
      selectedModel.providerID === "openrouter"
        ? Object.fromEntries(openrouterEnvNames.map((name) => [name, process.env[name]]))
        : process.env
    if (frameworkMode() && AgencySwarmOllama.isModel(selectedModel)) {
      try {
        await AgencySwarmOllama.ensure(selectedModel.modelID, {
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
            modelID: selectedModel.modelID,
          })
          if (!downloaded) return false
        } else {
          toast.show({
            variant: "warning",
            message: error instanceof Error ? error.message : String(error),
            duration: 8000,
          })
          return false
        }
      }
    }
    const productProviderID = frameworkMode() ? AgencySwarmAdapter.PROVIDER_ID : selectedModel.providerID

    const currentMode = store.mode
    const variant = local.model.variant.current()
    const serverSlashCommand = inputText.startsWith("/")
      ? iife(() => {
          const commandName = firstWord.slice(1)
          return sync.data.command.find((x) => x.name === commandName)
        })
      : undefined

    if (
      serverSlashCommand &&
      shouldHideNativeCommandInRunMode({
        frameworkMode: frameworkMode(),
        name: serverSlashCommand.name,
        source: serverSlashCommand.source,
      })
    ) {
      toast.show({
        variant: "warning",
        message: `/${serverSlashCommand.name} is available in Agent Builder or Plan mode.`,
        duration: 4000,
      })
      return false
    }

    const isServerSlashCommand = !!serverSlashCommand

    if (
      shouldBlockAgencyPromptSubmit({
        currentProviderID: productProviderID,
        configuredModel: sync.data.config.model,
        agentModel: local.agent.current()?.model,
        providers: authProviders,
        providerAuth: sync.data.provider_auth,
        mode: currentMode,
        isSlashCommand: isServerSlashCommand,
        env: authEnv,
      })
    ) {
      toast.show({
        variant: "warning",
        message: "No provider credential is configured. Run /auth to add it.",
        duration: 4000,
      })
      dialog.replace(() => <DialogAuth />)
      return false
    }

    if (currentMode !== "shell" && agencyConnection.requiresReconnect()) {
      toast.show({
        variant: "warning",
        message: "Reconnect to a local agency-swarm server before sending a message",
        duration: 4000,
      })
      agencyConnection.openConnectDialog()
      return false
    }

    const workspaceSession = props.sessionID ? sync.session.get(props.sessionID) : undefined
    const workspaceID = workspaceSession?.workspaceID
    const workspaceStatus = workspaceID ? (project.workspace.status(workspaceID) ?? "error") : undefined
    if (props.sessionID && workspaceID && workspaceStatus !== "connected") {
      dialog.replace(() => (
        <DialogWorkspaceUnavailable
          onRestore={() => {
            void openWorkspaceSelect({
              dialog,
              sdk,
              sync,
              project,
              toast,
              onSelect: (selection) => {
                void warpSession(selection)
              },
            })
            return false
          }}
        />
      ))
      return false
    }

    const submittedPrompt = structuredClone(unwrap(store.prompt))
    const savedPrompt = { input: store.prompt.input, parts: [...store.prompt.parts] }
    let sessionID = props.sessionID
    let createdSessionID: string | undefined
    let navigatedToCreatedSession = false
    let navigateTimer: ReturnType<typeof setTimeout> | undefined
    if (sessionID == null) {
      const workspace = workspaceSelection()
      const workspaceID = iife(() => {
        if (!workspace) return defaultWorkspaceID()
        if (workspace.type === "none") return undefined
        if (workspace.type === "existing") return workspace.workspaceID
        return undefined
      })

      const res = await sdk.client.session.create({
        workspace: workspaceID,
        agent: effectiveAgentName(),
        model: {
          providerID: selectedModel.providerID,
          id: selectedModel.modelID,
          variant,
        },
      })

      if (res.error) {
        toast.show({
          message: "Creating a session failed.",
          variant: "error",
        })

        return false
      }

      sessionID = res.data.id
      createdSessionID = sessionID
    }

    const messageID = MessageID.ascending()
    void AgencySwarmRunSession.sync({
      sessionID,
      providerID: productProviderID,
      directory: process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV],
    })

    const editorSelection = editorContext()
    const editorParts =
      editorSelection && editor.labelState() === "pending"
        ? [
            {
              id: PartID.ascending(),
              type: "text" as const,
              text: formatEditorContext(editorSelection),
              synthetic: true,
              metadata: {
                kind: "editor_context",
                source: editorSelection.source ?? "editor",
                filePath: editorSelection.filePath,
                ranges: editorSelection.ranges,
              },
            },
          ]
        : []
    const capturePromptSubmitted = (type: "prompt" | "server_command" | "shell", mode: typeof currentMode) => {
      void Telemetry.capture("ui_prompt_submitted", {
        framework_mode: frameworkMode(),
        has_agent_parts: nonTextParts.some((part) => part.type === "agent"),
        has_editor_selection: !!editorSelection,
        has_file_parts: nonTextParts.some((part) => part.type === "file"),
        mode,
        provider_id: productProviderID,
        type,
      })
    }

    if (store.mode === "shell") {
      capturePromptSubmitted("shell", "shell")
      void sdk.client.session.shell({
        sessionID,
        agent: effectiveAgentName(),
        model: {
          providerID: selectedModel.providerID,
          modelID: selectedModel.modelID,
        },
        command: inputText,
      })
      setStore("mode", "normal")
    } else if (isServerSlashCommand) {
      const [command, ...firstLineArgs] = firstLine.split(" ")
      const restOfInput = firstLineEnd === -1 ? "" : inputText.slice(firstLineEnd + 1)
      const args = firstLineArgs.join(" ") + (restOfInput ? "\n" + restOfInput : "")

      capturePromptSubmitted("server_command", currentMode)
      if (serverSlashCommand.source === "command")
        captureCommand({ category: "Prompt", source: "slash", value: command })
      void sdk.client.session.command({
        sessionID,
        command: command.slice(1),
        arguments: args,
        agent: effectiveAgentName(),
        model: `${selectedModel.providerID}/${selectedModel.modelID}`,
        messageID,
        variant,
        parts: nonTextParts
          .filter((x) => x.type === "file")
          .map((x) => ({
            id: PartID.ascending(),
            ...x,
          })),
      })
    } else {
      const handoff = effectiveHandoffRecipient()
      const agencyRecipientAgent =
        frameworkMode() && handoff?.sessionID === sessionID && !nonTextParts.some((part) => part.type === "agent")
          ? handoff.agent
          : undefined
      const promptPayload: Parameters<typeof sdk.client.session.prompt>[0] & {
        $body_agencyRecipientAgent?: string
      } = {
        sessionID,
        ...selectedModel,
        messageID,
        agent: effectiveAgentName(),
        model: selectedModel,
        variant,
        $body_agencyRecipientAgent: agencyRecipientAgent,
        parts: [
          ...editorParts,
          {
            id: PartID.ascending(),
            type: "text",
            text: inputText,
          },
          ...nonTextParts.map(assign),
        ],
      }
      capturePromptSubmitted("prompt", currentMode)
      taskTelemetryByMessageID.set(messageID, {
        started: Date.now(),
        properties: {
          framework_mode: frameworkMode(),
          has_agent_parts: nonTextParts.some((part) => part.type === "agent"),
          has_file_parts: nonTextParts.some((part) => part.type === "file"),
          mode: "normal",
          provider_id: productProviderID,
        },
      })
      void sdk.client.session
        .prompt(promptPayload)
        .then((result) => {
          captureTaskCompleted(messageID, result)
          if (result?.error) throw result.error
          if (editorParts.length > 0) editor.markSelectionSent()
        })
        .catch((error) => {
          captureTaskFailed(messageID, error)
          setStore("prompt", savedPrompt)
          input.setText(savedPrompt.input)
          restoreExtmarksFromParts(savedPrompt.parts)
          const message = toErrorMessage(error)
          const shouldReopenAuth = shouldOpenAgencyAuthDialog({
            providerID: productProviderID,
            message,
          })
          if (navigateTimer) {
            clearTimeout(navigateTimer)
            navigateTimer = undefined
          }
          if (createdSessionID && shouldReopenAuth) {
            if (navigatedToCreatedSession) {
              route.navigate({
                type: "home",
                prompt: submittedPrompt,
              })
            }
            void sdk.client.session.delete({
              sessionID: createdSessionID,
            })
          }
          if (shouldReopenAuth) {
            toast.show({
              variant: "error",
              message: describeAgencyAuthFailure(message),
              duration: 5000,
            })
            dialog.replace(() => <DialogAuth />)
            return
          }
          toast.show({
            variant: "error",
            message,
            duration: 5000,
          })
        })
    }

    clearSubmittedPrompt(currentMode)

    // temporary hack to make sure the message is sent
    if (!props.sessionID) {
      if (editorParts.length > 0) editor.preserveSelectionFromNewSession()
      navigateTimer = setTimeout(() => {
        navigateTimer = undefined
        navigatedToCreatedSession = true
        route.navigate({
          type: "session",
          sessionID,
        })
      }, 50)
    }
    return true
  }
  const exit = useExit()

  function pasteText(text: string, virtualText: string) {
    const currentOffset = input.visualCursor.offset
    const extmarkStart = currentOffset
    const extmarkEnd = extmarkStart + virtualText.length

    input.insertText(virtualText + " ")

    const extmarkId = input.extmarks.create({
      start: extmarkStart,
      end: extmarkEnd,
      virtual: true,
      styleId: pasteStyleId,
      typeId: promptPartTypeId,
    })

    setStore(
      produce((draft) => {
        const partIndex = draft.prompt.parts.length
        draft.prompt.parts.push({
          type: "text" as const,
          text,
          source: {
            text: {
              start: extmarkStart,
              end: extmarkEnd,
              value: virtualText,
            },
          },
        })
        draft.extmarkToPartIndex.set(extmarkId, partIndex)
      }),
    )
  }

  async function pasteInputText(text: string) {
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    const pastedContent = normalizedText.trim()
    const filepath = iife(() => {
      const raw = pastedContent.replace(/^['"]+|['"]+$/g, "")
      if (raw.startsWith("file://")) {
        try {
          return fileURLToPath(raw)
        } catch {}
      }
      if (process.platform === "win32") return raw
      return raw.replace(/\\(.)/g, "$1")
    })
    const isUrl = /^(https?):\/\//.test(filepath)
    if (!isUrl) {
      try {
        const resolvedFilepath = path.resolve(filepath)
        const mime = await Filesystem.mimeType(resolvedFilepath)
        const filename = path.basename(resolvedFilepath)
        if (mime === "image/svg+xml") {
          const content = await Filesystem.readText(resolvedFilepath).catch(() => {})
          if (content) {
            pasteText(content, `[SVG: ${filename ?? "image"}]`)
            return
          }
        }
        if (mime.startsWith("image/") || mime === "application/pdf") {
          const content = await Filesystem.readArrayBuffer(resolvedFilepath)
            .then((buffer) => Buffer.from(buffer).toString("base64"))
            .catch(() => {})
          if (content) {
            await pasteAttachment({
              filename,
              filepath: resolvedFilepath,
              mime,
              content,
            })
            return
          }
        }
      } catch {}
    }

    const lineCount = (pastedContent.match(/\n/g)?.length ?? 0) + 1
    if (
      (lineCount >= 3 || pastedContent.length > 150) &&
      kv.get("paste_summary_enabled", !sync.data.config.experimental?.disable_paste_summary)
    ) {
      pasteText(pastedContent, `[Pasted ~${lineCount} lines]`)
      return
    }

    input.insertText(normalizedText)

    setTimeout(() => {
      if (!input || input.isDestroyed) return
      input.getLayoutNode().markDirty()
      renderer.requestRender()
    }, 0)
  }

  async function pasteAttachment(file: { filename?: string; filepath?: string; content: string; mime: string }) {
    const currentOffset = input.visualCursor.offset
    const extmarkStart = currentOffset
    const pdf = file.mime === "application/pdf"
    const count = store.prompt.parts.filter((x) => {
      if (x.type !== "file") return false
      if (pdf) return x.mime === "application/pdf"
      return x.mime.startsWith("image/")
    }).length
    const virtualText = pdf ? `[PDF ${count + 1}]` : `[Image ${count + 1}]`
    const extmarkEnd = extmarkStart + virtualText.length
    const textToInsert = virtualText + " "

    input.insertText(textToInsert)

    const extmarkId = input.extmarks.create({
      start: extmarkStart,
      end: extmarkEnd,
      virtual: true,
      styleId: pasteStyleId,
      typeId: promptPartTypeId,
    })

    const part: Omit<FilePart, "id" | "messageID" | "sessionID"> = {
      type: "file" as const,
      mime: file.mime,
      filename: file.filename,
      url: `data:${file.mime};base64,${file.content}`,
      source: {
        type: "file",
        path: file.filepath ?? file.filename ?? "",
        text: {
          start: extmarkStart,
          end: extmarkEnd,
          value: virtualText,
        },
      },
    }
    setStore(
      produce((draft) => {
        const partIndex = draft.prompt.parts.length
        draft.prompt.parts.push(part)
        draft.extmarkToPartIndex.set(extmarkId, partIndex)
      }),
    )
    return
  }

  function clearPrompt() {
    if (store.prompt.input.trim().length >= DRAFT_RETENTION_MIN_CHARS || store.prompt.parts.length > 0) {
      history.append({
        ...store.prompt,
        mode: store.mode,
      })
    }
    input.clear()
    input.extmarks.clear()
    setStore("prompt", {
      input: "",
      parts: [],
    })
    setStore("extmarkToPartIndex", new Map())
  }

  const highlight = createMemo(() => {
    if (leader()) return theme.border
    if (store.mode === "shell") return theme.primary
    const agent = local.agent.current()
    if (!agent) return theme.border
    return local.agent.color(agent.name)
  })

  const showVariant = createMemo(() => {
    const variants = local.model.variant.list()
    if (variants.length === 0) return false
    const current = local.model.variant.current()
    return !!current
  })

  const agentMetaAlpha = createFadeIn(() => !!local.agent.current(), animationsEnabled)
  const modelMetaAlpha = createFadeIn(() => !!local.agent.current() && store.mode === "normal", animationsEnabled)
  const variantMetaAlpha = createFadeIn(
    () => !!local.agent.current() && store.mode === "normal" && showVariant(),
    animationsEnabled,
  )
  const borderHighlight = createMemo(() => tint(theme.border, highlight(), agentMetaAlpha()))

  const placeholderText = createMemo(() => {
    if (props.showPlaceholder === false) return undefined
    if (store.mode === "shell") {
      if (!shell().length) return undefined
      const example = shell()[store.placeholder % shell().length]
      return `Run a command... "${example}"`
    }
    if (!list().length) return undefined
    return `Ask anything... "${list()[store.placeholder % list().length]}"`
  })

  const workspaceLabel = createMemo<
    | { type: "new"; workspaceType: string }
    | { type: "existing"; workspaceType: string; workspaceName: string; status?: WorkspaceStatus }
    | undefined
  >(() => {
    const selected = workspaceSelection()
    if (!selected) {
      const workspaceID = defaultWorkspaceID()
      if (props.sessionID || !workspaceID) return
      const workspace = project.workspace.get(workspaceID)
      return {
        type: "existing",
        workspaceType: workspace?.type ?? "unknown",
        workspaceName: workspace?.name ?? workspaceID,
        status: project.workspace.status(workspaceID) ?? "error",
      }
    }
    if (selected.type === "none") return
    if (props.sessionID && !workspaceCreating()) return
    if (selected.type === "new") {
      return {
        type: "new",
        workspaceType: selected.workspaceType,
      }
    }
    return {
      type: "existing",
      workspaceType: selected.workspaceType,
      workspaceName: selected.workspaceName,
      status: selected.type === "existing" ? "connected" : undefined,
    }
  })

  const spinnerDef = createMemo(() => {
    const agent = local.agent.current()
    const color = agent ? local.agent.color(agent.name) : theme.border
    return {
      frames: createFrames({
        color,
        style: "blocks",
        inactiveFactor: 0.6,
        // enableFading: false,
        minAlpha: 0.3,
      }),
      color: createColors({
        color,
        style: "blocks",
        inactiveFactor: 0.6,
        // enableFading: false,
        minAlpha: 0.3,
      }),
    }
  })

  return (
    <>
      <box ref={(r: BoxRenderable) => (anchor = r)} visible={props.visible !== false}>
        <box
          border={["left"]}
          borderColor={borderHighlight()}
          customBorderChars={{
            ...SplitBorder.customBorderChars,
            bottomLeft: "╹",
          }}
        >
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            flexShrink={0}
            backgroundColor={theme.backgroundElement}
            flexGrow={1}
          >
            <textarea
              placeholder={placeholderText()}
              placeholderColor={theme.textMuted}
              textColor={leader() ? theme.textMuted : theme.text}
              focusedTextColor={leader() ? theme.textMuted : theme.text}
              minHeight={1}
              maxHeight={6}
              onContentChange={() => {
                const value = input.plainText
                setStore("prompt", "input", value)
                auto()?.onInput(value)
                syncExtmarksWithPromptParts()
                setCursorVersion((value) => value + 1)
              }}
              onCursorChange={() => setCursorVersion((value) => value + 1)}
              onKeyDown={(e: KeyEvent & { preventDefault(): void }) => {
                if (props.disabled) {
                  e.preventDefault()
                  return
                }
                if (isDialogBlockingPrompt()) {
                  if (e.name !== "escape") e.preventDefault()
                  return
                }
              }}
              onSubmit={() => {
                // IME: double-defer so the last composed character (e.g. Korean
                // hangul) is flushed to plainText before we read it for submission.
                setTimeout(() => setTimeout(() => submit(), 0), 0)
              }}
              onPaste={async (event: PasteEvent) => {
                if (props.disabled) {
                  event.preventDefault()
                  return
                }
                if (isDialogBlockingPrompt()) {
                  event.preventDefault()
                  return
                }

                // Normalize line endings at the boundary
                // Windows ConPTY/Terminal often sends CR-only newlines in bracketed paste
                // Replace CRLF first, then any remaining CR
                const normalizedText = decodePasteBytes(event.bytes).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
                const pastedContent = normalizedText.trim()

                // Windows Terminal <1.25 can surface image-only clipboard as an
                // empty bracketed paste. Windows Terminal 1.25+ does not.
                if (!pastedContent) {
                  keymap.dispatchCommand("prompt.paste")
                  return
                }

                // Once we cross an async boundary below, the terminal may perform its
                // default paste unless we suppress it first and handle insertion ourselves.
                event.preventDefault()

                await pasteInputText(normalizedText)
              }}
              ref={(r: TextareaRenderable) => {
                input = r
                setInputTarget(r)
                if (promptPartTypeId === 0) {
                  promptPartTypeId = input.extmarks.registerType("prompt-part")
                }
                props.ref?.(ref)
                setTimeout(() => {
                  // setTimeout is a workaround and needs to be addressed properly
                  if (!input || input.isDestroyed) return
                  input.cursorColor = theme.text
                }, 0)
              }}
              onMouseDown={(r: MouseEvent) => r.target?.focus()}
              focusedBackgroundColor={theme.backgroundElement}
              cursorColor={props.disabled ? theme.backgroundElement : theme.text}
              syntaxStyle={syntax()}
            />
            <box flexDirection="row" flexShrink={0} paddingTop={1} gap={1} justifyContent="space-between">
              <box flexDirection="row" gap={1}>
                <Show when={local.agent.current()} fallback={<box height={1} />}>
                  {(agent) => (
                    <>
                      <text fg={fadeColor(highlight(), agentMetaAlpha())}>
                        {store.mode === "shell"
                          ? "Shell"
                          : displayRunOnlyAgentLabel({
                              frameworkMode: frameworkMode(),
                              recipientLabel: frameworkRecipientLabel(),
                              localAgentName: effectiveAgentName(),
                            })}
                      </text>
                      <Show when={store.mode === "normal"}>
                        <box flexDirection="row" gap={1}>
                          <text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>·</text>
                          <text
                            flexShrink={0}
                            fg={fadeColor(leader() ? theme.textMuted : theme.text, modelMetaAlpha())}
                          >
                            {local.model.parsed().model}
                          </text>
                          <text fg={fadeColor(theme.textMuted, modelMetaAlpha())}>{currentProviderLabel()}</text>
                          <Show when={showAgencyReconnect()}>
                            <text fg={theme.error}>·</text>
                            <text fg={theme.error} onMouseUp={() => agencyConnection.openConnectDialog()}>
                              disconnected
                            </text>
                          </Show>
                          <Show when={showVariant()}>
                            <text fg={fadeColor(theme.textMuted, variantMetaAlpha())}>·</text>
                            <text>
                              <span style={{ fg: fadeColor(theme.warning, variantMetaAlpha()), bold: true }}>
                                {local.model.variant.current()}
                              </span>
                            </text>
                          </Show>
                        </box>
                      </Show>
                    </>
                  )}
                </Show>
              </box>
              <Show when={hasRightContent()}>
                <box flexDirection="row" gap={1} alignItems="center">
                  {props.right}
                </box>
              </Show>
            </box>
          </box>
        </box>
        <box
          height={1}
          border={["left"]}
          borderColor={borderHighlight()}
          customBorderChars={{
            ...EmptyBorder,
            vertical: theme.backgroundElement.a !== 0 ? "╹" : " ",
          }}
        >
          <box
            height={1}
            border={["bottom"]}
            borderColor={theme.backgroundElement}
            customBorderChars={
              theme.backgroundElement.a !== 0
                ? {
                    ...EmptyBorder,
                    horizontal: "▀",
                  }
                : {
                    ...EmptyBorder,
                    horizontal: " ",
                  }
            }
          />
        </box>
        <box width="100%" flexDirection="row" justifyContent="space-between">
          <Switch>
            <Match when={status().type !== "idle"}>
              <box
                flexDirection="row"
                gap={1}
                flexGrow={1}
                justifyContent={status().type === "retry" ? "space-between" : "flex-start"}
              >
                <box flexShrink={0} flexDirection="row" gap={1}>
                  <box marginLeft={1}>
                    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={theme.textMuted}>[⋯]</text>}>
                      <spinner color={spinnerDef().color} frames={spinnerDef().frames} interval={40} />
                    </Show>
                  </box>
                  <box flexDirection="row" gap={1} flexShrink={0}>
                    {(() => {
                      const retry = createMemo(() => {
                        const s = status()
                        if (s.type !== "retry") return
                        return s
                      })
                      const message = createMemo(() => {
                        const r = retry()
                        if (!r) return
                        if (r.message.includes("exceeded your current quota") && r.message.includes("gemini"))
                          return "gemini is way too hot right now"
                        if (r.message.length > 80) return r.message.slice(0, 80) + "..."
                        return r.message
                      })
                      const isTruncated = createMemo(() => {
                        const r = retry()
                        if (!r) return false
                        return r.message.length > 120
                      })
                      const [seconds, setSeconds] = createSignal(0)
                      onMount(() => {
                        const timer = setInterval(() => {
                          const next = retry()?.next
                          if (next) setSeconds(Math.round((next - Date.now()) / 1000))
                        }, 1000)

                        onCleanup(() => {
                          clearInterval(timer)
                        })
                      })
                      const handleMessageClick = () => {
                        const r = retry()
                        if (!r) return
                        if (isTruncated()) {
                          void DialogAlert.show(dialog, "Retry Error", r.message)
                        }
                      }

                      const retryText = () => {
                        const r = retry()
                        if (!r) return ""
                        const baseMessage = message()
                        const truncatedHint = isTruncated() ? " (click to expand)" : ""
                        const duration = formatDuration(seconds())
                        const retryInfo = ` [retrying ${duration ? `in ${duration} ` : ""}attempt #${r.attempt}]`
                        return baseMessage + truncatedHint + retryInfo
                      }

                      return (
                        <Show when={retry()}>
                          <box onMouseUp={handleMessageClick}>
                            <text fg={theme.error}>{retryText()}</text>
                          </box>
                        </Show>
                      )
                    })()}
                  </box>
                </box>
                <text fg={store.interrupt > 0 ? theme.primary : theme.text}>
                  esc{" "}
                  <span style={{ fg: store.interrupt > 0 ? theme.primary : theme.textMuted }}>
                    {store.interrupt > 0 ? "again to interrupt" : "interrupt"}
                  </span>
                </text>
              </box>
            </Match>
            <Match when={warpNotice()}>
              {(notice) => (
                <box paddingLeft={3}>
                  <text fg={theme.accent}>{notice()}</text>
                </box>
              )}
            </Match>
            <Match when={workspaceLabel()}>
              {(workspace) => (
                <box paddingLeft={3} flexDirection="row" gap={1}>
                  <Show when={workspaceCreating()}>
                    <Spinner color={theme.accent} />
                  </Show>
                  <text fg={workspaceCreating() ? theme.accent : theme.text}>
                    {(() => {
                      const item = workspace()
                      if (item.type === "new") {
                        if (workspaceCreating())
                          return `Creating ${item.workspaceType}${".".repeat(workspaceCreatingDots())}`
                        return (
                          <>
                            Workspace <span style={{ fg: theme.textMuted }}>(new {item.workspaceType})</span>
                          </>
                        )
                      }
                      return (
                        <>
                          Workspace <span style={{ fg: theme.textMuted }}>{item.workspaceName}</span>
                        </>
                      )
                    })()}
                  </text>
                </box>
              )}
            </Match>
            <Match when={true}>{props.hint ?? <text />}</Match>
          </Switch>
          <Show when={status().type !== "retry"}>
            <box gap={2} flexDirection="row">
              <Show when={editorContextLabelState() !== "none" ? editorFileLabelDisplay() : undefined}>
                {(file) => (
                  <text fg={editorContextLabelState() === "pending" ? theme.secondary : theme.textMuted}>{file()}</text>
                )}
              </Show>
              <Switch>
                <Match when={store.mode === "normal"}>
                  <Switch>
                    <Match when={usage()}>
                      {(item) => (
                        <text fg={theme.textMuted} wrapMode="none">
                          {[item().context, item().cost].filter(Boolean).join(" · ")}
                        </text>
                      )}
                    </Match>
                    <Match when={true}>
                      <text fg={theme.text}>
                        {agentShortcut()} <span style={{ fg: theme.textMuted }}>agents</span>
                      </text>
                    </Match>
                  </Switch>
                  <text fg={theme.text}>
                    {paletteShortcut()} <span style={{ fg: theme.textMuted }}>commands</span>
                  </text>
                </Match>
                <Match when={store.mode === "shell"}>
                  <text fg={theme.text}>
                    esc <span style={{ fg: theme.textMuted }}>exit shell mode</span>
                  </text>
                </Match>
              </Switch>
            </box>
          </Show>
        </box>
      </box>
      <Autocomplete
        sessionID={props.sessionID}
        ref={(r) => {
          setAuto(() => r)
        }}
        anchor={() => anchor}
        input={() => input}
        setPrompt={(cb) => {
          setStore("prompt", produce(cb))
        }}
        setExtmark={(partIndex, extmarkId) => {
          setStore("extmarkToPartIndex", (map: Map<number, number>) => {
            const newMap = new Map(map)
            newMap.set(extmarkId, partIndex)
            return newMap
          })
        }}
        value={store.prompt.input}
        fileStyleId={fileStyleId}
        agentStyleId={agentStyleId}
        promptPartTypeId={() => promptPartTypeId}
      />
    </>
  )
}
