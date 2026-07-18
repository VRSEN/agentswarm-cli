import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { latestOpenAITestModel, startTui, writeAgencyProject, type TuiProcess } from "./harness"
import { footerHasMode, tuiReadyTimeoutMs } from "./terminal-tui.helpers"

// Live test: requires a real OpenAI key in AGENTSWARM_LIVE_OPENAI_API_KEY.
// A dedicated variable is used because test/preload.ts deletes OPENAI_API_KEY
// and the harness scrubs it from the TUI child env; the key is passed through
// provider config instead and never printed.
const liveKey = process.env.AGENTSWARM_LIVE_OPENAI_API_KEY
const liveTurnTimeoutMs = 180_000
const attemptPrompts = [
  "build me a swarm that handles my stuff",
  "make me some agents that do things for my business, you figure out the details",
  "I want a swarm. Just build whatever.",
]

let currentTui: TuiProcess | undefined
const tempDirs: string[] = []

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

function liveOpenAIConfig() {
  return {
    $schema: "https://opencode.ai/config.json",
    model: latestOpenAITestModel,
    enabled_providers: ["openai"],
    provider: {
      openai: {
        options: {
          apiKey: liveKey,
        },
      },
    },
  }
}

function normalized(screen: string) {
  return screen.replace(/\s+/g, " ")
}

function hasPlanSwitchDialog(screen: string) {
  const flat = normalized(screen)
  return flat.includes("Would you like to switch to Plan before Build starts editing?")
}

async function startLiveBuildTui() {
  const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-plan-switch-live-"))
  tempDirs.push(project)
  await writeAgencyProject(project)
  const tui = await startTui({
    args: [project, "--model", latestOpenAITestModel],
    env: {
      AGENTSWARM_LAUNCHER: "0",
      OPENCODE_CONFIG_CONTENT: JSON.stringify(liveOpenAIConfig()),
    },
  })
  await tui.waitFor(() => footerHasMode(tui.screen(), "Build"), "Build footer", tuiReadyTimeoutMs)
  return tui
}

describe.skipIf(!liveKey)("Build to Plan switch with a live model", () => {
  test(
    "vague swarm request in Build triggers plan_enter and Yes lands in Plan",
    async () => {
      let dialogScreen: string | undefined
      let attempts = 0

      for (const prompt of attemptPrompts) {
        attempts++
        currentTui = await startLiveBuildTui()
        currentTui.write(`${prompt}\r`)
        try {
          await currentTui.waitFor(
            () => hasPlanSwitchDialog(currentTui!.screen()),
            "Build to Plan switch question",
            liveTurnTimeoutMs,
          )
          dialogScreen = currentTui.screen()
          break
        } catch (error) {
          console.log(`[live] attempt ${attempts}: no plan_enter dialog for ${JSON.stringify(prompt)}`)
          console.log(currentTui.screen())
          if (attempts === attemptPrompts.length) throw error
          await currentTui.close()
          currentTui = undefined
        }
      }

      console.log(`[live] plan_enter dialog appeared on attempt ${attempts}`)
      console.log("=== SCREEN AT DIALOG ===")
      console.log(dialogScreen)

      const flatDialog = normalized(dialogScreen!)
      expect(flatDialog).toContain("Would you like to switch to Plan before Build starts editing?")
      expect(flatDialog).toContain("Yes")
      expect(flatDialog).toContain("No")
      expect(footerHasMode(dialogScreen!, "Plan")).toBe(false)

      // Yes is the preselected first option.
      currentTui!.write("\r")
      await currentTui!.waitFor(
        () => footerHasMode(currentTui!.screen(), "Plan"),
        "Plan footer after approving the switch",
        liveTurnTimeoutMs,
      )
      const planScreen = currentTui!.screen()
      console.log("=== SCREEN AFTER YES (PLAN MODE) ===")
      console.log(planScreen)
      expect(footerHasMode(planScreen, "Plan")).toBe(true)
      expect(normalized(planScreen)).not.toContain("Would you like to switch to Plan before Build starts editing?")
    },
    { timeout: 600_000 },
  )
})
