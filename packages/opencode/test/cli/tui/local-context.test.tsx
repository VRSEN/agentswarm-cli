/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createStore } from "solid-js/store"
import * as ArgsContext from "../../../src/cli/cmd/tui/context/args"
import { LocalProvider, useLocal } from "../../../src/cli/cmd/tui/context/local"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import { Filesystem } from "../../../src/util/filesystem"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("tui local context model sync", () => {
  afterEach(() => {
    mock.restore()
  })

  test("keeps following agent model changes without creating a local override", async () => {
    const [syncData, setSyncData] = createStore<any>({
      agent: [
        {
          name: "writer",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "gpt-5",
          },
        },
      ],
      provider: [
        {
          id: "openai",
          name: "OpenAI",
          models: {
            "gpt-5": { id: "gpt-5", name: "GPT-5" },
            "gpt-5.1": { id: "gpt-5.1", name: "GPT-5.1" },
          },
        },
      ],
      provider_default: {
        openai: "gpt-5",
      },
      config: {
        model: undefined,
        provider: {},
      },
      mcp: {},
    })

    spyOn(SyncContext, "useSync").mockReturnValue({ data: syncData } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        mcp: {
          disconnect: async () => {},
          connect: async () => {},
        },
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        secondary: {},
        accent: {},
        success: {},
        warning: {},
        primary: {},
        error: {},
        info: {},
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)
    spyOn(Filesystem, "readJson").mockResolvedValue({})
    spyOn(Filesystem, "writeJson").mockResolvedValue(undefined)

    let local!: ReturnType<typeof useLocal>

    const Capture = () => {
      local = useLocal()
      return <box />
    }

    await testRender(() => (
      <LocalProvider>
        <Capture />
      </LocalProvider>
    ))

    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
    expect(local.model.override("writer")).toBeUndefined()

    setSyncData("agent", 0, "model", {
      providerID: "openai",
      modelID: "gpt-5.1",
    })
    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5.1",
    })
    expect(local.model.override("writer")).toBeUndefined()
  })
})
