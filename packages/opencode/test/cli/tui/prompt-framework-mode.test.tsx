/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import * as AgencySwarmConnectionContext from "../../../src/cli/cmd/tui/context/agency-swarm-connection"
import * as ArgsContext from "../../../src/cli/cmd/tui/context/args"
import * as CommandDialogModule from "../../../src/cli/cmd/tui/component/dialog-command"
import * as ExitContext from "../../../src/cli/cmd/tui/context/exit"
import * as EditorContext from "../../../src/cli/cmd/tui/context/editor"
import * as EventContext from "../../../src/cli/cmd/tui/context/event"
import * as KeybindContext from "../../../src/cli/cmd/tui/context/keybind"
import * as KVContext from "../../../src/cli/cmd/tui/context/kv"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as ProjectContext from "../../../src/cli/cmd/tui/context/project"
import { RouteProvider } from "../../../src/cli/cmd/tui/context/route"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as PromptHistoryModule from "../../../src/cli/cmd/tui/component/prompt/history"
import * as PromptStashModule from "../../../src/cli/cmd/tui/component/prompt/stash"
import * as TextareaKeybindingsModule from "../../../src/cli/cmd/tui/component/textarea-keybindings"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import * as AutocompleteModule from "../../../src/cli/cmd/tui/component/prompt/autocomplete"
import { DialogProvider } from "../../../src/cli/cmd/tui/ui/dialog"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("prompt framework-mode footer", () => {
  afterEach(() => {
    mock.restore()
  })

  test("shows the agency recipient display name instead of the configured id or local Agent Builder label", async () => {
    spyOn(AgencySwarmAdapter, "discover").mockResolvedValue({
      agencies: [
        {
          id: "demo",
          name: "Demo Agency",
          agents: [
            {
              id: "orchestrator-slug",
              name: "Orchestrator",
              isEntryPoint: true,
            },
          ],
          metadata: {},
        },
      ],
      rawOpenAPI: {},
    })
    spyOn(AutocompleteModule, "Autocomplete").mockImplementation((props: any) => {
      props.ref?.({
        onInput() {},
        onKeyDown() {},
        visible: false,
      })
      return <box />
    })
    spyOn(CommandDialogModule, "useCommandDialog").mockReturnValue({
      register: () => () => {},
      slashes: () => [],
      trigger: () => {},
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
    spyOn(AgencySwarmConnectionContext, "useAgencySwarmConnection").mockReturnValue({
      requiresReconnect: () => false,
      openConnectDialog: () => false,
      status: () => "connected",
      baseURL: () => undefined,
      failureCount: () => 0,
      frameworkMode: () => true,
    } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(KeybindContext, "useKeybind").mockReturnValue({
      leader: false,
      match: () => false,
      print: (id: string) => (id === "agent_cycle" ? "tab" : ""),
    } as any)
    spyOn(KVContext, "useKV").mockReturnValue({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      agent: {
        current: () => ({
          name: "build",
          model: {
            providerID: "agency-swarm",
            modelID: "default",
          },
        }),
        list: () => [{ name: "build" }],
        set: () => {},
        color: () => RGBA.fromHex("#38bdf8"),
      },
      model: {
        current: () => ({
          providerID: "agency-swarm",
          modelID: "default",
        }),
        parsed: () => ({
          provider: "Agency Swarm",
          model: "Agency Swarm Default",
        }),
        set: () => {},
        variant: {
          current: () => undefined,
          list: () => [],
          set: () => {},
        },
      },
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        session: {},
      },
      event: {
        on: () => () => {},
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        command: [],
        config: {
          model: "agency-swarm/default",
          provider: {
            "agency-swarm": {
              options: {
                agency: "demo",
                recipientAgent: "orchestrator-slug",
                baseURL: "http://127.0.0.1:8000",
              },
            },
          },
          experimental: {},
        },
        console_state: {
          activeOrgName: "",
          consoleManagedProviders: [],
          switchableOrgCount: 0,
        },
        message: {},
        provider: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
        ],
        provider_auth: {},
        provider_next: {
          all: [],
          connected: [],
          default: {},
        },
        session_status: {},
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        _hasSelectedListItemText: false,
        accent: RGBA.fromHex("#14b8a6"),
        background: RGBA.fromHex("#020617"),
        backgroundElement: RGBA.fromHex("#111827"),
        backgroundPanel: RGBA.fromHex("#0f172a"),
        border: RGBA.fromHex("#334155"),
        error: RGBA.fromHex("#ef4444"),
        primary: RGBA.fromHex("#38bdf8"),
        selectedListItemText: RGBA.fromHex("#f8fafc"),
        success: RGBA.fromHex("#22c55e"),
        text: RGBA.fromHex("#f8fafc"),
        textMuted: RGBA.fromHex("#94a3b8"),
        warning: RGBA.fromHex("#f59e0b"),
      },
      syntax: () => ({
        getStyleId: () => 1,
      }),
    } as any)
    spyOn(PromptHistoryModule, "usePromptHistory").mockReturnValue({
      move: () => undefined,
      append: () => {},
    } as any)
    spyOn(PromptStashModule, "usePromptStash").mockReturnValue({
      list: () => [],
      push: () => {},
      pop: () => undefined,
      remove: () => {},
    } as any)
    spyOn(ProjectContext, "useProject").mockReturnValue({
      workspace: {
        current: () => undefined,
        status: () => undefined,
      },
      instance: {
        directory: () => "/tmp",
      },
    } as any)
    spyOn(TextareaKeybindingsModule, "useTextareaKeybindings").mockReturnValue(() => [] as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)

    const { Prompt } = await import("../../../src/cli/cmd/tui/component/prompt")

    const rendered = await testRender(
      () => (
        <RouteProvider>
          <DialogProvider>
            <Prompt showPlaceholder={false} />
          </DialogProvider>
        </RouteProvider>
      ),
      { width: 100, height: 20 },
    )

    await flushEffects()
    await rendered.renderOnce()

    const frame = rendered.captureCharFrame()
    expect(frame).toContain("Orchestrator")
    expect(frame).not.toContain("orchestrator-slug")
    expect(frame).not.toContain("Agent Builder")
  })
})
