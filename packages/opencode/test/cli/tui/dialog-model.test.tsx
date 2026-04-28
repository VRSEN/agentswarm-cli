/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import * as DialogModelConnectedModule from "../../../src/cli/cmd/tui/component/use-connected"
import * as DialogSelectModule from "../../../src/cli/cmd/tui/ui/dialog-select"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as KeybindContext from "../../../src/cli/cmd/tui/context/keybind"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as ToastContext from "../../../src/cli/cmd/tui/ui/toast"

describe("DialogModel framework mode", () => {
  afterEach(() => {
    mock.restore()
  })

  test("provider-list keybind stays on /auth instead of upstream provider picker", async () => {
    let selectProps: DialogSelectModule.DialogSelectProps<any> | undefined

    spyOn(DialogSelectModule, "DialogSelect").mockImplementation((props: any) => {
      selectProps = props
      return <box />
    })
    spyOn(DialogContext, "useDialog").mockReturnValue({
      clear: mock(() => undefined),
      replace: mock(() => undefined),
      stack: [],
      size: "medium",
      setSize: mock(() => undefined),
    } as any)
    spyOn(DialogModelConnectedModule, "useConnected").mockReturnValue(() => true)
    spyOn(SDKContext, "useSDK").mockReturnValue({ client: {} } as any)
    spyOn(ToastContext, "useToast").mockReturnValue({
      show: mock(() => undefined),
      error: mock(() => undefined),
      currentToast: null,
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {},
    } as any)
    spyOn(KeybindContext, "useKeybind").mockReturnValue({
      all: {
        model_provider_list: ["ctrl+a"],
        model_favorite_toggle: ["ctrl+f"],
      },
    } as any)
    spyOn(LocalContext, "useLocal").mockReturnValue({
      agent: {
        current: () => ({
          name: "build",
          model: {
            providerID: AgencySwarmAdapter.PROVIDER_ID,
            modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
          },
        }),
      },
      model: {
        current: () => ({
          providerID: AgencySwarmAdapter.PROVIDER_ID,
          modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
        }),
        favorite: () => [],
        recent: () => [],
        set: mock(() => undefined),
        toggleFavorite: mock(() => undefined),
        variant: {
          selected: () => undefined,
          list: () => [],
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      data: {
        config: {
          model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
        },
        provider_next: {
          all: [
            {
              id: "openai",
              name: "OpenAI",
            },
          ],
          connected: ["openai"],
        },
        console_state: {
          consoleManagedProviders: [],
        },
        provider: [
          {
            id: "openai",
            name: "OpenAI",
            models: {},
          },
        ],
      },
    } as any)

    const { DialogModel } = await import("../../../src/cli/cmd/tui/component/dialog-model")
    await testRender(() => <DialogModel />)

    expect(selectProps?.keybind?.[0]?.title).toBe("Manage provider auth")
  })
})
