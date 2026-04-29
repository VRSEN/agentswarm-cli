import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  startAgencyProtocolServer,
  startTui,
  startTuiDemoAgencyServer,
  writeAgencyProject,
  type TuiProcess,
  type AgencyProtocolServer,
} from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: AgencyProtocolServer | undefined
const tempDirs: string[] = []
const tuiReadyTimeoutMs = 30_000
const tuiInteractionTimeoutMs = 45_000

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("Agent Swarm terminal TUI e2e", () => {
  test("launcher shows the detected-project choice before any venv work", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-detected-project-"))
    tempDirs.push(project)
    await writeAgencyProject(project)

    currentTui = await startTui({
      cwd: path.join(import.meta.dir, "..", "..", "packages", "opencode"),
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: undefined,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agency Swarm project", 10_000)
    expect(currentTui.history()).toContain(project)
    expect(currentTui.history()).not.toContain("Creating virtual environment")
  })

  test("run-mode slash commands keep /auth and /connect separate and hide native commands", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/")
    await currentTui.waitForText("/auth")
    const screen = await currentTui.waitForText("/connect")

    expect(screen).toContain("/auth")
    expect(screen).toContain("/connect")
    expect(screen).toContain("/agents")
  })

  test("run-mode slash command filtering hides native commands by query", async () => {
    for (const [hiddenCommand, query] of [
      ["/editor", "/edi"],
      ["/variants", "/var"],
      ["/init", "/ini"],
      ["/review", "/rev"],
    ] as const) {
      currentServer = await startAgencyProtocolServer()
      currentTui = await startTui({ baseURL: currentServer.baseURL })

      await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
      currentTui.write(query)
      await currentTui.waitForText(query)

      expect(currentTui.screen()).not.toContain(hiddenCommand)

      await currentTui.close()
      currentTui = undefined
      currentServer.stop()
      currentServer = undefined
    }
  })

  test("run-target picker uses live agency labels instead of local-agency ids", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("Live QA Agency")

    expect(screen).toContain("Entry Agent")
    expect(screen).toContain("Review Agent")
    expect(screen).not.toContain("local-agency")
  })

  test("run-target picker uses Swarm and agent wording against the TUI demo swarm", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("TuiDemoAgency")

    expect(screen).toContain("Select swarm")
    expect(screen).toContain("Swarm: TuiDemoAgency")
    expect(screen).toContain("UserSupportAgent")
    expect(screen).toContain("MathAgent")
    expect(screen.toLowerCase()).not.toContain("recipient")
  })

  test("selecting the swarm row clears stale explicit agent routing", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await selectCurrentSwarm(currentTui)
    currentTui.write("route through the whole swarm\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "swarm-routed request",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests[0]?.body).toMatchObject({
      message: "route through the whole swarm",
    })
    expect(currentServer.requests[0]?.body).not.toHaveProperty("recipient_agent")
  })

  test("selecting a specific agent routes the next prompt to that agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await selectRunTarget(currentTui, "MathAgent", "Selected MathAgent in swarm TuiDemoAgency")
    currentTui.write("calculate through the selected agent\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agent-routed request",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests[0]?.body).toMatchObject({
      message: "calculate through the selected agent",
      recipient_agent: "MathAgent",
    })
  })

  test("transfer_to handoff switches control to the target agent for the next turn", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("please handoff this calculation\r")
    await currentTui.waitForText("Math agent now has control.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "handoff request", tuiInteractionTimeoutMs)

    currentTui.write("continue after handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-handoff request",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests[0]?.body).toMatchObject({
      message: "please handoff this calculation",
      recipient_agent: "UserSupportAgent",
    })
    expect(currentServer.requests[1]?.body).toMatchObject({
      message: "continue after handoff",
      recipient_agent: "MathAgent",
    })
  })

  test("prompt submit reaches the agency protocol server with the configured agent", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("hello from terminal e2e\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency protocol server stream request",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests[0]?.body).toMatchObject({
      message: "hello from terminal e2e",
      recipient_agent: "entry-agent",
    })
  })

  test("harness does not leak parent provider credentials to the agency protocol server", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      env: {
        OPENAI_API_KEY: "sentinel-openai-key",
        ANTHROPIC_API_KEY: "sentinel-anthropic-key",
        ANTHROPIC_AUTH_TOKEN: "sentinel-anthropic-token",
      },
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("check env isolation\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency protocol server stream request",
      tuiInteractionTimeoutMs,
    )

    const body = JSON.stringify(currentServer.requests[0]?.body)
    expect(body).not.toContain("sentinel-openai-key")
    expect(body).not.toContain("sentinel-anthropic-key")
    expect(body).not.toContain("sentinel-anthropic-token")
  })
})

async function selectRunTarget(tui: TuiProcess, query: string, successMessage: string) {
  tui.write("/agents\r")
  await tui.waitForText("Select swarm")
  tui.write(query)
  await tui.waitForText(query)
  tui.write("\x1b[B")
  tui.write("\r")
  await tui.waitForText(successMessage, tuiInteractionTimeoutMs)
}

async function selectCurrentSwarm(tui: TuiProcess) {
  tui.write("/agents\r")
  await tui.waitForText("TuiDemoAgency")
  tui.write("\x1b[A\x1b[A\r")
  await tui.waitForText("Selected swarm TuiDemoAgency", tuiInteractionTimeoutMs)
}
