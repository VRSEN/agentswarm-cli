/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { EventEmitter } from "events"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import { Telemetry } from "../../../src/telemetry/telemetry"

let openShouldFail = false
let openCalledWith: string | undefined
let dialogPromptConfirm: ((value: string) => unknown) | undefined

mock.module("open", () => ({
  default: async (url: string) => {
    openCalledWith = url
    const subprocess = new EventEmitter()
    if (openShouldFail) {
      setTimeout(() => {
        subprocess.emit("error", new Error("spawn open ENOENT"))
      }, 10)
    }
    return subprocess
  },
}))

mock.module("../../../src/cli/cmd/tui/ui/dialog-prompt", () => {
  const DialogPrompt = (props: { onConfirm?: (value: string) => unknown }) => {
    dialogPromptConfirm = props.onConfirm
    return <box />
  }
  DialogPrompt.show = async () => null
  return { DialogPrompt }
})

const { createDialogProviderOptionsWithFilter } = await import("../../../src/cli/cmd/tui/component/dialog-provider")

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("dialog provider browser auth", () => {
  afterEach(() => {
    mock.restore()
    openShouldFail = false
    openCalledWith = undefined
    dialogPromptConfirm = undefined
  })

  test("framework oauth warns when the default browser fails to open", async () => {
    const toastMessages: Array<{ variant?: string; message?: string }> = []
    let dialogContent: (() => any) | undefined
    let options!: ReturnType<typeof createDialogProviderOptionsWithFilter>

    spyOn(DialogContext, "useDialog").mockReturnValue({
      replace: (next: () => any) => {
        dialogContent = next
      },
      clear: () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        provider: {
          oauth: {
            authorize: async () => ({
              data: {
                method: "auto",
                url: "https://auth.example.com/authorize",
                instructions: "Open the browser to continue",
              },
            }),
            callback: async () => new Promise<never>(() => {}),
          },
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        provider_next: {
          all: [{ id: "openai", name: "OpenAI" }],
          connected: [],
        },
        provider_auth: {
          openai: [{ type: "oauth", label: "ChatGPT Pro/Plus (browser)" }],
        },
        provider: [],
        console_state: {
          consoleManagedProviders: [],
        },
        config: {
          model: "agency-swarm/default",
        },
      },
      bootstrap: async () => {},
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      model: {
        current: () => ({ providerID: "agency-swarm", modelID: "default" }),
      },
      agent: {
        current: () => undefined,
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        text: RGBA.fromHex("#ffffff"),
        textMuted: RGBA.fromHex("#999999"),
        primary: RGBA.fromHex("#00a3ff"),
        error: RGBA.fromHex("#ff5555"),
        success: RGBA.fromHex("#22c55e"),
        warning: RGBA.fromHex("#f59e0b"),
        secondary: RGBA.fromHex("#8b5cf6"),
        accent: RGBA.fromHex("#14b8a6"),
        info: RGBA.fromHex("#38bdf8"),
      },
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

    const Capture = () => {
      options = createDialogProviderOptionsWithFilter({ providerIDs: ["openai"] })
      return <box />
    }

    await testRender(() => <Capture />)
    openShouldFail = true

    await options()[0].onSelect?.()

    expect(dialogContent).toBeDefined()

    await testRender(() => dialogContent!())
    await flushEffects()
    await Bun.sleep(25)

    expect(openCalledWith).toBe("https://auth.example.com/authorize")

    const warningToast = toastMessages.find((item) => item.variant === "warning")
    expect(warningToast?.message).toContain("Could not open your default browser")
  })

  test("empty provider allow-list returns no provider options", async () => {
    let options!: ReturnType<typeof createDialogProviderOptionsWithFilter>

    spyOn(DialogContext, "useDialog").mockReturnValue({
      replace: () => {},
      clear: () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({ client: {} } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        provider_next: {
          all: [
            { id: "openai", name: "OpenAI" },
            { id: "google", name: "Google" },
          ],
          connected: [],
        },
        provider_auth: {},
        provider: [],
        console_state: {
          consoleManagedProviders: [],
        },
        config: {
          model: "agency-swarm/default",
        },
      },
      bootstrap: async () => {},
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      model: {
        current: () => ({ providerID: "agency-swarm", modelID: "default" }),
      },
      agent: {
        current: () => undefined,
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        text: RGBA.fromHex("#ffffff"),
        textMuted: RGBA.fromHex("#999999"),
        primary: RGBA.fromHex("#00a3ff"),
        error: RGBA.fromHex("#ff5555"),
        success: RGBA.fromHex("#22c55e"),
        warning: RGBA.fromHex("#f59e0b"),
        secondary: RGBA.fromHex("#8b5cf6"),
        accent: RGBA.fromHex("#14b8a6"),
        info: RGBA.fromHex("#38bdf8"),
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)

    const Capture = () => {
      options = createDialogProviderOptionsWithFilter({ providerIDs: [] })
      return <box />
    }

    await testRender(() => <Capture />)

    expect(options()).toEqual([])
  })

  test("captures provider selection and oauth authorize failure without raw errors", async () => {
    let options!: ReturnType<typeof createDialogProviderOptionsWithFilter>
    const telemetryCapture = spyOn(Telemetry, "capture").mockResolvedValue(false)
    const rawError = "oauth provider exploded with raw secret sk-provider-secret"

    spyOn(DialogContext, "useDialog").mockReturnValue({
      replace: () => {},
      clear: () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        provider: {
          oauth: {
            authorize: async () => ({
              error: rawError,
              response: new Response(null, { status: 503 }),
            }),
          },
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        provider_next: {
          all: [{ id: "openai", name: "OpenAI" }],
          connected: ["openai"],
        },
        provider_auth: {
          openai: [{ type: "oauth", label: "ChatGPT Pro/Plus (browser)" }],
        },
        provider: [],
        console_state: {
          consoleManagedProviders: [],
        },
        config: {
          model: "agency-swarm/default",
        },
      },
      bootstrap: async () => {},
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      model: {
        current: () => ({ providerID: "agency-swarm", modelID: "default" }),
      },
      agent: {
        current: () => undefined,
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        text: RGBA.fromHex("#ffffff"),
        textMuted: RGBA.fromHex("#999999"),
        primary: RGBA.fromHex("#00a3ff"),
        error: RGBA.fromHex("#ff5555"),
        success: RGBA.fromHex("#22c55e"),
        warning: RGBA.fromHex("#f59e0b"),
        secondary: RGBA.fromHex("#8b5cf6"),
        accent: RGBA.fromHex("#14b8a6"),
        info: RGBA.fromHex("#38bdf8"),
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)

    const Capture = () => {
      options = createDialogProviderOptionsWithFilter({ providerIDs: ["openai"] })
      return <box />
    }

    await testRender(() => <Capture />)
    await options()[0].onSelect?.()

    expect(telemetryCapture).toHaveBeenCalledWith("provider_requested", {
      connected_before: true,
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(telemetryCapture).toHaveBeenCalledWith("provider_auth_started", {
      auth_method: "oauth",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(telemetryCapture).toHaveBeenCalledWith("provider_auth_failed", {
      auth_method: "oauth",
      error_bucket: "server",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
      step: "oauth_authorize",
    })
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain(rawError)
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("sk-provider-secret")
  })

  test("uses SDK response status for API key auth failure telemetry", async () => {
    let dialogContent: (() => any) | undefined
    let options!: ReturnType<typeof createDialogProviderOptionsWithFilter>
    const telemetryCapture = spyOn(Telemetry, "capture").mockResolvedValue(false)
    const rawError = "api key save failed with raw secret sk-provider-secret"
    const authSet = spyOn(
      {
        set: async () => ({
          error: rawError,
          response: new Response(null, { status: 403 }),
        }),
      },
      "set",
    )

    spyOn(DialogContext, "useDialog").mockReturnValue({
      replace: (next: () => any) => {
        dialogContent = next
      },
      clear: () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        auth: {
          set: authSet,
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        provider_next: {
          all: [{ id: "openai", name: "OpenAI" }],
          connected: [],
        },
        provider_auth: {
          openai: [{ type: "api", label: "API key" }],
        },
        provider: [],
        console_state: {
          consoleManagedProviders: [],
        },
        config: {
          model: "agency-swarm/default",
        },
      },
      bootstrap: async () => {},
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      model: {
        current: () => ({ providerID: "agency-swarm", modelID: "default" }),
      },
      agent: {
        current: () => undefined,
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        text: RGBA.fromHex("#ffffff"),
        textMuted: RGBA.fromHex("#999999"),
        primary: RGBA.fromHex("#00a3ff"),
        error: RGBA.fromHex("#ff5555"),
        success: RGBA.fromHex("#22c55e"),
        warning: RGBA.fromHex("#f59e0b"),
        secondary: RGBA.fromHex("#8b5cf6"),
        accent: RGBA.fromHex("#14b8a6"),
        info: RGBA.fromHex("#38bdf8"),
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)

    const Capture = () => {
      options = createDialogProviderOptionsWithFilter({ providerIDs: ["openai"] })
      return <box />
    }

    await testRender(() => <Capture />)
    await options()[0].onSelect?.()
    expect(dialogContent).toBeDefined()

    await testRender(() => dialogContent!())
    expect(dialogPromptConfirm).toBeDefined()

    await dialogPromptConfirm!("sk-user-input-secret")
    await flushEffects()

    expect(authSet).toHaveBeenCalledWith({
      providerID: "openai",
      auth: {
        type: "api",
        key: "sk-user-input-secret",
      },
    })
    expect(telemetryCapture).toHaveBeenCalledWith("provider_auth_failed", {
      auth_method: "api",
      error_bucket: "auth_rejected",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
      step: "api_key_save",
    })
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain(rawError)
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("sk-user-input-secret")
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("sk-provider-secret")
  })

  test("uses SDK response status for oauth callback failure telemetry", async () => {
    let dialogContent: (() => any) | undefined
    let options!: ReturnType<typeof createDialogProviderOptionsWithFilter>
    const telemetryCapture = spyOn(Telemetry, "capture").mockResolvedValue(false)
    const rawError = "oauth callback failed with raw secret sk-provider-secret"
    const callback = spyOn(
      {
        callback: async () => ({
          error: rawError,
          response: new Response(null, { status: 401 }),
        }),
      },
      "callback",
    )

    spyOn(DialogContext, "useDialog").mockReturnValue({
      replace: (next: () => any) => {
        dialogContent = next
      },
      clear: () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        provider: {
          oauth: {
            authorize: async () => ({
              data: {
                method: "code",
                url: "https://auth.example.com/authorize",
                instructions: "Paste the authorization code",
              },
            }),
            callback,
          },
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        provider_next: {
          all: [{ id: "openai", name: "OpenAI" }],
          connected: [],
        },
        provider_auth: {
          openai: [{ type: "oauth", label: "ChatGPT Pro/Plus (browser)" }],
        },
        provider: [],
        console_state: {
          consoleManagedProviders: [],
        },
        config: {
          model: "agency-swarm/default",
        },
      },
      bootstrap: async () => {},
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      model: {
        current: () => ({ providerID: "agency-swarm", modelID: "default" }),
      },
      agent: {
        current: () => undefined,
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        text: RGBA.fromHex("#ffffff"),
        textMuted: RGBA.fromHex("#999999"),
        primary: RGBA.fromHex("#00a3ff"),
        error: RGBA.fromHex("#ff5555"),
        success: RGBA.fromHex("#22c55e"),
        warning: RGBA.fromHex("#f59e0b"),
        secondary: RGBA.fromHex("#8b5cf6"),
        accent: RGBA.fromHex("#14b8a6"),
        info: RGBA.fromHex("#38bdf8"),
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)

    const Capture = () => {
      options = createDialogProviderOptionsWithFilter({ providerIDs: ["openai"] })
      return <box />
    }

    await testRender(() => <Capture />)
    await options()[0].onSelect?.()
    expect(dialogContent).toBeDefined()

    await testRender(() => dialogContent!())
    expect(dialogPromptConfirm).toBeDefined()

    await dialogPromptConfirm!("secret-auth-code")
    await flushEffects()

    expect(callback).toHaveBeenCalledWith({
      providerID: "openai",
      method: 0,
      code: "secret-auth-code",
    })
    expect(telemetryCapture).toHaveBeenCalledWith("provider_auth_failed", {
      auth_method: "oauth",
      error_bucket: "auth_rejected",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
      step: "oauth_callback",
    })
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain(rawError)
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("secret-auth-code")
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("sk-provider-secret")
  })
})
