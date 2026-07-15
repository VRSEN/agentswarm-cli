import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import {
  agencyClientConfigModel,
  alternateOpenAITestModel,
  alternateOpenAITestModelLabel,
  latestOpenAITestModel,
  latestOpenAITestModelLabel,
  openAIProviderTestConfig,
  startAgencyProtocolServer,
  startMultiAgencyServer,
  startNativeLLMServer,
  startTui,
  startTuiDemoAgencyServer,
  writeAgencyProject,
  type NativeLLMServer,
  type TuiProcess,
  type AgencyProtocolServer,
} from "./harness"
import {
  clearPrompt,
  footerHasMode,
  hasAgentModeDialog,
  hasCommand,
  hasCompletedModeTurn,
  hasCompletedRunTurn,
  hasFilteredMode,
  hasModeOrder,
  hasSelectedMode,
  isNativeTitleRequest,
  nativeOpenAIOnlyConfig,
  nativeRequestBody,
  selectProductMode,
  tuiInteractionTimeoutMs,
  tuiNativeTurnTimeoutMs,
  tuiReadyTimeoutMs,
  waitForConfiguredDemoRecipient,
  waitForModelOption,
  waitForNativeLLMRequest,
} from "./terminal-tui.helpers"

let currentTui: TuiProcess | undefined
let currentServer: AgencyProtocolServer | undefined
let currentNativeServer: NativeLLMServer | undefined
let currentTelemetryServer: ReturnType<typeof startTelemetryServer> | undefined
let sharedTelemetryServer: ReturnType<typeof startTelemetryServer> | undefined
let sharedTelemetryBuildDir: string | undefined
const tempDirs: string[] = []
const livePostHogTest = process.env.AGENTSWARM_LIVE_POSTHOG_E2E === "1" ? test : test.skip
const unixTest = process.platform === "win32" ? test.skip : test
const fakePostHogKeyFragments = ["dummy", "example", "fake", "not-a-live-key", "ph_test"]

function commandLine(screen: string, command: string) {
  return screen.split("\n").find((line) => new RegExp(`┃\\s+${command}\\b`).test(line)) ?? ""
}

function nativeOpenAIWithStaleAgencyConfig(baseURL: string) {
  return {
    ...nativeOpenAIOnlyConfig(baseURL),
    enabled_providers: ["openai"],
    disabled_providers: ["agency-swarm"],
    provider: {
      ...nativeOpenAIOnlyConfig(baseURL).provider,
      "agency-swarm": {
        name: "Agency Swarm",
        options: {
          baseURL: "http://127.0.0.1:9",
          agency: "stale-agency",
          discoveryTimeoutMs: 100,
          timeout: false as const,
        },
      },
    },
  }
}

async function waitForLocalRunSession(stateHome: string, directory: string) {
  const file = path.join(stateHome, "agentswarm", "agency-swarm-run-sessions.json")
  const directories = equivalentResolvedTestPaths(directory)
  const deadline = Date.now() + tuiInteractionTimeoutMs
  while (Date.now() < deadline) {
    if (await Bun.file(file).exists()) {
      const data = JSON.parse(await readFile(file, "utf8")) as Record<string, { mode?: string; directory?: string }>
      if (
        Object.values(data).some((item) => {
          return item.mode === "local-project" && directories.has(path.resolve(item.directory ?? ""))
        })
      ) {
        return
      }
    }
    await Bun.sleep(100)
  }
  throw new Error(`No local Run session recorded for ${directory}`)
}

async function expectNoLocalRunSession(stateHome: string, directory: string) {
  const file = path.join(stateHome, "agentswarm", "agency-swarm-run-sessions.json")
  if (!(await Bun.file(file).exists())) return
  const directories = equivalentResolvedTestPaths(directory)
  const data = JSON.parse(await readFile(file, "utf8")) as Record<string, { mode?: string; directory?: string }>
  const match = Object.values(data).find((item) => {
    return item.mode === "local-project" && directories.has(path.resolve(item.directory ?? ""))
  })
  expect(match).toBeUndefined()
}

function equivalentResolvedTestPaths(file: string) {
  const resolved = path.resolve(file)
  const values = new Set([resolved])
  if (process.platform === "darwin" && resolved.startsWith("/var/")) {
    values.add(`/private${resolved}`)
  }
  if (process.platform === "darwin" && resolved.startsWith("/private/var/")) {
    values.add(resolved.slice("/private".length))
  }
  return values
}

async function readGlobalAgencyConfigText(tui: TuiProcess) {
  const dir = path.join(tui.root, "config", "agentswarm")
  const entries = await readdir(dir).catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return []
    throw error
  })
  const files = entries.filter((entry) => entry === "agentswarm.json" || entry === "agentswarm.jsonc")
  return (await Promise.all(files.map((file) => readFile(path.join(dir, file), "utf8")))).join("\n")
}

