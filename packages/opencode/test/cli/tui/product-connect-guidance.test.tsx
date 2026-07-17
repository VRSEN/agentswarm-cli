/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import * as KeymapModule from "../../../src/cli/cmd/tui/keymap"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import { createTuiPluginApi } from "../../fixture/tui-plugin"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

async function captureSlot(input: {
  plugin: () => Promise<{ default: TuiPluginModule }>
  slot: "home_bottom" | "sidebar_footer"
  showConnect: boolean
}) {
  spyOn(AgencyProduct, "shouldShowConnect").mockReturnValue(input.showConnect)
  spyOn(KeymapModule, "useBindings").mockReturnValue(undefined)
  spyOn(KeymapModule, "useCommandShortcut").mockReturnValue(() => "")

  let render: (() => unknown) | undefined
  const base = createTuiPluginApi({
    state: {
      provider: [],
      session: {
        count: () => 0,
      },
    },
  })
  spyOn(ThemeContext, "useTheme").mockReturnValue({ theme: base.theme.current } as ReturnType<
    typeof ThemeContext.useTheme
  >)
  const api = {
    ...base,
    slots: {
      register(plugin: { slots: Partial<Record<typeof input.slot, () => unknown>> }) {
        render = plugin.slots[input.slot]
        return "fixture-slot"
      },
    },
  } as typeof base

  const plugin = await input.plugin()
  await plugin.default.tui(api, undefined, {
    state: "same",
    id: "internal:product-connect-guidance",
    source: "internal",
    spec: "internal:product-connect-guidance",
    target: "internal:product-connect-guidance",
    first_time: 0,
    last_time: 0,
    time_changed: 0,
    load_count: 1,
    fingerprint: "internal:product-connect-guidance",
  })
  const rendered = await testRender(() => render?.() ?? null, { width: 90, height: 22 })
  await flushEffects()
  await rendered.renderOnce()
  const frame = rendered.captureCharFrame()
  rendered.renderer.destroy()
  return frame
}

describe("product connect guidance", () => {
  afterEach(() => {
    mock.restore()
  })

  test("renders /connect guidance for the default Agent Swarm profile", async () => {
    const sidebar = await captureSlot({
      plugin: () => import("../../../src/cli/cmd/tui/feature-plugins/sidebar/footer"),
      slot: "sidebar_footer",
      showConnect: true,
    })
    mock.restore()
    const home = await captureSlot({
      plugin: () => import("../../../src/cli/cmd/tui/feature-plugins/home/tips"),
      slot: "home_bottom",
      showConnect: true,
    })

    expect(sidebar).toContain("/connect")
    expect(home).toContain("/connect")
  })

  test("removes /connect guidance from the hidden downstream profile", async () => {
    const sidebar = await captureSlot({
      plugin: () => import("../../../src/cli/cmd/tui/feature-plugins/sidebar/footer"),
      slot: "sidebar_footer",
      showConnect: false,
    })
    mock.restore()
    const home = await captureSlot({
      plugin: () => import("../../../src/cli/cmd/tui/feature-plugins/home/tips"),
      slot: "home_bottom",
      showConnect: false,
    })
    const allHiddenTips = AgencyProduct.tips(
      [
        "Use {highlight}/connect{/highlight} for a custom server",
        () => "Use {highlight}/connect{/highlight} after an outage",
        "Use {highlight}/auth{/highlight} for provider credentials",
      ],
      { hideConnect: true },
    )
    const allHiddenTipText = allHiddenTips.flatMap((tip) => {
      const value = typeof tip === "string" ? tip : tip()
      return value ? [value] : []
    })

    expect(sidebar).not.toContain("/connect")
    expect(sidebar).toContain("/auth")
    expect(home).not.toContain("/connect")
    expect(home).toContain("/auth")
    expect(allHiddenTipText.join("\n")).not.toContain("/connect")
  })
})
