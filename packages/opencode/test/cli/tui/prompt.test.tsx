/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { createEffect } from "solid-js"
import * as AutocompleteModule from "../../../src/cli/cmd/tui/component/prompt/autocomplete"
import * as CommandDialogModule from "../../../src/cli/cmd/tui/component/dialog-command"
import type { PromptRef } from "../../../src/cli/cmd/tui/component/prompt"
import * as ExitContext from "../../../src/cli/cmd/tui/context/exit"
import * as AgencySwarmConnectionContext from "../../../src/cli/cmd/tui/context/agency-swarm-connection"
import * as KeybindContext from "../../../src/cli/cmd/tui/context/keybind"
import * as KVContext from "../../../src/cli/cmd/tui/context/kv"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import { RouteProvider, useRoute } from "../../../src/cli/cmd/tui/context/route"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as TuiConfigContext from "../../../src/cli/cmd/tui/context/tui-config"
import * as PromptHistoryModule from "../../../src/cli/cmd/tui/component/prompt/history"
import * as PromptStashModule from "../../../src/cli/cmd/tui/component/prompt/stash"
import * as TextareaKeybindingsModule from "../../../src/cli/cmd/tui/component/textarea-keybindings"
import { DialogProvider, useDialog } from "../../../src/cli/cmd/tui/ui/dialog"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import { AgencySwarmRunSession } from "../../../src/agency-swarm/run-session"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

function createEventBus() {
  const listeners = new Map<string, Set<(event: any) => void>>()

  return {
    on(type: string, handler: (event: any) => void) {
      let bucket = listeners.get(type)
      if (!bucket) {
        bucket = new Set()
        listeners.set(type, bucket)
      }
      bucket.add(handler)
      return () => {
        bucket?.delete(handler)
        if (bucket?.size === 0) listeners.delete(type)
      }
    },
    emit(type: string, event: any) {
      const bucket = listeners.get(type)
      if (!bucket) return
      for (const handler of bucket) {
        handler(event)
      }
    },
  }
}

describe("prompt auth rejection handling", () => {
  afterEach(() => {
    mock.restore()
    delete process.env.OPENAI_API_KEY
  })

  test("keeps the first draft on home when a slow auth rejection lands before streaming starts", async () => {
    process.env.OPENAI_API_KEY = "sk-test"

    const routeStates: string[] = []
    const dialogDepth: number[] = []
    const toasts: Array<{ duration?: number; variant?: string; message?: string }> = []
    const events = createEventBus()
    const promptError = new Error("Streaming request failed (403): Invalid API key for OpenAI")
    const createSession = spyOn(
      {
        create: async () => ({
          data: {
            id: "session_auth_race",
          },
        }),
      },
      "create",
    )
    const deleteSession = spyOn(
      {
        delete: async () => ({}),
      },
      "delete",
    )
    const promptSession = spyOn(
      {
        prompt: async () => {
          await Bun.sleep(75)
          throw promptError
        },
      },
      "prompt",
    )

    spyOn(AgencySwarmRunSession, "sync").mockResolvedValue(undefined)
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
    spyOn(AgencySwarmConnectionContext, "useAgencySwarmConnection").mockReturnValue({
      requiresReconnect: () => false,
      openConnectDialog: () => false,
      status: () => "connected",
      baseURL: () => undefined,
      failureCount: () => 0,
      frameworkMode: () => true,
    } as any)
    spyOn(KeybindContext, "useKeybind").mockReturnValue({
      leader: false,
      match: () => false,
      print: () => "",
    } as any)
    spyOn(KVContext, "useKV").mockReturnValue({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      agent: {
        current: () => ({
          name: "builder",
          model: {
            providerID: "agency-swarm",
            modelID: "default",
          },
        }),
        list: () => [{ name: "builder" }],
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
          model: "default",
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
        session: {
          create: createSession,
          prompt: promptSession,
          delete: deleteSession,
        },
      },
      event: events,
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        command: [],
        config: {
          model: "agency-swarm/default",
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
          {
            id: "openai",
            name: "OpenAI",
            source: "config",
            env: ["OPENAI_API_KEY"],
            options: {},
            models: {},
          },
        ],
        provider_auth: {
          openai: [{ type: "api", label: "API key" }],
        },
        provider_next: {
          all: [{ id: "openai", name: "OpenAI" }],
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
    spyOn(TuiConfigContext, "useTuiConfig").mockReturnValue({} as any)
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
    spyOn(TextareaKeybindingsModule, "useTextareaKeybindings").mockReturnValue(() => [] as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: (input: { variant?: string; message?: string }) => {
        toasts.push(input)
      },
      error: (error: Error) => {
        toasts.push({
          variant: "error",
          message: error.message,
        })
      },
      currentToast: null,
    } as any)

    const { Prompt } = await import("../../../src/cli/cmd/tui/component/prompt")

    let promptRef: PromptRef | undefined

    const Capture = () => {
      const route = useRoute()
      const dialog = useDialog()

      createEffect(() => {
        const current = route.data
        routeStates.push(current.type === "session" ? `session:${current.sessionID}` : "home")
      })

      createEffect(() => {
        dialogDepth.push(dialog.stack.length)
      })

      return <box />
    }

    await testRender(() => (
      <RouteProvider>
        <DialogProvider>
          <Capture />
          <Prompt ref={(value) => (promptRef = value)} workspaceID="workspace_auth_race" placeholders={{ normal: [] }} />
        </DialogProvider>
      </RouteProvider>
    ))

    expect(promptRef).toBeDefined()

    promptRef!.set({
      input: "recover this draft",
      parts: [],
    })
    promptRef!.focus()
    await flushEffects()

    expect(promptRef!.focused).toBe(true)

    promptRef!.submit()
    await flushEffects()
    await Bun.sleep(90)
    await flushEffects()

    expect(createSession).toHaveBeenCalledWith({
      workspaceID: "workspace_auth_race",
    })
    expect(promptSession).toHaveBeenCalledTimes(1)
    expect(deleteSession).toHaveBeenCalledWith({
      sessionID: "session_auth_race",
    })
    expect(routeStates.some((state) => state.startsWith("session:"))).toBe(false)
    expect(routeStates.at(-1)).toBe("home")
    expect(promptRef!.current).toEqual({
      input: "recover this draft",
      parts: [],
    })
    expect(promptRef!.focused).toBe(false)
    expect(dialogDepth.at(-1)).toBe(1)
    expect(toasts.at(-1)).toEqual({
      variant: "error",
      message: "The current provider credential was rejected. Reconnect OpenAI or Anthropic and try again.",
      duration: 5000,
    })
  })
})
