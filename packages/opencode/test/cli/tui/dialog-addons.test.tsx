/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as DialogPromptModule from "../../../src/cli/cmd/tui/ui/dialog-prompt"
import * as DialogSelectModule from "../../../src/cli/cmd/tui/ui/dialog-select"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("DialogAddons telemetry", () => {
  afterEach(() => {
    mock.restore()
  })

  test("captures requested allowlisted integrations without secret values", async () => {
    let selectProps: DialogSelectModule.DialogSelectProps<string> | undefined
    const dialog = {
      clear: mock(() => undefined),
      replace: mock(() => undefined),
      stack: [],
      size: "medium",
      setSize: mock(() => undefined),
    } as unknown as DialogContext.DialogContext
    mock.module("@/agency-swarm/product", () => ({
      AgencyProduct: {
        addons: [{ id: "search", title: "Search", keys: ["SEARCH_API_KEY"] }],
        name: "Agent Swarm",
      },
    }))
    const { Telemetry } = await import("../../../src/telemetry/telemetry")
    const telemetryCapture = spyOn(Telemetry, "capture").mockResolvedValue(false)
    spyOn(DialogContext, "useDialog").mockReturnValue(dialog)
    spyOn(DialogPromptModule.DialogPrompt, "show").mockResolvedValue(null)
    spyOn(DialogSelectModule, "DialogSelect").mockImplementation(
      <T,>(props: DialogSelectModule.DialogSelectProps<T>) => {
        selectProps = props as unknown as DialogSelectModule.DialogSelectProps<string>
        return <box />
      },
    )
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        success: RGBA.fromHex("#22c55e"),
        textMuted: RGBA.fromHex("#94a3b8"),
      },
    } as ReturnType<typeof ThemeContext.useTheme>)

    const { DialogAddons } = await import("../../../src/cli/cmd/tui/component/dialog-addons")
    await testRender(() => <DialogAddons providerID="openai" onDone={mock(() => undefined)} />)

    const search = selectProps?.options.find((option) => option.value === "search")
    expect(search).toBeDefined()
    search?.onSelect?.(dialog)
    await flushEffects()

    const cont = selectProps?.options.find((option) => option.value === "continue")
    expect(cont).toBeDefined()
    cont?.onSelect?.(dialog)
    await flushEffects()

    expect(telemetryCapture).toHaveBeenCalledWith("integration_requested", {
      already_configured: false,
      integration_id: "search",
      provider_id: "openai",
      source: "addons_dialog",
    })
    expect(JSON.stringify(telemetryCapture.mock.calls)).not.toContain("SEARCH_API_KEY")
  })
})
