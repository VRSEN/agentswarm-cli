import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { startFakeAgencyServer, startTui, writeAgencyProject, type TuiProcess, type FakeAgencyServer } from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: FakeAgencyServer | undefined
const tempDirs: string[] = []

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
    currentServer = await startFakeAgencyServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("agent-swarm", 12_000)
    currentTui.write("/")
    await currentTui.waitForText("/auth")
    const screen = await currentTui.waitForText("/connect")

    expect(screen).toContain("/auth")
    expect(screen).toContain("/connect")
    expect(screen).toContain("/agents")
    expect(screen).not.toContain("/editor")
    expect(screen).not.toContain("/variants")
    expect(screen).not.toContain("/init")
    expect(screen).not.toContain("/review")
  })

  test("run-target picker uses live agency labels instead of local-agency ids", async () => {
    currentServer = await startFakeAgencyServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("agent-swarm", 12_000)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("Live QA Agency")

    expect(screen).toContain("Entry Agent")
    expect(screen).toContain("Review Agent")
    expect(screen).not.toContain("local-agency")
  })

  test("prompt submit reaches the fake agency with the configured recipient", async () => {
    currentServer = await startFakeAgencyServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("agent-swarm", 12_000)
    currentTui.write("hello from terminal e2e\r")
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "fake agency stream request", 15_000)

    expect(currentServer.requests[0]?.body).toMatchObject({
      message: "hello from terminal e2e",
      recipient_agent: "entry-agent",
    })
  })
})
