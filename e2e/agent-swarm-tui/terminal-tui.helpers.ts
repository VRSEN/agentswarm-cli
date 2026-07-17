import { expect } from "bun:test"
import { latestOpenAITestModel, type NativeLLMServer, type TuiProcess } from "./harness"

export const tuiReadyTimeoutMs = process.env.CI ? 120_000 : 30_000
export const tuiInteractionTimeoutMs = process.env.CI ? 60_000 : 45_000
export const tuiNativeTurnTimeoutMs = process.env.CI ? tuiReadyTimeoutMs : tuiInteractionTimeoutMs

export async function waitForConfiguredDemoRecipient(tui: TuiProcess) {
  await tui.waitFor(
    () => tui.screen().includes("UserSupportAgent"),
    "configured demo recipient",
    tuiInteractionTimeoutMs,
  )
}

export function hasCommand(screen: string, command: string) {
  return screen.split("\n").some((line) => new RegExp(`┃\\s+${command}\\b`).test(line))
}

export function hasCompletedModeTurn(text: string, mode: "Build" | "Plan" | "Run") {
  return new RegExp(`▣\\s+${mode} · .+ · \\d+(?:\\.\\d+)?(?:ms|s)`).test(text)
}

export function hasCompletedRunTurn(screen: string) {
  return hasCompletedModeTurn(screen, "Run")
}

export function clearPrompt(tui: TuiProcess) {
  tui.write("\x15")
  tui.write("\x7f".repeat(120))
  tui.write("\b".repeat(120))
}

export function hasAgentModeDialog(screen: string) {
  return (
    screen.includes("Select agent") &&
    screen.includes("Build") &&
    screen.includes("Plan") &&
    !screen.includes("Select model")
  )
}

export function hasSelectedMode(screen: string, mode: "Build" | "Plan" | "Run") {
  return screen.split("\n").some((line) => line.includes(`● ${mode}`))
}

export function hasFilteredMode(screen: string, mode: "Build" | "Plan" | "Run") {
  const options = {
    Build: "Build Agent Builder for swarms and agents",
    Plan: "Plan Plan work before building",
    Run: "Run Use the connected swarm",
  }
  return (
    screen.includes(options[mode]) &&
    Object.entries(options).every(([key, label]) => key === mode || !screen.includes(label))
  )
}

export function hasModeOrder(screen: string) {
  const plan = screen.indexOf("Plan Plan work before building")
  const build = screen.indexOf("Build Agent Builder for swarms and agents")
  return plan >= 0 && build > plan
}

export function footerHasMode(screen: string, mode: string) {
  const lines = screen.split("\n")
  return lines.some((line, index) => line.includes(`${mode} ·`) && (lines[index + 1] ?? "").includes("▀▀"))
}

export function nativeOpenAIOnlyConfig(baseURL: string) {
  return {
    $schema: "https://opencode.ai/config.json",
    model: latestOpenAITestModel,
    enabled_providers: ["openai"],
    provider: {
      openai: {
        options: {
          apiKey: "test-openai-key",
          baseURL,
        },
      },
    },
  }
}

export async function waitForModelOption(tui: TuiProcess, model: string) {
  await tui.waitFor(
    () =>
      tui
        .screen()
        .split("\n")
        .some((line) => line.includes(model) && line.includes("OpenAI")),
    `${model} model option`,
    tuiInteractionTimeoutMs,
  )
}

export async function selectProductMode(
  tui: TuiProcess,
  mode: "Build" | "Plan" | "Run",
  options?: { expectStarting?: boolean },
) {
  clearPrompt(tui)
  if (footerHasMode(tui.screen(), mode)) return
  tui.write("/agents\r")
  await tui.waitFor(() => hasAgentModeDialog(tui.screen()), "agent mode dialog", tuiInteractionTimeoutMs)
  expect(hasModeOrder(tui.screen())).toBe(true)
  await Bun.sleep(100)
  tui.write(mode)
  await tui.waitFor(
    () => hasSelectedMode(tui.screen(), mode) || hasFilteredMode(tui.screen(), mode),
    `${mode} mode option`,
    tuiInteractionTimeoutMs,
  )
  tui.write("\r")
  if (options?.expectStarting) await tui.waitForText("Refreshing project dependencies...", tuiInteractionTimeoutMs)
  await tui.waitFor(() => !tui.screen().includes("Select agent"), `${mode} mode selected`, tuiInteractionTimeoutMs)
  clearPrompt(tui)
}

export function nativeRequestBody(request: NativeLLMServer["requests"][number]) {
  return JSON.stringify(request.body)
}

export function isNativeTitleRequest(request: NativeLLMServer["requests"][number]) {
  const body = nativeRequestBody(request)
  return body.includes("title generator") || body.includes("Generate a title for this conversation")
}

export async function waitForNativeLLMRequest(tui: TuiProcess, server: NativeLLMServer, prompt: string) {
  let request: NativeLLMServer["requests"][number] | undefined
  await tui.waitFor(
    () => {
      request = server.requests.find((item) => {
        return nativeRequestBody(item).includes(prompt) && !isNativeTitleRequest(item)
      })
      return request !== undefined
    },
    `native LLM request containing ${prompt}`,
    tuiInteractionTimeoutMs,
  )
  return request!
}
