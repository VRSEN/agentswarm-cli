import { expect, test } from "bun:test"

const {
  DEFAULT_THEMES,
  allThemes,
  addTheme,
  canSelectBuiltInThemeName,
  defaultThemeName,
  hasTheme,
  isReservedThemeName,
  resolveTheme,
  upsertTheme,
} = await import("../../../src/cli/cmd/tui/context/theme")

test("addTheme writes into module theme store", () => {
  const name = `plugin-theme-${Date.now()}`
  expect(addTheme(name, DEFAULT_THEMES.opencode)).toBe(true)

  expect(allThemes()[name]).toBeDefined()
})

test("addTheme keeps first theme for duplicate names", () => {
  const name = `plugin-theme-keep-${Date.now()}`
  const one = structuredClone(DEFAULT_THEMES.opencode)
  const two = structuredClone(DEFAULT_THEMES.opencode)
  one.theme.primary = "#101010"
  two.theme.primary = "#fefefe"

  expect(addTheme(name, one)).toBe(true)
  expect(addTheme(name, two)).toBe(false)

  expect(allThemes()[name]).toBeDefined()
  expect(allThemes()[name]!.theme.primary).toBe("#101010")
})

test("addTheme ignores entries without a theme object", () => {
  const name = `plugin-theme-invalid-${Date.now()}`
  expect(addTheme(name, { defs: { a: "#ffffff" } })).toBe(false)
  expect(allThemes()[name]).toBeUndefined()
})

test("hasTheme checks theme presence", () => {
  const name = `plugin-theme-has-${Date.now()}`
  expect(hasTheme(name)).toBe(false)
  expect(addTheme(name, DEFAULT_THEMES.opencode)).toBe(true)
  expect(hasTheme(name)).toBe(true)
})

test("defaultThemeName always returns the Agent Swarm opencode palette regardless of terminal", () => {
  expect(defaultThemeName({ termProgram: "Apple_Terminal" })).toBe("opencode")
  expect(defaultThemeName({ termProgram: "Apple_Terminal", background: "#101010" })).toBe("opencode")
  expect(defaultThemeName({ termProgram: "Apple_Terminal", background: "#f5f5f5" })).toBe("opencode")
  expect(defaultThemeName({ termProgram: "iTerm.app" })).toBe("opencode")
  expect(defaultThemeName()).toBe("opencode")
})

test("built-in theme selection only allows opencode plus dark Apple Terminal system", () => {
  expect(canSelectBuiltInThemeName("opencode")).toBe(true)
  expect(canSelectBuiltInThemeName("system")).toBe(false)
  expect(canSelectBuiltInThemeName("system", { hasSystemTheme: true })).toBe(false)
  expect(canSelectBuiltInThemeName("system", { hasSystemTheme: true, allowSystemThemeSelection: false })).toBe(false)
  expect(canSelectBuiltInThemeName("system", { hasSystemTheme: true, allowSystemThemeSelection: true })).toBe(true)
  expect(canSelectBuiltInThemeName("solarized", { hasSystemTheme: true })).toBe(false)
})

test("resolveTheme always uses the dark variant", () => {
  const item = structuredClone(DEFAULT_THEMES.opencode)
  item.defs = {
    ...(item.defs ?? {}),
    darkOnly: "#010203",
    lightOnly: "#fafafa",
  }
  item.theme.primary = {
    dark: "darkOnly",
    light: "lightOnly",
  }

  const color = resolveTheme(item, "light").primary
  expect(color.r).toBeCloseTo(1 / 255, 6)
  expect(color.g).toBeCloseTo(2 / 255, 6)
  expect(color.b).toBeCloseTo(3 / 255, 6)
})

test("built-in opencode theme keeps the Agent Swarm dark palette", () => {
  expect(DEFAULT_THEMES.opencode.defs?.darkStep1).toBe("#0c102d")
  expect(DEFAULT_THEMES.opencode.defs?.darkStep9).toBe("#fcd53b")
  expect(DEFAULT_THEMES.opencode.defs?.darkSecondary).toBe("#5a70b4")
  expect(DEFAULT_THEMES.opencode.defs?.darkAccent).toBe("#e8d382")
})

test("system stays reserved while the built-in opencode theme stays protected", () => {
  const item = structuredClone(DEFAULT_THEMES.opencode)
  item.theme.primary = "#010203"

  expect(isReservedThemeName("opencode")).toBe(true)
  expect(isReservedThemeName("system")).toBe(true)
  expect(addTheme(`system-${Date.now()}`, item)).toBe(true)
  expect(addTheme("system", item)).toBe(false)
  expect(upsertTheme("system", item)).toBe(false)
  expect(allThemes().system).toBeUndefined()
  expect(upsertTheme("opencode", item)).toBe(false)
  expect(resolveTheme(allThemes().opencode).primary.toString()).toBe(
    resolveTheme(DEFAULT_THEMES.opencode).primary.toString(),
  )
})

test("resolveTheme rejects circular color refs", () => {
  const item = structuredClone(DEFAULT_THEMES.opencode)
  item.defs = {
    ...item.defs,
    one: "two",
    two: "one",
  }
  item.theme.primary = "one"

  expect(() => resolveTheme(item, "dark")).toThrow("Circular color reference")
})