async function waitForAgencyServerClosed(baseURL: string) {
  const deadline = Date.now() + tuiInteractionTimeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/openapi.json`, { signal: AbortSignal.timeout(1000) })
      if (!response.ok) return
    } catch {
      return
    }
    await Bun.sleep(100)
  }
  throw new Error(`Agency server stayed reachable at ${baseURL}`)
}

async function waitForLocalRunServerURL(dir: string) {
  const file = path.join(dir, ".run-server-url")
  const deadline = Date.now() + tuiInteractionTimeoutMs
  while (Date.now() < deadline) {
    if (await Bun.file(file).exists()) return (await readFile(file, "utf8")).trim()
    await Bun.sleep(100)
  }
  throw new Error(`No local Run server URL recorded for ${dir}`)
}

async function waitForLocalRunServerCleanup(dir: string, baseURL: string) {
  const file = path.join(dir, `.run-server-closed-${new URL(baseURL).port}`)
  const deadline = Date.now() + tuiInteractionTimeoutMs
  while (Date.now() < deadline) {
    if (await Bun.file(file).exists()) return
    await Bun.sleep(100)
  }
  throw new Error(`No local Run server cleanup marker recorded for ${baseURL}`)
}

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
  currentNativeServer?.stop()
  currentNativeServer = undefined
  if (currentTelemetryServer && currentTelemetryServer !== sharedTelemetryServer) currentTelemetryServer.stop()
  currentTelemetryServer = undefined
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

afterAll(async () => {
  sharedTelemetryServer?.stop()
  sharedTelemetryServer = undefined
  if (sharedTelemetryBuildDir) {
    await rm(sharedTelemetryBuildDir, { recursive: true, force: true })
    sharedTelemetryBuildDir = undefined
  }
})

describe("Agent Swarm terminal TUI e2e", () => {
  const packageRoot = path.join(import.meta.dir, "..", "..", "packages", "opencode")
  let telemetryMigrations: Promise<{ sql: string; timestamp: number; name: string }[]> | undefined
  let sharedTelemetryBinary: Promise<string> | undefined
  type BuildConfig = Parameters<typeof Bun.build>[0]
  type BuildPlugin = NonNullable<BuildConfig["plugins"]>[number]

  async function useSharedTelemetryTui() {
    sharedTelemetryServer ??= startTelemetryServer()
    sharedTelemetryServer.reset()
    currentTelemetryServer = sharedTelemetryServer
    sharedTelemetryBinary ??= buildTelemetryTui({ host: sharedTelemetryServer.url, shared: true })
    return sharedTelemetryBinary
  }

  async function buildTelemetryTui(input: { host: string; key?: string; shared?: boolean }) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-telemetry-tui-build-"))
    if (input.shared) sharedTelemetryBuildDir = dir
    else tempDirs.push(dir)
    const binary = path.join(dir, "agentswarm")
    const workerPath = "./src/cli/cmd/tui/worker.ts"
    const result = await Bun.build({
      entrypoints: ["./src/index.ts", await resolveParserWorker(), workerPath],
      outdir: dir,
      target: "bun",
      format: "esm",
      conditions: ["browser"],
      tsconfig: "./tsconfig.json",
      plugins: [await createSolidPlugin()],
      external: ["jsonc-parser", "node-gyp"],
      minify: true,
      sourcemap: "none",
      splitting: true,
      write: true,
      compile: {
        autoloadBunfig: false,
        autoloadDotenv: false,
        autoloadTsconfig: true,
        autoloadPackageJson: true,
        outfile: binary,
        execArgv: ["--use-system-ca", "--"],
      },
      define: {
        AGENTSWARM_POSTHOG_API_KEY: JSON.stringify(input.key ?? "ph_test"),
        AGENTSWARM_POSTHOG_HOST: JSON.stringify(input.host),
        AGENTSWARM_TELEMETRY_TEST: "true",
        OPENCODE_MIGRATIONS: JSON.stringify(await loadTelemetryMigrations()),
        OPENCODE_WORKER_PATH: workerPath,
        OPENCODE_LIBC: JSON.stringify("glibc"),
        OPENCODE_CHANNEL: JSON.stringify("dev"),
        OPENCODE_VERSION: JSON.stringify("local"),
      },
    })
    if (!result.success) throw new Error(result.logs.map((log) => log.message).join("\n"))
    if (!(await Bun.file(binary).exists())) throw new Error("Telemetry TUI build did not emit a binary")
    return binary
  }

  async function createSolidPlugin(): Promise<BuildPlugin> {
    const plugin = (await import(
      pathToFileURL(path.join(packageRoot, "node_modules", "@opentui", "solid", "scripts", "solid-plugin.ts")).href
    )) as {
      createSolidTransformPlugin: () => BuildPlugin
    }
    return plugin.createSolidTransformPlugin()
  }

  async function resolveParserWorker() {
    const paths = [
      path.join(packageRoot, "node_modules", "@opentui", "core", "parser.worker.js"),
      path.join(packageRoot, "..", "..", "node_modules", "@opentui", "core", "parser.worker.js"),
    ]
    for (const item of paths) {
      if (await Bun.file(item).exists()) return item
    }
    throw new Error("Could not find @opentui/core parser.worker.js for telemetry TUI build")
  }

  async function loadTelemetryMigrations() {
    telemetryMigrations ??= readTelemetryMigrations()
    return telemetryMigrations
  }

  async function readTelemetryMigrations() {
    const dir = path.join(packageRoot, "migration")
    const entries = await readdir(dir, { withFileTypes: true })
    return Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && /^\d{14}/.test(entry.name))
        .map((entry) => entry.name)
        .sort()
        .map(async (name) => ({
          name,
          timestamp: Date.UTC(
            Number(name.slice(0, 4)),
            Number(name.slice(4, 6)) - 1,
            Number(name.slice(6, 8)),
            Number(name.slice(8, 10)),
            Number(name.slice(10, 12)),
            Number(name.slice(12, 14)),
          ),
          sql: await readFile(path.join(dir, name, "migration.sql"), "utf8"),
        })),
    )
  }

  test("launcher shows the detected-project choice before any venv work", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-detected-project-"))
    tempDirs.push(project)
    await writeAgencyProject(project)

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: undefined,
      },
      args: [project],
    })

    await currentTui.waitForText("Checking Agent Swarm project files...", 10_000)
    await currentTui.waitForText("Use detected Agent Swarm project", 10_000)
    expect(currentTui.history()).toContain(project)
    expect(currentTui.history()).not.toContain("Creating virtual environment")
  })

  test("launcher recovers when agency.py cannot be read", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-unreadable-project-"))
    tempDirs.push(project)
    await mkdir(path.join(project, "agency.py"))

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: undefined,
      },
      args: [project],
    })

    await currentTui.waitForText("Could not read agency.py", 10_000)
    const screen = await currentTui.waitForText("Try again", tuiInteractionTimeoutMs)
    const normalized = screen.replace(/\s+/g, " ").replace(/\s+\./g, ".")

    expect(normalized).toContain(
      "Could not read agency.py. Make sure the project files are downloaded and readable, then try again.",
    )
    expect(screen).toContain("Try again")
    expect(screen).toContain("Connect to a running Agent Swarm")
    expect(screen).toContain("Cancel")
    expect(screen).not.toContain("Create a new Agent Swarm project")
  })

  unixTest(
    "launcher opens Build after startup failure and restarts repaired local Run from stale env config",
    async () => {
      const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-fallback-"))
      const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-fallback-state-"))
      tempDirs.push(project, stateHome)
      await writeAgencyProject(project)
      await writeBrokenLaunchVenvPython(project)
      currentNativeServer = await startNativeLLMServer()
      const config = nativeOpenAIWithStaleAgencyConfig(currentNativeServer.baseURL)

      currentTui = await startTui({
        cwd: packageRoot,
        env: {
          AGENTSWARM_LAUNCHER: "1",
          OPENCODE_CONFIG_CONTENT: JSON.stringify({
            ...config,
            provider: {
              ...config.provider,
              "agency-swarm": {
                ...config.provider["agency-swarm"],
                options: {
                  ...config.provider["agency-swarm"].options,
                  agency: "local-agency",
                  recipientAgent: "entry-agent",
                  recipientAgentSelectedAt: 1,
                },
              },
            },
            agent: {
              reviewer: {
                mode: "primary",
                description: "Native reviewer",
                model: latestOpenAITestModel,
                prompt: "Native reviewer instructions.",
              },
            },
          }),
          XDG_STATE_HOME: stateHome,
        },
        args: [project],
      })

      await currentTui.waitForText("Use detected Agent Swarm project", tuiInteractionTimeoutMs)
      currentTui.write("\r")
      await currentTui.waitForText("Opening Build so you can fix this project.", tuiInteractionTimeoutMs)
      await currentTui.waitFor(
        () => footerHasMode(currentTui!.screen(), "Build"),
        "Build fallback footer",
        tuiReadyTimeoutMs,
      )
      await currentTui.waitForText("Your agency project could not load.", tuiInteractionTimeoutMs)
      await currentTui.waitForText("ModuleNotFoundError", tuiInteractionTimeoutMs)
      expect(currentTui.history()).toContain("No module named 'dotenv_missing'")
      expect(currentTui.history()).not.toContain("then run agentswarm again")

      currentTui.write("\r")
      const request = await waitForNativeLLMRequest(currentTui, currentNativeServer, "dotenv_missing")
      const body = nativeRequestBody(request)
      expect(body).toContain("Fix this startup error")
      expect(body).toContain("Agent Swarm Build Instructions")
      expect(body).not.toContain("Agent Swarm Planner Instructions")
      await expectNoLocalRunSession(stateHome, project)

      await markBrokenLaunchFixed(project)
      await writeLocalRunRefreshManifest(project, 300)
      await writeRunVersion(project, "first repaired local run response")
      await selectProductMode(currentTui, "Run", { expectStarting: true })
      currentTui.write("try fixed swarm from startup fallback\r")
      await currentTui.waitForText("first repaired local run response", tuiInteractionTimeoutMs)
      await currentTui.waitForText("recipient=entry-agent", tuiInteractionTimeoutMs)
      const refresh = await readFile(path.join(project, ".uv-run-refresh-log"), "utf8")
      expect(refresh).toContain("pip install --python")
      expect(refresh).not.toContain("--upgrade")
      await waitForLocalRunSession(stateHome, project)
      expect(await readGlobalAgencyConfigText(currentTui)).not.toContain("local-agency")

      await selectProductMode(currentTui, "Build")
      currentTui.write("/agents\r")
      await currentTui.waitForText("Reviewer", tuiInteractionTimeoutMs)
      currentTui.write("\x1b")
      await currentTui.waitFor(
        () => !currentTui!.screen().includes("Select agent"),
        "native agent picker dismissed",
        tuiInteractionTimeoutMs,
      )
      clearPrompt(currentTui)
      await writeFailingLocalRunRefreshManifest(project)
      currentTui.write("/agents\r")
      await currentTui.waitFor(() => hasAgentModeDialog(currentTui!.screen()), "agent mode dialog", tuiInteractionTimeoutMs)
      await Bun.sleep(100)
      currentTui.write("Run")
      await currentTui.waitFor(
        () => hasSelectedMode(currentTui!.screen(), "Run") || hasFilteredMode(currentTui!.screen(), "Run"),
        "Run mode option",
        tuiInteractionTimeoutMs,
      )
      currentTui.write("\r")
      const failure = await currentTui.waitForText("dependency refresh exploded", tuiInteractionTimeoutMs)
      expect(failure).toContain("Run failed:")
      expect(failure).toContain("Startup failed — press Enter to retry")
      expect(failure).toContain("Select agent")
      expect(footerHasMode(currentTui.screen(), "Build")).toBe(true)

      await writeLocalRunRefreshManifest(project)
      await writeRunVersion(project, "second repaired local run response")
      currentTui.write("\r")
      await currentTui.waitFor(
        () => !currentTui!.screen().includes("Select agent"),
        "Run retry selected",
        tuiInteractionTimeoutMs,
      )
      clearPrompt(currentTui)
      currentTui.write("try fixed swarm after second repair\r")
      await currentTui.waitForText("second repaired local run response", tuiInteractionTimeoutMs)
      await currentTui.waitForText("recipient=entry-agent", tuiInteractionTimeoutMs)
      await waitForLocalRunSession(stateHome, project)
      await currentTui.waitFor(
        () => !currentTui!.screen().includes("esc interrupt"),
        "idle after second repaired local run",
        tuiInteractionTimeoutMs,
      )

      const localRunBaseURL = await waitForLocalRunServerURL(project)
      clearPrompt(currentTui)
      currentTui.write("/connect")
      await currentTui.waitFor(
        () => commandLine(currentTui!.screen(), "/connect").includes("Connect to local agency-swarm server"),
        "live /connect command suggestion",
        tuiInteractionTimeoutMs,
      )
      currentTui.write("\r")
      await currentTui.waitForText(localRunBaseURL, tuiInteractionTimeoutMs)
      await currentTui.waitFor(
        () => currentTui!.screen().includes(`● ${localRunBaseURL} Available`),
        "current local server selected",
        tuiInteractionTimeoutMs,
      )
      currentTui.write("\r")
      await currentTui.waitForText(`Connected to ${localRunBaseURL}`, tuiInteractionTimeoutMs)
      await waitForLocalRunSession(stateHome, project)
      expect(await readGlobalAgencyConfigText(currentTui)).not.toContain(localRunBaseURL)

      currentTui.write("same local server after connect\r")
      await currentTui.waitForText(
        "second repaired local run response: same local server after connect",
        tuiInteractionTimeoutMs,
      )
      await currentTui.waitForText("recipient=entry-agent", tuiInteractionTimeoutMs)
      await currentTui.waitFor(
        () => hasCompletedRunTurn(currentTui!.history()) && !currentTui!.screen().includes("esc interrupt"),
        "idle after same-server connect run",
        tuiInteractionTimeoutMs,
      )

      currentServer = await startAgencyProtocolServer()
      clearPrompt(currentTui)
      currentTui.write("/connect")
      await currentTui.waitFor(
        () => commandLine(currentTui!.screen(), "/connect").includes("Connect to local agency-swarm server"),
        "live /connect command suggestion",
        tuiInteractionTimeoutMs,
      )
      currentTui.write("\r")
      await currentTui.waitForText("Add local port", tuiInteractionTimeoutMs)
      await currentTui.waitFor(
        () => currentTui!.screen().includes(`${localRunBaseURL} Available`),
        "current local server visible before external connect",
        tuiInteractionTimeoutMs,
      )
      currentTui.write("\x1b[B\r")
      await currentTui.waitForText("Add local Agency port", tuiInteractionTimeoutMs)
      currentTui.write(`${new URL(currentServer.baseURL).port}\r`)
      await currentTui.waitForText(`Connected to ${currentServer.baseURL}`, tuiInteractionTimeoutMs)
      await waitForLocalRunServerCleanup(project, localRunBaseURL)
      await waitForAgencyServerClosed(localRunBaseURL)

      currentTui.write("external run after local cleanup\r")
      await currentTui.waitFor(
        () => currentServer!.requests.some((request) => request.body.message === "external run after local cleanup"),
        "external Run request after local cleanup",
        tuiInteractionTimeoutMs,
      )
      await expectNoLocalRunSession(stateHome, project)
    },
  )

  unixTest("startup Build fallback keeps slash commands available from the repair prompt", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-slash-fallback-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-slash-state-"))
    tempDirs.push(project, stateHome)
    await writeAgencyProject(project)
    await writeBrokenLaunchVenvPython(project)
    currentNativeServer = await startNativeLLMServer()

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: JSON.stringify(nativeOpenAIWithStaleAgencyConfig(currentNativeServer.baseURL)),
        XDG_STATE_HOME: stateHome,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agent Swarm project", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitFor(
      () => footerHasMode(currentTui!.screen(), "Build"),
      "Build fallback footer",
      tuiReadyTimeoutMs,
    )
    await currentTui.waitForText("Your agency project could not load.", tuiInteractionTimeoutMs)

    currentTui.write("/agents\r")
    await currentTui.waitFor(
      () => hasAgentModeDialog(currentTui!.screen()),
      "agent mode dialog",
      tuiInteractionTimeoutMs,
    )
    expect(currentNativeServer.requests.some((request) => nativeRequestBody(request).includes("dotenv_missing"))).toBe(
      false,
    )
    await expectNoLocalRunSession(stateHome, project)
  })

  unixTest("startup Build fallback opens for agency.py syntax errors", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-syntax-fallback-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-syntax-state-"))
    tempDirs.push(project, stateHome)
    await writeAgencyProject(project)
    await writeBrokenLaunchVenvPython(project, "syntax")
    currentNativeServer = await startNativeLLMServer()

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: JSON.stringify(nativeOpenAIWithStaleAgencyConfig(currentNativeServer.baseURL)),
        XDG_STATE_HOME: stateHome,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agent Swarm project", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitFor(
      () => footerHasMode(currentTui!.screen(), "Build"),
      "Build fallback footer",
      tuiReadyTimeoutMs,
    )
    await currentTui.waitForText("Your agency project failed to start.", tuiInteractionTimeoutMs)
    await currentTui.waitForText("SyntaxError: invalid syntax", tuiInteractionTimeoutMs)
    await currentTui.waitForText("At: agency.py:1", tuiInteractionTimeoutMs)

    currentTui.write("\r")
    const request = await waitForNativeLLMRequest(currentTui, currentNativeServer, "SyntaxError: invalid syntax")
    const body = nativeRequestBody(request)
    expect(body).toContain("Fix this startup error")
    expect(body).toContain("Agent Swarm Build Instructions")
    await expectNoLocalRunSession(stateHome, project)
  })

  unixTest("same-server /connect from Build fallback clears pending local Run startup", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-same-connect-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-same-state-"))
    tempDirs.push(project, stateHome)
    await writeAgencyProject(project)
    await writeBrokenLaunchVenvPython(project)
    currentNativeServer = await startNativeLLMServer()
    currentServer = await startAgencyProtocolServer()
    const config = nativeOpenAIWithStaleAgencyConfig(currentNativeServer.baseURL)
    config.provider["agency-swarm"].options.baseURL = currentServer.baseURL
    config.provider["agency-swarm"].options.agency = "local-agency"

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
        XDG_STATE_HOME: stateHome,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agent Swarm project", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitFor(
      () => footerHasMode(currentTui!.screen(), "Build"),
      "Build fallback footer",
      tuiReadyTimeoutMs,
    )
    await currentTui.waitForText("Your agency project could not load.", tuiInteractionTimeoutMs)
    await expectNoLocalRunSession(stateHome, project)

    currentTui.write("/connect")
    await currentTui.waitFor(
      () => commandLine(currentTui!.screen(), "/connect").includes("Connect to local agency-swarm server"),
      "live /connect command suggestion",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitForText(currentServer.baseURL, tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentTui!.screen().includes(`● ${currentServer!.baseURL} Available`),
      "current external server selected",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitForText(`Connected to ${currentServer.baseURL}`, tuiInteractionTimeoutMs)

    await selectProductMode(currentTui, "Run")
    currentTui.write("same external connected fallback run\r")
    await currentTui.waitFor(
      () => currentServer!.requests.some((request) => request.body.message === "same external connected fallback run"),
      "same external connected fallback Run request",
      tuiInteractionTimeoutMs,
    )
    await expectNoLocalRunSession(stateHome, project)
  })

  unixTest("external /connect from Build fallback is not overwritten by pending local Run startup", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-connect-fallback-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-startup-connect-state-"))
    tempDirs.push(project, stateHome)
    await writeAgencyProject(project)
    await writeBrokenLaunchVenvPython(project)
    currentNativeServer = await startNativeLLMServer()
    currentServer = await startAgencyProtocolServer()

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: JSON.stringify(nativeOpenAIWithStaleAgencyConfig(currentNativeServer.baseURL)),
        XDG_STATE_HOME: stateHome,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agent Swarm project", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitFor(
      () => footerHasMode(currentTui!.screen(), "Build"),
      "Build fallback footer",
      tuiReadyTimeoutMs,
    )
    await currentTui.waitForText("Your agency project could not load.", tuiInteractionTimeoutMs)

    currentTui.write("\r")
    const request = await waitForNativeLLMRequest(currentTui, currentNativeServer, "dotenv_missing")
    const body = nativeRequestBody(request)
    expect(body).toContain("Fix this startup error")
    expect(body).toContain("Agent Swarm Build Instructions")
    expect(body).not.toContain("Agent Swarm Planner Instructions")
    await currentTui.waitFor(
      () =>
        hasCompletedModeTurn(currentTui!.history(), "Build") &&
        footerHasMode(currentTui!.screen(), "Build") &&
        !currentTui!.screen().includes("esc interrupt"),
      "idle Build fallback after native startup request",
      tuiNativeTurnTimeoutMs,
    )
    await expectNoLocalRunSession(stateHome, project)

    clearPrompt(currentTui)
    currentTui.write("/connect")
    await currentTui.waitFor(
      () => commandLine(currentTui!.screen(), "/connect").includes("Connect to local agency-swarm server"),
      "live /connect command suggestion",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitForText("Add local port", tuiInteractionTimeoutMs)
    await currentTui.waitForText("Unavailable - current", tuiInteractionTimeoutMs)
    currentTui.write("\x1b[B\r")
    await currentTui.waitForText("Add local Agency port", tuiInteractionTimeoutMs)
    currentTui.write(`${new URL(currentServer.baseURL).port}\r`)
    await currentTui.waitForText(`Connected to ${currentServer.baseURL}`, tuiInteractionTimeoutMs)

    await selectProductMode(currentTui, "Run")
    currentTui.write("external connected fallback run\r")
    await currentTui.waitFor(
      () => currentServer!.requests.some((request) => request.body.message === "external connected fallback run"),
      "external connected fallback Run request",
      tuiInteractionTimeoutMs,
    )
    await expectNoLocalRunSession(stateHome, project)
    const configText = await readGlobalAgencyConfigText(currentTui)
    expect(configText).toContain(currentServer!.baseURL)
    expect(configText).not.toContain("local-agency")
  })

  test("launcher uses Agent Swarm connect copy without stale hints", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-connect-launch-"))
    tempDirs.push(project)

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: undefined,
      },
      args: [project],
    })

    await currentTui.waitForText("How do you want to start?", 10_000)
    currentTui.write("\x1b[B\r")
    const screen = await currentTui.waitForText("Agent Swarm server URL", tuiInteractionTimeoutMs)

    expect(screen).toContain("Connect to a running Agent Swarm")
    expect(screen).toContain("Connect Agent Swarm to a running Agent Swarm.")
    expect(screen).not.toContain("recommended for a fresh setup")
    expect(screen).not.toContain("local or remote Agency Swarm server")
  })

  test("run-mode slash commands keep /auth and /connect separate and hide native commands", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("/")
    await currentTui.waitForText("/auth")
    const screen = await currentTui.waitForText("/connect")

    expect(hasCommand(screen, "/auth")).toBe(true)
    expect(hasCommand(screen, "/connect")).toBe(true)
    expect(commandLine(screen, "/auth")).toContain("Manage provider auth")
    expect(commandLine(screen, "/connect")).toContain("Connect to local agency-swarm server")
    expect(commandLine(screen, "/connect")).not.toContain("Manage provider auth")
    expect(commandLine(screen, "/connect")).not.toContain("Authenticate providers")
    expect(hasCommand(screen, "/models")).toBe(true)
    expect(hasCommand(screen, "/agents")).toBe(true)
    expect(hasCommand(screen, "/addons")).toBe(false)
    expect(screen).not.toContain("Configure add-ons")
  })

  test("downstream product /auth keeps the Agent Swarm auth dialog available", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("/auth")
    await currentTui.waitForText("/auth", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    const screen = await currentTui.waitForText("Manage Agent Swarm auth", tuiInteractionTimeoutMs)

    expect(screen).toContain("OpenAI")
    expect(screen).not.toContain("Connect a provider")
  })

  test("run-mode /auth emits telemetry by default when PostHog config is embedded", async () => {
    currentServer = await startAgencyProtocolServer()
    const binaryPath = await useSharedTelemetryTui()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      binaryPath,
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "http://127.0.0.1:1",
        AGENTSWARM_TELEMETRY: undefined,
        OPEN_SWARM_TELEMETRY: undefined,
      },
    })
    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await currentTui.waitFor(
      () => currentTelemetryServer!.events.some((event) => event.event === "app_started"),
      "app_started telemetry event",
      tuiInteractionTimeoutMs,
    )
    const appEvent = currentTelemetryServer.events.find((event) => event.event === "app_started")
    expect(appEvent?.properties).toMatchObject({
      $process_person_profile: false,
      app: "Agent Swarm",
      entrypoint: "tui",
      framework_mode: true,
      provider_id: "agency-swarm",
    })
    await driveOpenAIAPIKeyAuth(currentTui, "sk-test-telemetry")
    await currentTui.waitFor(
      () => currentTelemetryServer!.events.some((event) => event.event === "provider_auth_configured"),
      "provider_auth_configured telemetry event",
      tuiInteractionTimeoutMs,
    )
    const commandEvent = currentTelemetryServer.events.find((event) => event.event === "ui_command_executed")
    expect(commandEvent?.properties).toMatchObject({
      $process_person_profile: false,
      app: "Agent Swarm",
      command: "auth",
      source: "slash",
    })
    expect(JSON.stringify(commandEvent)).not.toContain("sk-test-telemetry")
    expect(JSON.stringify(commandEvent)).not.toContain("refresh")
    const requested = currentTelemetryServer.events.find((event) => event.event === "provider_requested")
    expect(requested?.properties).toMatchObject({
      $process_person_profile: false,
      app: "Agent Swarm",
      connected_before: false,
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    const started = currentTelemetryServer.events.find((event) => event.event === "provider_auth_started")
    expect(started?.properties).toMatchObject({
      $process_person_profile: false,
      app: "Agent Swarm",
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    const authEvent = currentTelemetryServer.events.find((event) => event.event === "provider_auth_configured")
    expect(authEvent?.api_key).toBe("ph_test")
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("ph_runtime")
    expect(authEvent?.properties).toMatchObject({
      $process_person_profile: false,
      app: "Agent Swarm",
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("sk-test-telemetry")
  })

  test("run-mode normal prompt emits task telemetry without content or ids", async () => {
    currentServer = await startAgencyProtocolServer()
    const binaryPath = await useSharedTelemetryTui()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      binaryPath,
      config: openAIProviderTestConfig,
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "http://127.0.0.1:1",
        AGENTSWARM_TELEMETRY: undefined,
        OPEN_SWARM_TELEMETRY: undefined,
      },
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("telemetry prompt sentinel\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency request for telemetry prompt",
      tuiInteractionTimeoutMs,
    )
    await currentTui.waitFor(
      () => currentTelemetryServer!.events.some((event) => event.event === "task_succeeded"),
      "task_succeeded telemetry event",
      tuiInteractionTimeoutMs,
    )

    const submittedIndex = currentTelemetryServer.events.findIndex(
      (event) => event.event === "ui_prompt_submitted" && event.properties?.type === "prompt",
    )
    const succeededIndex = currentTelemetryServer.events.findIndex((event) => event.event === "task_succeeded")
    expect(submittedIndex).toBeGreaterThanOrEqual(0)
    expect(succeededIndex).toBeGreaterThan(submittedIndex)

    const submitted = currentTelemetryServer.events[submittedIndex]
    expect(submitted?.properties).toMatchObject({
      framework_mode: true,
      has_agent_parts: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    const succeeded = currentTelemetryServer.events[succeededIndex]
    expect(succeeded?.properties).toMatchObject({
      framework_mode: true,
      has_agent_parts: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
    })
    expect(["lt_2s", "2s_10s", "10s_60s", "gte_60s"]).toContain(succeeded?.properties?.duration_bucket)
    expect(Object.keys(submitted?.properties ?? {})).not.toContain("messageID")
    expect(Object.keys(submitted?.properties ?? {})).not.toContain("sessionID")
    expect(Object.keys(succeeded?.properties ?? {})).not.toContain("messageID")
    expect(Object.keys(succeeded?.properties ?? {})).not.toContain("sessionID")
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("telemetry prompt sentinel")
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("ph_runtime")
  })

  livePostHogTest("run-mode /auth telemetry reaches live PostHog ingestion", async () => {
    const postHogKey = process.env.AGENTSWARM_POSTHOG_API_KEY
    const postHogHost = process.env.AGENTSWARM_POSTHOG_HOST
    if (!postHogKey || !postHogHost) {
      throw new Error("AGENTSWARM_POSTHOG_API_KEY and AGENTSWARM_POSTHOG_HOST are required")
    }
    if (looksFakePostHogKey(postHogKey)) {
      throw new Error("AGENTSWARM_POSTHOG_API_KEY must be a dedicated live PostHog key, not a fake or test key")
    }

    currentServer = await startAgencyProtocolServer()
    currentTelemetryServer = startTelemetryServer({ forwardHost: postHogHost })
    const binaryPath = await buildTelemetryTui({ host: currentTelemetryServer.url, key: postHogKey })
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      binaryPath,
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "http://127.0.0.1:1",
        AGENTSWARM_TELEMETRY: undefined,
        BUN_TEST: "",
        CI: "",
        NODE_ENV: "",
        OPENCODE_PURE: "",
        OPEN_SWARM_TELEMETRY: undefined,
      },
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await driveOpenAIAPIKeyAuth(currentTui, "sk-live-telemetry-test")
    await currentTui.waitFor(
      () =>
        currentTelemetryServer!.events.some(
          (event) => event.event === "provider_auth_configured" && event.forwardStatus !== undefined,
        ),
      "live PostHog provider_auth_configured response",
      tuiInteractionTimeoutMs,
    )

    const authEvent = currentTelemetryServer.events.find((event) => event.event === "provider_auth_configured")
    if (!authEvent || authEvent.forwardStatus === undefined || authEvent.forwardStatus >= 300) {
      throw new Error("Live PostHog ingestion did not accept provider_auth_configured")
    }
    expect(authEvent.api_key).toBe(postHogKey)
    if (JSON.stringify(currentTelemetryServer.events).includes("sk-live-telemetry-test")) {
      throw new Error("Provider API key leaked into telemetry")
    }
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

      await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
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

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("Live QA Agency")

    expect(screen).toContain("Swarm: Live QA Agency")
    expect(screen).toContain("Entry Agent")
    expect(screen).toContain("Review Agent")
    expect(screen).not.toContain("local-agency")
  })

  test("swarm-level agency default footer uses metadata model label without a recipient agent", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      config: {
        provider: {
          "agency-swarm": {
            options: {
              recipientAgent: undefined,
              recipientAgentSelectedAt: undefined,
            },
          },
        },
      },
    })

    const screen = await currentTui.waitForText(agencyClientConfigModel, tuiReadyTimeoutMs)
    expect(screen).toContain(`Live QA Agency · ${agencyClientConfigModel}`)
    expect(screen).not.toContain("Live QA Agency · Swarm Default")
    expect(screen).not.toContain("Live QA Agency · Swarm models")
  })

  test("model picker current agency default row uses actual model label", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("UserSupportAgent · gpt-5.4-mini", tuiReadyTimeoutMs)
    currentTui.write("/models\r")
    const screen = await currentTui.waitForText("gpt-5.4-mini Agency Swarm", tuiInteractionTimeoutMs)

    expect(screen).not.toContain("Swarm Default Agency Swarm")
  })

  test("run-target picker uses Swarm and agent wording against the TUI demo swarm", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("TuiDemoAgency")

    expect(screen).toContain("Select agent")
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

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await selectCurrentSwarm(currentTui)
    const swarmScreen = await currentTui.waitForText("TuiDemoAgency · Swarm models: gpt-5.4-mini +1")
    expect(swarmScreen).not.toContain("TuiDemoAgency · gpt-5.4-mini +1")
    currentTui.write("route through the whole swarm\r")
    const screen = await currentTui.waitForText("Run · gpt-5.4-mini", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "swarm-routed request",
      tuiInteractionTimeoutMs,
    )

    expect(screen).not.toContain("Run · Swarm Default")
    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("route through the whole swarm")
    expect(body).not.toHaveProperty("recipient_agent")
    const configText = await readGlobalAgencyConfigText(currentTui)
    expect(configText).toContain(currentServer.baseURL)
    expect(configText).toContain("tui-demo-agency")
    expect(configText).not.toContain("UserSupportAgent")
  })

  test("selecting a specific agent routes the next prompt to that agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await selectRunTarget(currentTui, "MathAgent", "Selected MathAgent in swarm TuiDemoAgency")
    await currentTui.waitForText("MathAgent · claude-sonnet-4-5", tuiInteractionTimeoutMs)
    currentTui.write("calculate through the selected agent\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agent-routed request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("calculate through the selected agent")
    expect(body).toMatchObject({
      recipient_agent: "MathAgent",
    })
  })

  test("completed build-route model labels stay tied to the submitted recipient", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await selectRunTarget(currentTui, "MathAgent", "Selected MathAgent in swarm TuiDemoAgency")
    await currentTui.waitForText("MathAgent · claude-sonnet-4-5", tuiInteractionTimeoutMs)
    currentTui.write("build label stable turn\r")
    await currentTui.waitForText("Run · claude-sonnet-4-5", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "build-label agency request",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\t")
    await currentTui.waitForText("UserSupportAgent · gpt-5.4-mini", tuiInteractionTimeoutMs)
    const screen = currentTui.screen()

    expect(screen).toContain("Run · claude-sonnet-4-5")
    expect(screen).not.toContain("Run · gpt-5.4-mini")
    expect(currentServer.requests[0]?.body).toMatchObject({
      recipient_agent: "MathAgent",
    })
  })

  test("completed build-route model labels stay tied to the submitted agency", async () => {
    currentServer = await startMultiAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "sales-agency",
      recipientAgent: "SharedAgent",
      configSource: "file",
    })

    await currentTui.waitForText("SharedAgent · gpt-sales-mini", tuiReadyTimeoutMs)
    currentTui.write("multi agency stable label\r")
    await currentTui.waitForText("Run · gpt-sales-mini", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "submitted-agency label request",
      tuiInteractionTimeoutMs,
    )
    await selectNextAgencySwarm(currentTui, "SupportAgency")
    await currentTui.waitForText("SupportAgency · claude-support-sonnet", tuiInteractionTimeoutMs)
    const screen = currentTui.screen()

    expect(screen).toContain("Run · gpt-sales-mini")
    expect(screen).not.toContain("Run · claude-support-sonnet")
    expect(currentServer.requests[0]?.path).toBe("/sales-agency/get_response_stream")
    expect(currentServer.requests[0]?.body).toMatchObject({
      recipient_agent: "SharedAgent",
    })
  })

  test("visible OpenAI model state still routes Run-mode prompts to Agency Swarm", async () => {
    currentServer = await startTuiDemoAgencyServer()
    const runProject = await mkdtemp(path.join(os.tmpdir(), "agentswarm-visible-model-run-project-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-visible-model-state-"))
    tempDirs.push(runProject, stateHome)
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      args: ["--model", alternateOpenAITestModel],
      cols: 150,
      env: {
        AGENTSWARM_RUN_PROJECT: runProject,
        XDG_STATE_HOME: stateHome,
      },
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText(alternateOpenAITestModelLabel, tuiReadyTimeoutMs)
    currentTui.write("fresh sidebar hold despite visible openai model state\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "held agency request with visible openai model state",
      tuiInteractionTimeoutMs,
    )
    const activeRequest = currentServer.requests[0]
    expect(activeRequest?.releaseStream).toBeDefined()
    expect(activeRequest?.streamClosed).toBeDefined()
    const fresh = await currentTui.waitForText("0 tokens", tuiInteractionTimeoutMs)
    expect(fresh).toContain("Context")
    expect(fresh).not.toContain("% used")
    activeRequest!.releaseStream!()
    await activeRequest!.streamClosed
    await currentTui.waitForText("TUI demo response complete.", tuiInteractionTimeoutMs)
    const screen = await currentTui.waitForText("Run · GPT-5.2", tuiInteractionTimeoutMs)
    expect(screen).toContain("Swarm")
    expect(screen).toContain("TuiDemoAgency")
    expect(screen).toContain("1 main / 1 subagent")
    expect(screen).toContain("Active: UserSupportAgent")
    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("fresh sidebar hold despite visible openai model state")
    expect(body).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(screen).not.toContain("Run · gpt-5.4-mini")

    const runSessionState = JSON.parse(
      await readFile(path.join(stateHome, "agentswarm", "agency-swarm-run-sessions.json"), "utf8"),
    ) as Record<string, { mode?: string; directory?: string }>
    expect(Object.values(runSessionState)).toContainEqual({
      mode: "local-project",
      directory: runProject,
    })
  })

  test("/models native model selection keeps Run prompts server-backed", async () => {
    const prompt = "run after slash models native selection"
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
      cols: 150,
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("/models\r")
    await currentTui.waitForText("Select model", tuiInteractionTimeoutMs)
    currentTui.write("gpt-5.2")
    await waitForModelOption(currentTui, "GPT-5.2")
    currentTui.write("\r")
    await currentTui.waitFor(
      () => !currentTui!.screen().includes("Select model"),
      "model selected",
      tuiInteractionTimeoutMs,
    )
    if (currentTui.screen().includes("Select variant")) {
      currentTui.write("\r")
      await currentTui.waitFor(
        () => !currentTui!.screen().includes("Select variant"),
        "variant selected",
        tuiInteractionTimeoutMs,
      )
    }

    await selectProductMode(currentTui, "Build")
    await currentTui.waitForText("Build · GPT-5.2", tuiInteractionTimeoutMs)
    await selectProductMode(currentTui, "Run")
    await currentTui.waitForText("UserSupportAgent · GPT-5.2", tuiInteractionTimeoutMs)

    currentTui.write(`${prompt}\r`)
    await currentTui.waitFor(
      () => currentServer!.requests.some((request) => request.body.message === prompt),
      "Agency request after /models native selection",
      tuiInteractionTimeoutMs,
    )

    const screen = currentTui.screen()
    expect(screen).not.toContain("Build ·")
    expect(currentServer.requests[0]?.body).toMatchObject({
      message: prompt,
      recipient_agent: "UserSupportAgent",
      client_config: {
        model: "gpt-5.2",
      },
    })
  })

  test("model cycle shortcut keeps Run prompts server-backed", async () => {
    const prompt = "run after model cycle native selection"
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-model-cycle-state-"))
    tempDirs.push(stateHome)
    await mkdir(path.join(stateHome, "agentswarm"), { recursive: true })
    await writeFile(
      path.join(stateHome, "agentswarm", "model.json"),
      JSON.stringify({
        recent: [
          {
            providerID: "agency-swarm",
            modelID: "default",
          },
          {
            providerID: "openai",
            modelID: "gpt-5.2",
          },
        ],
        favorite: [],
        variant: {},
      }),
    )

    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
      cols: 150,
      env: {
        XDG_STATE_HOME: stateHome,
      },
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("\x1bOQ")
    await currentTui.waitForText("GPT-5.2 OpenAI", tuiInteractionTimeoutMs)
    currentTui.write(`${prompt}\r`)
    await currentTui.waitFor(
      () => currentServer!.requests.some((request) => request.body.message === prompt),
      "Agency request after model cycle native selection",
      tuiInteractionTimeoutMs,
    )

    const screen = currentTui.screen()
    expect(screen).not.toContain("Build ·")
    expect(currentServer.requests[0]?.body).toMatchObject({
      message: prompt,
      recipient_agent: "UserSupportAgent",
    })
  })

  test("run-mode prompt footer does not show false zero percent for placeholder context", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
      cols: 150,
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("usage footer proof\r")
    await currentTui.waitForText("Usage footer response complete.", tuiInteractionTimeoutMs)
    const screen = await currentTui.waitForText("1.5K · $0.42", tuiInteractionTimeoutMs)

    expect(screen).toContain("1.5K · $0.42")
    expect(screen).toContain("Context")
    expect(screen).toContain("1,500 tokens")
    expect(screen).toContain("$0.42 spent")
    expect(screen).not.toContain("Usage percent unavailable")
    expect(screen).not.toContain("% used")
    expect(screen).not.toContain("1.5K (0%)")
  })

  test("/connect opens the Agency Swarm server dialog with visible OpenAI model state outside Run mode", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      args: ["--model", latestOpenAITestModel],
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText(latestOpenAITestModelLabel, tuiReadyTimeoutMs)
    await selectProductMode(currentTui, "Build")
    await currentTui.waitForText("Build ·", tuiInteractionTimeoutMs)
    currentTui.write("/connect")
    await currentTui.waitFor(
      () => currentTui!.screen().includes("/connect"),
      "/connect slash command",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitFor(
      () => {
        const screen = currentTui!.screen()
        return (
          screen.includes(currentServer!.baseURL) &&
          screen.includes("Add local port") &&
          screen.includes("Authentication") &&
          !screen.includes("Connect a provider")
        )
      },
      "Agency Swarm connect dialog with local server controls",
      tuiInteractionTimeoutMs,
    )
    const screen = currentTui.screen()

    expect(screen).toContain("Local servers")
    expect(screen).toContain(currentServer.baseURL)
    expect(screen).toContain("http://127.0.0.1:8000")
    expect(screen).toContain("http://127.0.0.1:8080")
    expect(screen).toContain("Add local port")
    expect(screen).toContain("Authentication")
    expect(screen).not.toContain("Connect a provider")

    currentTui.write("token")
    const tokenScreen = await currentTui.waitForText("Update token", tuiInteractionTimeoutMs)

    expect(tokenScreen).toContain("Authentication")
    expect(tokenScreen).toContain("Update token")
    expect(tokenScreen).toContain("Clear token")
    expect(tokenScreen).not.toContain("Connect a provider")
  })

  test("/connect opens local server controls when Agency Swarm is not configured", async () => {
    currentTui = await startTui({
      args: ["--model", latestOpenAITestModel],
      env: {
        OPENCODE_CONFIG_CONTENT: JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          enabled_providers: ["openai"],
          model: latestOpenAITestModel,
          provider: {
            openai: {
              options: {
                apiKey: "test-openai-key",
              },
            },
          },
        }),
      },
    })

    await currentTui.waitForText(latestOpenAITestModelLabel, tuiReadyTimeoutMs)
    currentTui.write("/connect")
    await currentTui.waitForText("/connect", tuiInteractionTimeoutMs)
    currentTui.write("\r")
    await currentTui.waitFor(
      () => {
        const screen = currentTui!.screen()
        return (
          screen.includes("http://127.0.0.1:8000") &&
          screen.includes("http://127.0.0.1:8080") &&
          screen.includes("Add local port") &&
          screen.includes("Authentication") &&
          !screen.includes("Connect a provider")
        )
      },
      "Agency Swarm connect dialog without configured server",
      tuiInteractionTimeoutMs,
    )
    const screen = currentTui.screen()

    expect(screen).toContain("http://127.0.0.1:8000")
    expect(screen).toContain("http://127.0.0.1:8080")
    expect(screen).toContain("Add local port")
    expect(screen).toContain("Authentication")
    expect(screen).not.toContain("Connect a provider")
  })

  test("Run-mode auth failures open /auth with visible OpenAI model state", async () => {
    currentServer = await startAuthFailureAgencyServer()
    const binaryPath = await useSharedTelemetryTui()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      binaryPath,
      args: ["--model", latestOpenAITestModel],
      config: openAIProviderTestConfig,
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "http://127.0.0.1:1",
        AGENTSWARM_TELEMETRY: undefined,
        OPEN_SWARM_TELEMETRY: undefined,
      },
    })

    await currentTui.waitForText(latestOpenAITestModelLabel, tuiReadyTimeoutMs)
    currentTui.write("trigger upstream auth failure\r")
    const screen = await currentTui.waitForText("Manage Agent Swarm auth", tuiInteractionTimeoutMs)

    expect(screen).toContain("OpenAI")
    expect(screen).not.toContain("Connect a provider")
    await currentTui.waitFor(
      () => currentTelemetryServer!.events.some((event) => event.event === "task_failed"),
      "task_failed telemetry event",
      tuiInteractionTimeoutMs,
    )
    const failed = currentTelemetryServer.events.find((event) => event.event === "task_failed")
    expect(failed?.properties).toMatchObject({
      error_bucket: "auth_rejected",
      framework_mode: true,
      has_agent_parts: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
    })
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("trigger upstream auth failure")
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("Invalid API key for OpenAI")
    expect(JSON.stringify(currentTelemetryServer.events)).not.toContain("ph_runtime")
  })

  test("/new keeps Run mode usable and starts the next Agency request without old chat history", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      args: ["--model", latestOpenAITestModel],
      config: openAIProviderTestConfig,
    })

    await currentTui.waitForText(latestOpenAITestModelLabel, tuiReadyTimeoutMs)
    currentTui.write("first run mode turn before new\r")
    await currentTui.waitForText("TUI demo response complete.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "first run-mode request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("/new")
    await currentTui.waitFor(
      () => currentTui!.screen().includes("/new"),
      "visible /new slash command",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitFor(
      () => !currentTui!.screen().includes("first run mode turn before new"),
      "new empty prompt after session.new",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("second run mode turn after new\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "second run-mode request after /new",
      tuiInteractionTimeoutMs,
    )

    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("second run mode turn after new")
    expect(JSON.stringify(nextBody?.chat_history ?? [])).not.toContain("first run mode turn before new")
  })

  test("SendMessage delegation does not switch control to the delegated agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("delegate normal sendmessage\r")
    await currentTui.waitForText("Delegated to MathAgent with SendMessage.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "delegate request", tuiInteractionTimeoutMs)

    currentTui.write("plain followup\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-delegation request",
      tuiInteractionTimeoutMs,
    )

    const delegateBody = currentServer.requests[0]?.body
    expect(delegateBody?.message).toContain("delegate normal sendmessage")
    expect(delegateBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("plain followup")
    expect(nextBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeTrue()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("nested SendMessage handoff-like metadata does not switch control", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("nested delegate with forwarded handoff metadata\r")
    await currentTui.waitForText("Nested SendMessage delegation finished.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "nested delegate request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("plain followup after nested delegation\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-nested-delegation request",
      tuiInteractionTimeoutMs,
    )

    const delegateBody = currentServer.requests[0]?.body
    expect(delegateBody?.message).toContain("nested delegate with forwarded handoff metadata")
    expect(delegateBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("plain followup after nested delegation")
    expect(nextBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeTrue()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("transfer_to handoff switches control to the target agent for the next turn", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("please handoff this calculation\r")
    await currentTui.waitForText("Math agent now has control.", tuiInteractionTimeoutMs)
    await currentTui.waitForText("Run · claude-sonnet-4-5", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "handoff request", tuiInteractionTimeoutMs)

    currentTui.write("continue after handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("please handoff this calculation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
    expect(
      nextBody?.chat_history.some(
        (item: any) => item?.type === "message" && item?.role === "assistant" && !item?.content,
      ),
    ).toBeFalse()
  })

  test("default single-swarm transfer_to handoff shows target agent as active in sidebar", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      cols: 150,
      config: {
        provider: {
          "agency-swarm": {
            options: {
              agency: undefined,
              recipientAgent: undefined,
              recipientAgentSelectedAt: undefined,
            },
          },
        },
      },
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("please handoff this calculation\r")
    await currentTui.waitForText("Math agent now has control.", tuiInteractionTimeoutMs)
    const screen = await currentTui.waitForText("Active: MathAgent", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "default swarm handoff request")

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("please handoff this calculation")
    expect(body).not.toHaveProperty("recipient_agent")
    expect(screen).toContain("TuiDemoAgency")
  })

  test("top-level handoff wins over later nested handoff-like metadata", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("mixed handoff with nested delegation\r")
    await currentTui.waitForText("Math handoff finished after nested delegation.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "mixed handoff request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("continue after mixed handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-mixed-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("mixed handoff with nested delegation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after mixed handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("agent_updated_stream_event-only handoff switches control to the target agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("please live handoff this calculation\r")
    await currentTui.waitForText("Live agent update moved control to MathAgent.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "live handoff request",
      tuiInteractionTimeoutMs,
    )
    await currentTui.waitFor(
      () => currentTui!.screen().includes("MathAgent · claude-sonnet-4-5"),
      "live handoff routed prompt",
      tuiInteractionTimeoutMs,
    )
    // CI can briefly focus transient picker/search UI after live handoff routing.
    currentTui.write("\x1b")
    await Bun.sleep(100)

    currentTui.write("continue after live handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-live-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("please live handoff this calculation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after live handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeFalse()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("prompt submit reaches the agency protocol server with the configured agent", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("hello from terminal e2e\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency protocol server stream request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("hello from terminal e2e")
    expect(body).toMatchObject({
      recipient_agent: "entry-agent",
    })
  })

  test("bracketed-paste image paths reach Agency servers as structured message content", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })
    const imageDir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-image-drop-"))
    tempDirs.push(imageDir)
    const imagePath = path.join(imageDir, "red-dot.png")
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    await writeFile(imagePath, Buffer.from(pngBase64, "base64"))

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    const pastedPath = path.relative(packageRoot, imagePath)
    currentTui.write(`\x1b[200~${pastedPath}\x1b[201~`)
    await currentTui.waitForText("[Image 1]", tuiInteractionTimeoutMs)
    currentTui.write("please inspect this image\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "image attachment request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    const message = body?.message as Array<{ content?: Array<Record<string, unknown>> }> | undefined
    expect(message?.[0]?.content).toContainEqual({
      type: "input_image",
      image_url: `data:image/png;base64,${pngBase64}`,
      detail: "auto",
    })
    expect(message?.[0]?.content).toContainEqual({
      type: "input_text",
      text: "[Image 1] please inspect this image",
    })
    expect(body?.file_urls).toBeUndefined()
  })

  test("Esc twice cancels queued Run-mode prompt before active stream drains", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    currentTui.write("first issue 172 hold\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "first issue 172 agency request",
      tuiInteractionTimeoutMs,
    )
    const activeRequest = currentServer.requests[0]
    expect(activeRequest?.releaseStream).toBeDefined()
    expect(activeRequest?.streamClosed).toBeDefined()

    currentTui.write("second issue 172 prompt SHOULD_NOT_SEND\r")
    await currentTui.waitForText("QUEUED", tuiInteractionTimeoutMs)
    currentTui.write("\x1b")
    await Bun.sleep(100)
    currentTui.write("\x1b")
    await currentTui.waitForText("Cancelled 1 queued message", tuiInteractionTimeoutMs)
    activeRequest!.releaseStream!()
    await activeRequest!.streamClosed
    await currentTui.waitForText("completed first issue 172 prompt", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => !currentTui!.screen().includes("interrupt"),
      "TUI idle after active issue 172 stream",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests.map((request) => request.body.message)).toEqual(["first issue 172 hold"])
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

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
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
  await tui.waitForText("Select agent")
  tui.write(query)
  await tui.waitForText(query)
  tui.write("\x1b[B")
  tui.write("\r")
  await tui.waitForText(successMessage, tuiInteractionTimeoutMs)
}

async function runPaletteCommand(tui: TuiProcess, query: string) {
  tui.write("\x10")
  await tui.waitForText("Commands", tuiInteractionTimeoutMs)
  tui.write(query)
  await tui.waitForText(query, tuiInteractionTimeoutMs)
  tui.write("\r")
  await tui.waitFor(() => !tui.screen().includes("Commands"), `${query} command selected`, tuiInteractionTimeoutMs)
}

async function writeBrokenLaunchVenvPython(dir: string, failure: "import" | "syntax" = "import") {
  const python = path.join(dir, ".venv", process.platform === "win32" ? "Scripts" : "bin", "python")
  const fixed = path.join(dir, ".fixed")
  const server = path.join(dir, "fake-agency-server.js")
  await mkdir(path.dirname(python), { recursive: true })
  const entry = path.join(dir, "agency.py")
  await writeFile(
    server,
    [
      "const port = Number(process.argv[2] ?? process.argv[1])",
      "const response = (await Bun.file('.run-version').text().catch(() => 'startup fallback local run response')).trim()",
      "await Bun.write('.run-server-url', `http://127.0.0.1:${port}\\n`)",
      "const closed = `.run-server-closed-${port}`",
      "const cleanup = () => Bun.write(closed, 'closed\\n').finally(() => process.exit(0))",
      "process.on('SIGTERM', cleanup)",
      "process.on('SIGINT', cleanup)",
      "Bun.serve({",
      "  hostname: '127.0.0.1',",
      "  port,",
      "  async fetch(request) {",
      "    const url = new URL(request.url)",
      "    if (url.pathname === '/openapi.json') {",
      "      return Response.json({ openapi: '3.1.0', paths: { '/local-agency/get_metadata': { get: {} }, '/local-agency/get_response_stream': { post: {} }, '/local-agency/cancel_response_stream': { post: {} } } })",
      "    }",
      "    if (url.pathname === '/local-agency/get_metadata') {",
      "      return Response.json({ agency_swarm_version: '1.9.6', metadata: { agencyName: 'Startup Fallback Agency', agents: ['entry-agent'], entryPoints: ['entry-agent'] }, nodes: [{ id: 'entry-agent', type: 'agent', data: { label: 'Entry Agent', description: 'Primary route', isEntryPoint: true, model: 'gpt-4o-mini' } }] })",
      "    }",
      "    if (url.pathname === '/local-agency/get_response_stream') {",
      "      const body = await request.json().catch(() => ({}))",
      "      const text = typeof body.message === 'string' ? body.message : ''",
      "      const recipient = typeof body.recipient_agent === 'string' ? body.recipient_agent : 'none'",
      '      return new Response(`event: meta\\ndata: {\\"run_id\\":\\"run_startup_fallback\\"}\\n\\nevent: messages\\ndata: {\\"new_messages\\":[{\\"id\\":\\"msg_startup_fallback\\",\\"type\\":\\"message\\",\\"role\\":\\"assistant\\",\\"agent\\":\\"entry-agent\\",\\"content\\":[{\\"type\\":\\"output_text\\",\\"text\\":\\"${response}: ${text}: recipient=${recipient}\\"}]}]}\\n\\nevent: end\\ndata: {}\\n\\n`, { headers: { \'Content-Type\': \'text/event-stream\', \'Cache-Control\': \'no-cache\' } })',
      "    }",
      "    if (url.pathname === '/local-agency/cancel_response_stream') return Response.json({ cancelled: true })",
      "    return new Response('not found', { status: 404 })",
      "  },",
      "})",
      "await new Promise(() => {})",
      "",
    ].join("\n"),
  )
  await writeFile(
    python,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if [[ "${1:-}" == "-c" ]]; then',
      '  if [[ "${2:-}" == *"print(sys.executable)"* ]]; then',
      '    printf "%s\\n3.12.7\\n" "$0"',
      "    exit 0",
      "  fi",
      "  exit 0",
      "fi",
      'if [[ "${1:-}" == *"launch_agency.py" ]]; then',
      `  if [[ -f "${fixed}" ]]; then`,
      `    exec bun "${server}" "\${2:-0}"`,
      "  fi",
      "  cat >&2 <<'TRACE'",
      "Traceback (most recent call last):",
      '  File "/tmp/agentswarm-npx-test/launch_agency.py", line 1, in <module>',
      "    from agency import create_agency",
      ...(failure === "syntax"
        ? [
            `  File "${entry}", line 1`,
            "    def create_agency(:",
            "                      ^",
            "SyntaxError: invalid syntax",
          ]
        : [
            `  File "${entry}", line 1, in <module>`,
            "    from dotenv_missing import load_dotenv",
            "ModuleNotFoundError: No module named 'dotenv_missing'",
          ]),
      "TRACE",
      "  exit 1",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
  )
  await chmod(python, 0o755)
}

