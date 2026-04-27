/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import * as CommandDialogModule from "../../../src/cli/cmd/tui/component/dialog-command"
import { closeDialogAuthOnEscape, DialogAuth } from "../../../src/cli/cmd/tui/component/dialog-provider"
import { Prompt, type PromptRef } from "../../../src/cli/cmd/tui/component/prompt"
import * as FrecencyModule from "../../../src/cli/cmd/tui/component/prompt/frecency"
import * as PromptHistoryModule from "../../../src/cli/cmd/tui/component/prompt/history"
import * as PromptStashModule from "../../../src/cli/cmd/tui/component/prompt/stash"
import * as AgencySwarmConnectionContext from "../../../src/cli/cmd/tui/context/agency-swarm-connection"
import * as ArgsContext from "../../../src/cli/cmd/tui/context/args"
import * as EditorContext from "../../../src/cli/cmd/tui/context/editor"
import * as EventContext from "../../../src/cli/cmd/tui/context/event"
import * as ExitContext from "../../../src/cli/cmd/tui/context/exit"
import * as KVContext from "../../../src/cli/cmd/tui/context/kv"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as ProjectContext from "../../../src/cli/cmd/tui/context/project"
import * as KeybindContext from "../../../src/cli/cmd/tui/context/keybind"
import * as RouteContext from "../../../src/cli/cmd/tui/context/route"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import { TuiConfigProvider } from "../../../src/cli/cmd/tui/context/tui-config"
import { DialogProvider, useDialog } from "../../../src/cli/cmd/tui/ui/dialog"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

function createEscapeEvent() {
  return {
    name: "escape",
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {},
  }
}

function createTheme() {
  return {
    _hasSelectedListItemText: false,
    background: RGBA.fromHex("#000000"),
    backgroundElement: RGBA.fromHex("#111111"),
    backgroundPanel: RGBA.fromHex("#1a1a1a"),
    backgroundMenu: RGBA.fromHex("#1a1a1a"),
    border: RGBA.fromHex("#333333"),
    text: RGBA.fromHex("#ffffff"),
    textMuted: RGBA.fromHex("#999999"),
    primary: RGBA.fromHex("#00a3ff"),
    success: RGBA.fromHex("#22c55e"),
    warning: RGBA.fromHex("#f59e0b"),
    error: RGBA.fromHex("#ff5555"),
    info: RGBA.fromHex("#38bdf8"),
    secondary: RGBA.fromHex("#8b5cf6"),
    accent: RGBA.fromHex("#14b8a6"),
  }
}

