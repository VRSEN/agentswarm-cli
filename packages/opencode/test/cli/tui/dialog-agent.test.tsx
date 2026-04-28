/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { RGBA } from "@opentui/core"
import { AgencySwarmAdapter } from "../../../src/agency-swarm/adapter"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as DialogSelectModule from "../../../src/cli/cmd/tui/ui/dialog-select"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("DialogAgent agency selection", () => {
  afterEach(() => {
    mock.restore()
  })

  test("selecting an agency row uses live labels and keeps the entry recipient selected", async () => {
    let selectProps: DialogSelectModule.DialogSelectProps<any> | undefined
    const configUpdate = mock(async (_input: unknown, _options?: unknown) => ({ data: undefined }))
    const dispose = mock(async () => undefined)
    const bootstrap = mock(async () => undefined)
    const toastShow = mock(() => undefined)

    spyOn(AgencySwarmAdapter, "discover").mockResolvedValue({
      agencies: [
        {
          id: "local-agency",
          name: "Live Agency",
          description: "Current live agency",
          metadata: {},
          agents: [
            {
              id: "entry-agent",
              name: "Entry Agent",
              description: "Primary route",
              isEntryPoint: true,
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
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: toastShow,
      error: mock(() => undefined),
      currentToast: null,
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
        list: () => [{ name: "build" }],
        set: mock(() => undefined),
        color: () => RGBA.fromHex("#38bdf8"),
      },
      model: {
        current: () => ({
          providerID: AgencySwarmAdapter.PROVIDER_ID,
          modelID: AgencySwarmAdapter.DEFAULT_MODEL_ID,
        }),
        variant: {
          current: () => undefined,
          list: () => [],
          set: mock(() => undefined),
        },
      },
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        global: {
          config: {
            update: configUpdate,
          },
        },
        instance: {
          dispose,
        },
      },
    } as any)
    spyOn(SyncContext, "useSync").mockReturnValue({
      bootstrap,
      data: {
        config: {
          model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
          provider: {
            [AgencySwarmAdapter.PROVIDER_ID]: {
              options: {
                baseURL: "http://127.0.0.1:8000",
                agency: "local-agency",
              },
            },
          },
        },
        provider: [
          {
            id: AgencySwarmAdapter.PROVIDER_ID,
            key: "token",
          },
        ],
      },
    } as any)

    const { DialogAgent } = await import("../../../src/cli/cmd/tui/component/dialog-agent")
    await testRender(() => <DialogAgent />)
    await flushEffects()
    await Bun.sleep(0)
    await flushEffects()

    const agencyOption = selectProps?.options.find((option) => option.title === "Live Agency")
    expect(agencyOption).toBeDefined()

    selectProps!.onSelect!(agencyOption!)
    await flushEffects()
    await Bun.sleep(0)
    await flushEffects()

    const updateInput = configUpdate.mock.calls[0]?.[0] as any
    const options = updateInput.config.provider[AgencySwarmAdapter.PROVIDER_ID].options
    expect(options.agency).toBe("local-agency")
    expect(options.recipientAgent).toBe("entry-agent")
    expect(toastShow).toHaveBeenCalledWith({
      variant: "success",
      message: "Selected Entry Agent in agency Live Agency",
      duration: 3000,
    })
  })
})
