/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import * as DialogContext from "../../../src/cli/cmd/tui/ui/dialog"
import * as DialogPromptModule from "../../../src/cli/cmd/tui/ui/dialog-prompt"
import * as DialogSelectModule from "../../../src/cli/cmd/tui/ui/dialog-select"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as EnvFileModule from "../../../src/cli/cmd/tui/util/env-file"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("DialogAddons telemetry", () => {
  afterEach(() => {
    mock.restore()
  })

  test("captures requested allowlisted integrations without secret values", async () => {
    const product = AgencyProduct as unknown as { addons: AgencyProduct.Addon[] }
    const addons = [{ id: "search", title: "Search", keys: ["SEARCH_API_KEY"] }]
    const previous = product.addons
    const secret = "sk-secret-search"
    let selectProps: DialogSelectModule.DialogSelectProps<string> | undefined
    const dialog = {
      clear: mock(() => undefined),
      replace: mock(() => undefined),
      stack: [],
      size: "medium",
      setSize: mock(() => undefined),
    } as unknown as DialogContext.DialogContext

    product.addons = addons
    try {
      const { Telemetry } = await import("../../../src/telemetry/telemetry")
      const telemetryCapture = spyOn(Telemetry, "capture").mockResolvedValue(false)
      const writeEnvKeys = spyOn(EnvFileModule, "writeEnvKeys").mockImplementation(() => undefined)
      spyOn(EnvFileModule, "readEnvKey").mockReturnValue(undefined)
      spyOn(DialogContext, "useDialog").mockReturnValue(dialog)
      spyOn(DialogPromptModule.DialogPrompt, "show").mockResolvedValue(secret)
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

      expect(writeEnvKeys).toHaveBeenCalledWith([["SEARCH_API_KEY", secret]])
      expect(telemetryCapture).toHaveBeenCalledWith("integration_requested", {
        already_configured: false,
        integration_id: "search",
        provider_id: "openai",
        source: "addons_dialog",
      })
      const calls = JSON.stringify(telemetryCapture.mock.calls)
      expect(calls).not.toContain("SEARCH_API_KEY")
      expect(calls).not.toContain(secret)
    } finally {
      product.addons = previous
    }
  })
})