async function markBrokenLaunchFixed(dir: string) {
  await writeFile(path.join(dir, ".fixed"), "fixed\n")
}

async function writeRunVersion(dir: string, version: string) {
  await writeFile(path.join(dir, ".run-version"), `${version}\n`)
}

async function writeLocalRunRefreshManifest(dir: string, delayMs = 0) {
  const uv = path.join(dir, ".venv", process.platform === "win32" ? "Scripts" : "bin", "uv")
  const log = path.join(dir, ".uv-run-refresh-log")
  await writeFile(path.join(dir, "requirements.txt"), "agency-swarm==1.9.6\n")
  await writeFile(
    uv,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s\\n' "$*" >> ${JSON.stringify(log)}`,
      ...(delayMs > 0 ? [`sleep ${delayMs / 1000}`] : []),
      'if [[ "${1:-}" == "--version" ]]; then',
      "  echo 'uv 0.8.0'",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
  )
  await chmod(uv, 0o755)
}

async function writeFailingLocalRunRefreshManifest(dir: string) {
  const uv = path.join(dir, ".venv", process.platform === "win32" ? "Scripts" : "bin", "uv")
  const log = path.join(dir, ".uv-run-refresh-log")
  await writeFile(path.join(dir, "requirements.txt"), "agency-swarm==1.9.6\n")
  await writeFile(
    uv,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `printf '%s\\n' "$*" >> ${JSON.stringify(log)}`,
      'if [[ "${1:-}" == "--version" ]]; then',
      "  echo 'uv 0.8.0'",
      "  exit 0",
      "fi",
      "echo 'dependency refresh exploded' >&2",
      "exit 1",
      "",
    ].join("\n"),
  )
  await chmod(uv, 0o755)
}

