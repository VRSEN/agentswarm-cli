import { afterEach, describe, expect, test } from "bun:test"
import {
  openAIProviderTestConfig,
  startAgencyProtocolServer,
  startTui,
  type AgencyProtocolServer,
  type TuiProcess,
} from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: AgencyProtocolServer | undefined
const tuiReadyTimeoutMs = process.env.CI ? 120_000 : 30_000
const tuiInteractionTimeoutMs = process.env.CI ? 60_000 : 45_000

const productAddons = JSON.stringify([
  { id: "search", title: "Search Add-on", keys: ["SEARCH_API_KEY"] },
  { id: "team", title: "Team Workspace", keys: ["TEAM_API_KEY", "TEAM_USER_ID"] },
  { id: "native-openai", title: "Native OpenAI Add-on", keys: ["NATIVE_OPENAI_KEY"], excludeProviders: ["openai"] },
])

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
})

describe("Agent Swarm downstream add-ons e2e", () => {
  test("downstream product add-ons command opens the native add-ons dialog", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      env: {
        AGENTSWARM_PRODUCT_ADDONS: productAddons,
      },
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/add")
    await currentTui.waitForText("/addons", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    const screen = await currentTui.waitForText("Search Add-on", tuiInteractionTimeoutMs)

    expect(screen).toContain("Search Add-on")
    expect(screen).toContain("Team Workspace")
    expect(screen).toContain("TEAM_API_KEY, TEAM_USER_ID")
    expect(screen).not.toContain("Native OpenAI Add-on")
    expect(screen).toContain("Continue")
  })

  test("downstream product /agents exact command is not shadowed by /addons", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      env: {
        AGENTSWARM_PRODUCT_ADDONS: productAddons,
      },
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    await currentTui.waitForText("Select swarm", tuiInteractionTimeoutMs)
    const screen = await currentTui.waitForText("Live QA Agency", tuiInteractionTimeoutMs)

    expect(screen).toContain("Live QA Agency")
    expect(screen).not.toContain("Configure add-ons")
  })

  test("downstream product auth success opens add-ons before closing", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      env: {
        AGENTSWARM_PRODUCT_ADDONS: productAddons,
      },
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/auth")
    await currentTui.waitForText("/auth", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitForText("OpenAI", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    const hasAPIKeyPrompt = () =>
      currentTui!.screen().includes("API key") && currentTui!.screen().includes("enter submit")
    await currentTui.waitFor(
      () => currentTui!.screen().includes("Manually enter API Key") || hasAPIKeyPrompt(),
      "OpenAI auth method or API key prompt",
      tuiInteractionTimeoutMs,
    )
    if (!hasAPIKeyPrompt()) currentTui.write("\x1b[B\r")
    await currentTui.waitFor(hasAPIKeyPrompt, "API key prompt", tuiInteractionTimeoutMs)
    currentTui.write("test-openai-key\r")
    const screen = await currentTui.waitForText("Search Add-on", tuiInteractionTimeoutMs)

    expect(screen).toContain("Configure add-ons")
    expect(screen).toContain("Team Workspace")
    expect(screen).not.toContain("Native OpenAI Add-on")
  })
})
