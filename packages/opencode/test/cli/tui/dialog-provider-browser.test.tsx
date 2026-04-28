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

let openShouldFail = false
let openCalledWith: string | undefined

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

const { createDialogProviderOptionsWithFilter } = await import("../../../src/cli/cmd/tui/component/dialog-provider")

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("dialog provider browser auth", () => {
  afterEach(() => {
    mock.restore()
    openShouldFail = false
    openCalledWith = undefined
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
})