async function renderDialogAuthHarness() {
  const toastMessages: Array<{ variant?: string; message?: string }> = []
  const selectedModel = {
    providerID: "agency-swarm",
    modelID: "default",
  }
  const syncData = {
    session_status: {},
    message: {},
    command: [],
    session: [],
    agent: [],
    provider: [
      {
        id: "agency-swarm",
        name: "Agent Swarm",
        models: {
          default: { id: "default", name: "Default" },
        },
        options: {
          baseURL: "http://127.0.0.1:8000",
        },
      },
    ],
    provider_next: {
      all: [
        { id: "openai", name: "OpenAI" },
        { id: "anthropic", name: "Anthropic" },
      ],
      connected: [],
    },
    provider_auth: {
      openai: [{ type: "api", label: "API key" }],
      anthropic: [{ type: "api", label: "API key" }],
    },
    provider_default: {},
    console_state: {
      activeOrgName: undefined,
      switchableOrgCount: 0,
      consoleManagedProviders: [],
    },
    config: {
      model: "agency-swarm/default",
      provider: {},
    },
    mcp: {},
  }

  spyOn(CommandDialogModule, "useCommandDialog").mockReturnValue({
    register: () => () => {},
    slashes: () => [],
    keybinds: () => {},
    suspended: () => false,
    show: () => {},
    trigger: () => {},
  } as any)
  spyOn(PromptHistoryModule, "usePromptHistory").mockReturnValue({
    append: () => {},
    move: () => undefined,
  } as any)
  spyOn(FrecencyModule, "useFrecency").mockReturnValue({
    updateFrecency: () => {},
    sortByFrecency: <T,>(input: T[]) => input,
  } as any)
  spyOn(PromptStashModule, "usePromptStash").mockReturnValue({
    push: () => {},
    pop: () => undefined,
    list: () => [],
  } as any)
  spyOn(ExitContext, "useExit").mockReturnValue(
    Object.assign(async () => {}, {
      message: {
        set: () => () => {},
        clear: () => {},
        get: () => undefined,
      },
    }) as any,
  )
  spyOn(AgencySwarmConnectionContext, "useAgencySwarmConnection").mockReturnValue({
    requiresReconnect: () => false,
    openConnectDialog: () => false,
    status: () => "connected",
    baseURL: () => undefined,
    failureCount: () => 0,
    frameworkMode: () => true,
  } as any)
  spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
  spyOn(EditorContext, "useEditorContext").mockReturnValue({
    enabled: () => false,
    connected: () => false,
    selection: () => undefined,
    onMention: () => () => {},
    server: () => undefined,
  } as any)
  spyOn(EventContext, "useEvent").mockReturnValue({
    subscribe: () => () => {},
    on: () => () => {},
  } as any)
  spyOn(ProjectContext, "useProject").mockReturnValue({
    workspace: { current: () => undefined, status: () => undefined },
    instance: { directory: () => "/tmp" },
  } as any)
  spyOn(KVContext, "useKV").mockReturnValue({
    get: (_key: string, fallback?: boolean) => fallback,
    set: () => {},
    delete: () => {},
  } as any)
  spyOn(KeybindContext, "useKeybind").mockReturnValue({
    leader: false,
    all: {},
    parse: (evt: any) => evt,
    match: () => false,
    print: (key: string) => key,
  } as any)
  spyOn(LocalContext, "useLocal").mockReturnValue({
    agent: {
      color: () => "#ffffff",
      current: () => ({
        name: "general",
        model: selectedModel,
      }),
      list: () => [{ name: "general", mode: "primary", hidden: false }],
      move: () => {},
      set: () => {},
    },
    model: {
      current: () => selectedModel,
      parsed: () => ({
        provider: "Agent Swarm",
      }),
      set: () => {},
      cycle: () => {},
      cycleFavorite: () => {},
      variant: {
        current: () => undefined,
        list: () => [],
        set: () => {},
        cycle: () => {},
      },
    },
  } as any)
  spyOn(RouteContext, "useRoute").mockReturnValue({
    data: {
      type: "home",
    },
    navigate: () => {},
  } as any)
  spyOn(SDKContext, "useSDK").mockReturnValue({
    event: {
      on: () => {},
    },
    client: {
      auth: {
        remove: async () => {},
      },
      instance: {
        dispose: async () => {},
      },
      provider: {
        oauth: {
          authorize: async () => ({ data: undefined }),
          callback: async () => ({ data: undefined }),
        },
      },
      session: {
        create: async () => ({ data: { id: "ses_test" } }),
        delete: async () => ({ data: undefined }),
        prompt: async () => ({ data: undefined }),
        shell: () => {},
        command: () => {},
      },
    },
  } as any)
  spyOn(SyncContext, "useSync").mockReturnValue({
    data: syncData,
    status: "complete",
    bootstrap: async () => {},
    session: {
      get: () => undefined,
    },
  } as any)
  spyOn(ThemeContext, "useTheme").mockReturnValue({
    theme: createTheme(),
    syntax: () => ({
      getStyleId: () => 1,
    }),
  } as any)
  spyOn(ToastModule, "useToast").mockReturnValue({
    show: (input: { variant?: string; message?: string }) => {
      toastMessages.push(input)
    },
    error: (error: Error) => {
      toastMessages.push({
        variant: "error",
        message: error.message,
      })
    },
    currentToast: null,
  } as any)

  let promptRef: PromptRef | undefined
  let dialogContext!: ReturnType<typeof useDialog>

  const Capture = () => {
    dialogContext = useDialog()
    return <Prompt ref={(next) => (promptRef = next)} showPlaceholder={false} />
  }

  const rendered = await testRender(
    () => (
      <TuiConfigProvider config={{}}>
        <DialogProvider>
          <Capture />
        </DialogProvider>
      </TuiConfigProvider>
    ),
    { width: 100, height: 32 },
  )

  await flushEffects()
  await rendered.renderOnce()

  return {
    ...rendered,
    dialog: dialogContext,
    promptRef: () => {
      if (!promptRef) throw new Error("Prompt ref not captured")
      return promptRef
    },
    toastMessages,
  }
}

describe("dialog auth modal behavior", () => {
  afterEach(() => {
    mock.restore()
  })

  test("blocks prompt input while auth dialog is open", async () => {
    const app = await renderDialogAuthHarness()

    app.dialog.replace(() => <DialogAuth />)
    await flushEffects()
    await app.renderOnce()

    app.promptRef().focus()
    await flushEffects()

    await app.mockInput.typeText("/exit")
    await flushEffects()
    await app.renderOnce()

    expect(app.promptRef().current.input).toBe("")
  })

  test("closes auth dialog on escape", async () => {
    const app = await renderDialogAuthHarness()

    app.dialog.replace(() => <DialogAuth />)
    await flushEffects()
    await app.renderOnce()

    expect(app.dialog.stack.length).toBe(1)

    expect(closeDialogAuthOnEscape(app.dialog, createEscapeEvent())).toBe(true)
    await flushEffects()
    await app.renderOnce()

    expect(app.dialog.stack.length).toBe(0)
  })

  test("reopens auth dialog on the next send after escape closes it", async () => {
    const app = await renderDialogAuthHarness()

    app.dialog.replace(() => <DialogAuth />)
    await flushEffects()
    await app.renderOnce()

    closeDialogAuthOnEscape(app.dialog, createEscapeEvent())
    await flushEffects()
    await app.renderOnce()

    expect(app.dialog.stack.length).toBe(0)

    app.promptRef().focus()
    await flushEffects()
    await app.mockInput.typeText("hello")
    await flushEffects()

    app.promptRef().submit()
    await flushEffects()
    await app.renderOnce()

    expect(app.dialog.stack.length).toBe(1)
    expect(app.toastMessages.at(-1)?.message).toBe("No provider credential is configured. Run /auth to add it.")
  })
})
