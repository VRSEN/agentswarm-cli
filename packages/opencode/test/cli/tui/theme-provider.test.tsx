/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TerminalColors } from "@opentui/core"
import { testRender, useRenderer } from "@opentui/solid"
import { createEffect, onMount } from "solid-js"
import { Filesystem } from "../../../src/util/filesystem"
import { Glob } from "../../../src/util/glob"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadThemeModule() {
  return import(`../../../src/cli/cmd/tui/context/theme.tsx?test=${Date.now()}-${Math.random()}`)
}

test("ThemeProvider mounts after palette resolution but before theme.ready flips", async () => {
  const { ThemeProvider, DEFAULT_THEMES, useTheme } = await loadThemeModule()
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

test("ThemeProvider mounts on Apple Terminal before palette paint completes", async () => {
  const { ThemeProvider, useTheme } = await loadThemeModule()
  const originalTermProgram = process.env.TERM_PROGRAM
  const originalUp = Filesystem.up
  const originalScan = Glob.scan

  process.env.TERM_PROGRAM = "Apple_Terminal"
  Filesystem.up = async function* () {}
  Glob.scan = async () => []

  let resolvePalette!: (colors: TerminalColors) => void
  const palette = new Promise<TerminalColors>((resolve) => {
    resolvePalette = resolve
  })

  const mounted: Array<{ ready: boolean; paintReady: boolean }> = []
  const snapshots: Array<{ ready: boolean; paintReady: boolean }> = []

  const Probe = () => {
    const theme = useTheme()

    onMount(() => {
      mounted.push({
        ready: theme.ready,
        paintReady: theme.paintReady,
      })
    })

    createEffect(() => {
      snapshots.push({
        ready: theme.ready,
        paintReady: theme.paintReady,
      })
    })

    return <box />
  }

  const App = () => {
    const renderer = useRenderer()
    renderer.getPalette = async () => palette

    return (
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>
    )
  }

  try {
    await testRender(() => <App />)
    await delay(10)

    expect(mounted).toEqual([{ ready: false, paintReady: false }])
    expect(snapshots.some((entry) => entry.ready === false && entry.paintReady === false)).toBe(true)

    resolvePalette({
      defaultBackground: undefined,
      defaultForeground: undefined,
      palette: [],
    } as unknown as TerminalColors)
    await delay(10)

    expect(snapshots.some((entry) => entry.paintReady === true)).toBe(true)
  } finally {
    if (originalTermProgram === undefined) delete process.env.TERM_PROGRAM
    else process.env.TERM_PROGRAM = originalTermProgram
    Filesystem.up = originalUp
    Glob.scan = originalScan
  }
})

test("ThemeProvider blocks system theme selection on light Apple Terminal palettes", async () => {
  const { ThemeProvider, useTheme } = await loadThemeModule()
  const originalTermProgram = process.env.TERM_PROGRAM
  const originalUp = Filesystem.up
  const originalScan = Glob.scan

  process.env.TERM_PROGRAM = "Apple_Terminal"
  Filesystem.up = async function* () {}
  Glob.scan = async () => []

  const attempts: Array<{ allowed: boolean; selected: string }> = []
  let triedSystem = false

  const Probe = () => {
    const theme = useTheme()

    createEffect(() => {
      if (!theme.paintReady || triedSystem) return
      triedSystem = true
      attempts.push({
        allowed: theme.set("system"),
        selected: theme.selected,
      })
    })

    return <box />
  }

  const App = () => {
    const renderer = useRenderer()
    renderer.getPalette = async () =>
      ({
        defaultBackground: "#f5f5f5",
        defaultForeground: "#101010",
        palette: ["#f5f5f5", "#ff5555", "#50fa7b", "#f1fa8c", "#bd93f9", "#ff79c6", "#8be9fd", "#101010"],
      }) as unknown as TerminalColors

    return (
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>
    )
  }

  try {
    await testRender(() => <App />)
    await delay(10)

    expect(attempts).toEqual([{ allowed: false, selected: "opencode" }])
  } finally {
    if (originalTermProgram === undefined) delete process.env.TERM_PROGRAM
    else process.env.TERM_PROGRAM = originalTermProgram
    Filesystem.up = originalUp
    Glob.scan = originalScan
  }
})
