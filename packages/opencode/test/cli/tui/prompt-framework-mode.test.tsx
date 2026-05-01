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
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("prompt framework-mode footer", () => {
  afterEach(() => {
    mock.restore()
  })

  test("shows the agency recipient display name instead of the configured id or local Agent Builder label", async () => {
    const eventHandlers: Record<string, (event: any) => void> = {}
    const updateGlobalConfig = mock(async () => ({}))
    const prompt = mock(async () => ({}))
    let promptRef: import("../../../src/cli/cmd/tui/component/prompt").PromptRef | undefined

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
            {
              id: "slides_agent",
              name: "Slides Agent",
              isEntryPoint: false,
            },
            {
              id: "support_agent",
              name: "Support Agent",
              isEntryPoint: false,
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
      on: (type: string, handler: (event: any) => void) => {
        eventHandlers[type] = handler
        return () => {}
      },
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
        global: {
          config: {
            update: updateGlobalConfig,
          },
        },
        session: {
          prompt,
        },
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
                recipientAgentSelectedAt: 1,
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
        part: {
          message_assistant_1: [
            {
              type: "tool",
              tool: "transfer_to_slides_agent",
              state: {
                status: "completed",
              },
            },
          ],
        },
        provider: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            key: undefined,
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "api",
            env: ["OPENAI_API_KEY"],
            key: "sk-test",
            options: {},
            models: {},
          },
        ],
        provider_auth: {
          openai: [{ type: "api", label: "API key" }],
        },
        provider_next: {
          all: [],
          connected: [],
          default: {},
        },
        session_status: {
          session_1: { type: "busy" },
        },
      },
      session: {
        get: () => undefined,
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
            <Prompt sessionID="session_1" showPlaceholder={false} ref={(ref) => (promptRef = ref)} />
          </DialogProvider>
        </RouteProvider>
      ),
      { width: 100, height: 20 },
    )

    await flushEffects()
    await rendered.renderOnce()

    const frame = rendered.captureCharFrame()
    expect(frame).toContain("Orchestrator")
    expect(frame).toContain("tab agents")
    expect(frame).not.toContain("orchestrator-slug")
    expect(frame).not.toContain("Agent Builder")
    expect(frame).not.toContain("recipients")

    eventHandlers["message.updated"]?.({
      properties: {
        info: {
          id: "message_assistant_normal",
          sessionID: "session_1",
          role: "assistant",
          providerID: "agency-swarm",
          agent: "slides_agent",
        },
      },
    })
    await flushEffects()

    promptRef!.set({ input: "normal follow-up", parts: [] })
    await promptRef!.submit()
    await flushEffects()

    expect(prompt).toHaveBeenCalledTimes(1)
    const calls = prompt.mock.calls as unknown as Array<[{ parts: unknown[]; $body_agencyRecipientAgent?: string }]>
    expect(calls[0][0].$body_agencyRecipientAgent).toBeUndefined()

    eventHandlers["message.updated"]?.({
      properties: {
        info: {
          id: "message_assistant_1",
          sessionID: "session_1",
          role: "assistant",
          providerID: "agency-swarm",
          agent: "slides_agent",
        },
      },
    })
    await flushEffects()
    await rendered.renderOnce()

    const handoffFrame = rendered.captureCharFrame()
    expect(handoffFrame).toContain("Slides Agent")
    expect(updateGlobalConfig).not.toHaveBeenCalled()

    promptRef!.set({ input: "continue", parts: [] })
    await promptRef!.submit()
    await flushEffects()

    expect(prompt).toHaveBeenCalledTimes(2)
    const payload = calls[1][0]
    expect(payload.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "text",
          text: "continue",
        }),
      ]),
    )
    expect(payload.parts).not.toContainEqual(expect.objectContaining({ type: "agent" }))
    expect(payload.$body_agencyRecipientAgent).toBe("slides_agent")

    eventHandlers["message.updated"]?.({
      properties: {
        info: {
          id: "message_assistant_live_update",
          sessionID: "session_1",
          role: "assistant",
          providerID: "agency-swarm",
          agent: "slides_agent",
        },
      },
    })
    eventHandlers["message.updated"]?.({
      properties: {
        info: {
          id: "message_assistant_live_update",
          sessionID: "session_1",
          role: "assistant",
          providerID: "agency-swarm",
          agent: "support_agent",
        },
      },
    })
    await flushEffects()

    promptRef!.set({ input: "after label-only update", parts: [] })
    await promptRef!.submit()
    await flushEffects()

    expect(prompt).toHaveBeenCalledTimes(3)
    expect(calls[2][0].$body_agencyRecipientAgent).toBe("slides_agent")

    eventHandlers["message.part.updated"]?.({
      properties: {
        part: {
          id: "part_live_update",
          sessionID: "session_1",
          messageID: "message_assistant_live_update",
          type: "text",
          text: "Live handoff complete.",
          metadata: {
            agency_handoff_event: "agent_updated_stream_event",
            assistant: "support_agent",
          },
        },
      },
    })
    await flushEffects()

    promptRef!.set({ input: "after live handoff", parts: [] })
    await promptRef!.submit()
    await flushEffects()

    expect(prompt).toHaveBeenCalledTimes(4)
    expect(calls[3][0].$body_agencyRecipientAgent).toBe("support_agent")
  })

  test("sends agency handoff recipient through the generated sdk prompt body", async () => {
    let body: any
    const client = createOpencodeClient({
      baseUrl: "http://localhost",
      fetch: (async (request: Request) => {
        body = await request.json()
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }) as typeof fetch,
    })

    await client.session.prompt({
      sessionID: "session",
      model: {
        providerID: "opencode",
        modelID: "agency-swarm",
      },
      agent: "orchestrator",
      $body_agencyRecipientAgent: "slides_agent",
      parts: [
        {
          id: "part",
          type: "text",
          text: "continue",
        },
      ],
    } as Parameters<typeof client.session.prompt>[0] & { $body_agencyRecipientAgent?: string })

    expect(body.agencyRecipientAgent).toBe("slides_agent")
    expect(body.parts).not.toContainEqual(expect.objectContaining({ type: "agent" }))
  })
})
