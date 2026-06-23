/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import * as DialogModelConnectedModule from "../../../src/cli/cmd/tui/component/use-connected"
import * as DialogSelectModule from "../../../src/cli/cmd/tui/ui/dialog-select"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as KeybindContext from "@tui/context/keybind"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as ToastContext from "../../../src/cli/cmd/tui/ui/toast"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

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

    expect(selectProps?.actions?.[0]?.title).toBe("Manage provider auth")
  })

  test("agency default current row uses discovered model label", async () => {
    let selectProps: DialogSelectModule.DialogSelectProps<any> | undefined

    spyOn(AgencySwarmAdapter, "discover").mockResolvedValue({
      agencies: [
        {
          id: "tui-demo-agency",
          name: "TuiDemoAgency",
          metadata: {},
          agents: [
            {
              id: "UserSupportAgent",
              name: "UserSupportAgent",
              isEntryPoint: true,
              model: "gpt-5.4-mini",
            },
            {
              id: "MathAgent",
              name: "MathAgent",
              isEntryPoint: false,
              model: "claude-sonnet-4-5",
            },
          ],
        },
      ],
      rawOpenAPI: {},
    })
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
        recent: () => [
          {
            providerID: AgencySwarmAdapter.PROVIDER_ID,
            modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
          },
        ],
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
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              options: {
                baseURL: "http://127.0.0.1:8000",
                agency: "tui-demo-agency",
                recipientAgent: "UserSupportAgent",
              },
            },
          },
        },
        provider_next: {
          all: [
            {
              id: AgencySwarmAdapter.PROVIDER_ID,
              name: "Agency Swarm",
            },
          ],
          connected: [AgencySwarmAdapter.PROVIDER_ID],
        },
        console_state: {
          consoleManagedProviders: [],
        },
        provider: [
          {
            id: AgencySwarmAdapter.PROVIDER_ID,
            name: "Agency Swarm",
            models: {
              [AgencySwarmAdapter.DEFAULT_MODEL_ID]: {
                id: AgencySwarmAdapter.DEFAULT_MODEL_ID,
                name: "Swarm Default",
                providerID: AgencySwarmAdapter.PROVIDER_ID,
                status: "active",
              },
            },
          },
        ],
      },
    } as any)

    const { DialogModel } = await import("../../../src/cli/cmd/tui/component/dialog-model")
    await testRender(() => <DialogModel />)
    await flushEffects()
    await Bun.sleep(0)
    await flushEffects()

    const current = selectProps?.options.find(
      (option) =>
        option.value.providerID === AgencySwarmAdapter.PROVIDER_ID &&
        option.value.modelID === AgencySwarmAdapter.DEFAULT_MODEL_ID,
    )
    expect(current?.title).toBe("gpt-5.4-mini")
    expect(current?.description).toBe("Agency Swarm")
  })

  test("native mode keeps custom ollama providers visible", async () => {
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
            providerID: "openai",
            modelID: "gpt-4o",
          },
        }),
      },
      model: {
        current: () => ({
          providerID: "openai",
          modelID: "gpt-4o",
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
          model: "openai/gpt-4o",
        },
        provider_next: {
          all: [
            {
              id: "ollama",
              name: "Ollama",
            },
          ],
          connected: ["ollama"],
        },
        console_state: {
          consoleManagedProviders: [],
        },
        provider: [
          {
            id: "ollama",
            name: "Ollama",
            models: {
              local: {
                id: "local",
                name: "Local",
                providerID: "ollama",
                status: "active",
                cost: { input: 0 },
              },
            },
          },
        ],
      },
    } as any)

    const { DialogModel } = await import("../../../src/cli/cmd/tui/component/dialog-model")
    await testRender(() => <DialogModel />)

    expect(selectProps?.options.some((option) => option.value.providerID === "ollama")).toBe(true)
  })
})