async function selectCurrentSwarm(tui: TuiProcess) {
  tui.write("/agents\r")
  await tui.waitForText("TuiDemoAgency")
  tui.write("\x1b[A\x1b[A\r")
  await tui.waitForText("Selected swarm TuiDemoAgency", tuiInteractionTimeoutMs)
}

async function selectNextAgencySwarm(tui: TuiProcess, agency: string) {
  tui.write("/agents\r")
  await tui.waitForText(agency)
  tui.write("\x1b[B\r")
  await tui.waitForText(`Selected swarm ${agency}`, tuiInteractionTimeoutMs)
}

async function startAuthFailureAgencyServer(): Promise<AgencyProtocolServer> {
  const requests: AgencyProtocolServer["requests"] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)

      if (url.pathname === "/openapi.json") {
        return Response.json({
          openapi: "3.1.0",
          paths: {
            "/local-agency/get_metadata": { get: {} },
            "/local-agency/get_response_stream": { post: {} },
            "/local-agency/cancel_response_stream": { post: {} },
          },
        })
      }

      if (url.pathname === "/local-agency/get_metadata") {
        return Response.json({
          agency_swarm_version: "1.9.6",
          metadata: {
            agencyName: "Auth Failure Agency",
            agents: ["entry-agent"],
            entryPoints: ["entry-agent"],
          },
          nodes: [
            {
              id: "entry-agent",
              type: "agent",
              data: {
                label: "Entry Agent",
                isEntryPoint: true,
                model: agencyClientConfigModel,
              },
            },
          ],
        })
      }

      if (url.pathname === "/local-agency/get_response_stream") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        requests.push({ path: url.pathname, body })
        return new Response("Invalid API key for OpenAI", { status: 403 })
      }

      if (url.pathname === "/local-agency/cancel_response_stream") {
        return Response.json({ cancelled: true })
      }

      return new Response("not found", { status: 404 })
    },
  })

  return {
    baseURL: `http://${server.hostname}:${server.port}`,
    requests,
    stop() {
      server.stop(true)
    },
  }
}

