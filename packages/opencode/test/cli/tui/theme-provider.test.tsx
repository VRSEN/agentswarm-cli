/** @jsxImportSource @opentui/solid */
import { afterEach, expect, mock, spyOn, test } from "bun:test"
import * as fs from "fs/promises"
import path from "path"
import type { TerminalColors } from "@opentui/core"
import { testRender, useRenderer } from "@opentui/solid"
import { createEffect, onMount } from "solid-js"
import { tmpdir } from "../../fixture/fixture"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

async function awaitSignal<T>(promise: Promise<T>, message: string, timeout = 2000) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeout)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function loadThemeModule() {
  return import(`../../../src/cli/cmd/tui/context/theme.tsx?test=${Date.now()}-${Math.random()}`)
}

const originalTermProgram = process.env.TERM_PROGRAM

afterEach(() => {
  mock.restore()
  if (originalTermProgram === undefined) delete process.env.TERM_PROGRAM
  else process.env.TERM_PROGRAM = originalTermProgram
})

test.serial("ThemeProvider mounts after palette resolution but before theme.ready flips", async () => {
  const { ThemeProvider, DEFAULT_THEMES, useTheme } = await loadThemeModule()
  const name = `delayed-theme-${Date.now()}`
  const customTheme = structuredClone(DEFAULT_THEMES.opencode)
  customTheme.theme.primary = "#010203"

  await using tmp = await tmpdir()
  const themePath = path.join(tmp.path, ".agentswarm", "themes", `${name}.json`)
  await fs.mkdir(path.dirname(themePath), { recursive: true })
  await fs.writeFile(themePath, JSON.stringify(customTheme))
  spyOn(process, "cwd").mockImplementation(() => tmp.path)

  const mounted = deferred<boolean>()
  const missingCustom = deferred<void>()
  const loadedCustom = deferred<void>()
  let sawMissingCustom = false
  let sawLoadedCustom = false

  const Probe = () => {
    const theme = useTheme()

    onMount(() => {
      mounted.resolve(theme.ready)
    })

    createEffect(() => {
      if (!sawMissingCustom && theme.ready === false && theme.has(name) === false) {
        sawMissingCustom = true
        missingCustom.resolve()
      }
      if (!sawLoadedCustom && theme.ready === true && theme.has(name) === true) {
        sawLoadedCustom = true
        loadedCustom.resolve()
      }
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

  await testRender(() => <App />)

  expect(await awaitSignal(mounted.promise, "ThemeProvider did not mount")).toBe(false)
  await awaitSignal(missingCustom.promise, "ThemeProvider never observed the pre-ready state")
  await awaitSignal(loadedCustom.promise, "ThemeProvider never loaded the custom theme")
})

test.serial("ThemeProvider mounts on Apple Terminal before palette paint completes", async () => {
  process.env.TERM_PROGRAM = "Apple_Terminal"

  const { ThemeProvider, useTheme } = await loadThemeModule()
  await using tmp = await tmpdir()
  spyOn(process, "cwd").mockImplementation(() => tmp.path)

  let resolvePalette!: (colors: TerminalColors) => void
  const palette = new Promise<TerminalColors>((resolve) => {
    resolvePalette = resolve
  })

  const mounted = deferred<{ ready: boolean; paintReady: boolean }>()
  const initialSnapshot = deferred<void>()
  const paintReadySnapshot = deferred<void>()
  let sawInitialSnapshot = false
  let sawPaintReady = false

  const Probe = () => {
    const theme = useTheme()

    onMount(() => {
      mounted.resolve({
        ready: theme.ready,
        paintReady: theme.paintReady,
      })
    })

    createEffect(() => {
      if (!sawInitialSnapshot && theme.ready === false && theme.paintReady === false) {
        sawInitialSnapshot = true
        initialSnapshot.resolve()
      }
      if (!sawPaintReady && theme.paintReady === true) {
        sawPaintReady = true
        paintReadySnapshot.resolve()
      }
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

  await testRender(() => <App />)

  expect(await awaitSignal(mounted.promise, "ThemeProvider did not mount in Apple Terminal")).toEqual({
    ready: false,
    paintReady: false,
  })
  await awaitSignal(initialSnapshot.promise, "ThemeProvider never reported the pre-paint Apple Terminal state")

  resolvePalette({
    defaultBackground: undefined,
    defaultForeground: undefined,
    palette: [],
  } as unknown as TerminalColors)

  await awaitSignal(paintReadySnapshot.promise, "ThemeProvider never became paint-ready")
})

test.serial("ThemeProvider blocks system theme selection on light Apple Terminal palettes", async () => {
  process.env.TERM_PROGRAM = "Apple_Terminal"

  const { ThemeProvider, useTheme } = await loadThemeModule()
  await using tmp = await tmpdir()
  spyOn(process, "cwd").mockImplementation(() => tmp.path)

  const attempt = deferred<{ allowed: boolean; selected: string }>()
  let triedSystem = false

  const Probe = () => {
    const theme = useTheme()

    createEffect(() => {
      if (!theme.paintReady || triedSystem) return
      triedSystem = true
      attempt.resolve({
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

  await testRender(() => <App />)

  expect(
    await awaitSignal(attempt.promise, "ThemeProvider never attempted to select the system theme"),
  ).toEqual({ allowed: false, selected: "opencode" })
})
