import { expect, test } from "bun:test"
import { internalTuiPlugins } from "../../../src/cli/cmd/tui/plugin/internal"

test("internal plugins register the agency sidebar between context and MCP", () => {
  const ids = internalTuiPlugins({ experimentalEventSystem: false }).map((plugin) => plugin.id)

  expect(ids).toContain("internal:sidebar-agency")
  expect(ids.indexOf("internal:sidebar-context")).toBeLessThan(ids.indexOf("internal:sidebar-agency"))
  expect(ids.indexOf("internal:sidebar-agency")).toBeLessThan(ids.indexOf("internal:sidebar-mcp"))
})