async function driveOpenAIAPIKeyAuth(tui: TuiProcess, apiKey: string) {
  // Wait before Enter so the TUI submits the rendered slash command, not stale input.
  tui.write("/auth")
  await tui.waitForText("/auth", tuiInteractionTimeoutMs)
  tui.write("\r")
  await tui.waitForText("Manage Agent Swarm auth", tuiInteractionTimeoutMs)
  await tui.waitForText("OpenAI", tuiInteractionTimeoutMs)
  tui.write("\r")
  const hasAPIKeyPrompt = () => tui.screen().includes("API key") && tui.screen().includes("enter submit")
  await tui.waitFor(
    () => tui.screen().includes("Select OpenAI auth method") || hasAPIKeyPrompt(),
    "OpenAI auth method or API key prompt",
    tuiInteractionTimeoutMs,
  )
  if (!hasAPIKeyPrompt()) {
    await tui.waitForText("Manually enter API Key", tuiInteractionTimeoutMs)
    tui.write("\x1b[B\x1b[B\r")
  }
  await tui.waitFor(hasAPIKeyPrompt, "API key prompt", tuiInteractionTimeoutMs)
  await Bun.sleep(100)
  tui.write(`${apiKey}\r`)
}

function looksFakePostHogKey(value: string) {
  const lower = value.toLowerCase()
  return (
    lower === "test" ||
    lower.startsWith("test_") ||
    fakePostHogKeyFragments.some((fragment) => lower.includes(fragment))
  )
}

function startTelemetryServer(input: { forwardHost?: string } = {}) {
  const events: Array<{
    api_key?: unknown
    event?: unknown
    forwardStatus?: number
    properties?: Record<string, unknown>
  }> = []
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      if (new URL(request.url).pathname === "/i/v0/e/") {
        const body = (await request.json()) as (typeof events)[number]
        if (input.forwardHost) {
          const response = await fetch(`${input.forwardHost.replace(/\/+$/, "")}/i/v0/e/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          })
          body.forwardStatus = response.status
        }
        events.push(body)
        return Response.json({ status: 1 })
      }
      return new Response("not found", { status: 404 })
    },
  })
  return {
    events,
    url: `http://127.0.0.1:${server.port}`,
    reset: () => {
      events.length = 0
    },
    stop: () => server.stop(true),
  }
}
