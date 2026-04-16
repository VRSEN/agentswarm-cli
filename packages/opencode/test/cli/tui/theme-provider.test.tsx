/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TerminalColors } from "@opentui/core"
import { testRender, useRenderer } from "@opentui/solid"
import { createEffect, onMount } from "solid-js"
import { ThemeProvider, DEFAULT_THEMES, useTheme } from "../../../src/cli/cmd/tui/context/theme"
import { Filesystem } from "../../../src/util/filesystem"
import { Glob } from "../../../src/util/glob"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test("ThemeProvider mounts after palette resolution but before theme.ready flips", async () => {
  const name = `delayed-theme-${Date.now()}`
  const customTheme = structuredClone(DEFAULT_THEMES.opencode)
  customTheme.theme.primary = "#010203"

  const originalUp = Filesystem.up
  const originalScan = Glob.scan
  const originalReadJson = Filesystem.readJson

  Filesystem.up = async function* () {}
  Glob.scan = async () => {
    await delay(50)
    return [`/tmp/${name}.json`]
  }
  Filesystem.readJson = async () => customTheme as never

  const mounted: boolean[] = []
  const snapshots: Array<{ ready: boolean; hasCustom: boolean }> = []

  const Probe = () => {
    const theme = useTheme()

    onMount(() => {
      mounted.push(theme.ready)
    })

    createEffect(() => {
      snapshots.push({
        ready: theme.ready,
        hasCustom: theme.has(name),
      })
    })

    return <box />
  }

  const App = () => {
    const renderer = useRenderer()
    renderer.getPalette = async () =>
      ({
        defaultBackground: undefined,
        defaultForeground: undefined,
        palette: [],
      }) as unknown as TerminalColors

    return (
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>
    )
  }

  try {
    await testRender(() => <App />)
    await delay(100)

    expect(mounted).toEqual([false])
    expect(snapshots.some((entry) => entry.ready === false && entry.hasCustom === false)).toBe(true)
    expect(snapshots.some((entry) => entry.ready === true && entry.hasCustom === true)).toBe(true)
  } finally {
    Filesystem.up = originalUp
    Glob.scan = originalScan
    Filesystem.readJson = originalReadJson
  }
})
