/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import * as ProjectContext from "../../../src/cli/cmd/tui/context/project"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as TuiConfigContext from "../../../src/cli/cmd/tui/context/tui-config"
import * as TuiPluginRuntime from "../../../src/cli/cmd/tui/plugin/runtime"

const product = AgencyProduct as { name: string; productVersion?: string }
const defaults = {
  name: AgencyProduct.name,
  productVersion: AgencyProduct.productVersion,
}

afterEach(() => {
  product.name = defaults.name
  product.productVersion = defaults.productVersion
  mock.restore()
})

async function renderSidebar(input: { name: string; productVersion?: string }) {
  const color = RGBA.fromHex("#ffffff")
  product.name = input.name
  product.productVersion = input.productVersion
  spyOn(ProjectContext, "useProject").mockReturnValue({
    workspace: {
      get: () => undefined,
      status: () => undefined,
    },
  } as unknown as ReturnType<typeof ProjectContext.useProject>)
  spyOn(SyncContext, "useSync").mockReturnValue({
    session: {
      get: () => ({
        id: "session_1",
        title: "Version test",
      }),
    },
  } as unknown as ReturnType<typeof SyncContext.useSync>)
  spyOn(ThemeContext, "useTheme").mockReturnValue({
    theme: {
      background: color,
      backgroundPanel: color,
      borderActive: color,
      success: color,
      text: color,
      textMuted: color,
    },
  } as unknown as ReturnType<typeof ThemeContext.useTheme>)
  spyOn(TuiConfigContext, "useTuiConfig").mockReturnValue(
    {} as unknown as ReturnType<typeof TuiConfigContext.useTuiConfig>,
  )
  spyOn(TuiPluginRuntime, "Slot").mockImplementation((props) => <>{props.children}</>)

  const { Sidebar } = await import("../../../src/cli/cmd/tui/routes/session/sidebar")
  const rendered = await testRender(() => <Sidebar sessionID="session_1" />, { width: 60, height: 12 })
  await rendered.renderOnce()
  const frame = rendered.captureCharFrame()
  rendered.renderer.destroy()
  return frame
}

describe("sidebar product version", () => {
  test("shows the OpenSwarm product version", async () => {
    const frame = await renderSidebar({
      name: "OpenSwarm",
      productVersion: "1.1.3",
    })

    expect(frame).toContain("OpenSwarm 1.1.3")
    expect(frame).not.toContain(`OpenSwarm ${InstallationVersion}`)
  })

  test("falls back to the installation version for Agent Swarm", async () => {
    const frame = await renderSidebar({
      name: "Agent Swarm",
    })

    expect(frame).toContain(`Agent Swarm ${InstallationVersion}`)
  })
})
