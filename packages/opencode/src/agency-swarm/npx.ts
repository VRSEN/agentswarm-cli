import * as prompts from "@clack/prompts"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { createWriteStream, existsSync, statSync } from "node:fs"
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises"
import { AgencySwarmAdapter } from "./adapter"
import { AgencySwarmRunSession } from "./run-session"
import { SERVER_LAUNCHER_SCRIPT } from "./server-launcher"
import { Storage } from "@/storage/storage"
import { Filesystem } from "@/util/filesystem"
import type { Session } from "@/session"
import { SessionID } from "@/session/schema"

export const LAUNCHER_ENTRY_ENV = "AGENTSWARM_LAUNCHER"
export const STARTER_TEMPLATE_REPO = "agency-ai-solutions/agency-starter-template"
export const STARTER_TEMPLATE_URL = `https://github.com/${STARTER_TEMPLATE_REPO}.git`
export const LOCAL_AGENCY_ID = "local-agency"

type LaunchChoice = "project" | "starter" | "connect"
type StarterMode = "github" | "local"

export interface PreparedNpxLaunch {
  directory: string
  configContent?: string
  runProjectDirectory?: string
  cleanup?: () => Promise<void>
}

export interface AgencyProject {
  directory: string
  agencyFile: string
}

interface CommandResult {
  code: number
  stdout: string
  stderr: string
  timedOut?: boolean
  logFile?: string
}

interface PythonInfo {
  cmd: string[]
  executable: string
  version: string
}

interface VenvCanaryResult {
  healthy: boolean
  stderr: string
  timedOut: boolean
}

interface DependencyInstallResult extends CommandResult {
  hadManifests: boolean
}

interface UvInfo {
  cmd: string[]
}

interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  logFile?: string
  streamOutputToStderr?: boolean
  suppressPythonTracebackStderr?: boolean
  timeoutMs?: number
}

interface OutputWriter {
  write: (chunk: string) => void
  close?: () => void
}

interface ServerStderrCollector {
  read(timeoutMs: number): Promise<string>
  stop(): void
}

const VENV_CANARY_SCRIPT = ["import agency_swarm", "from agency_swarm.integrations.fastapi import run_fastapi"].join(
  "\n",
)
const VENV_CANARY_TIMEOUT_MS = 60 * 1000
const SERVER_START_TIMEOUT_MS = 90 * 1000
const SERVER_STDERR_COLLECT_TIMEOUT_MS = 1000
const REBUILD_INSTALL_TIMEOUT_MS = 10 * 60 * 1000
const PROCESS_KILL_GRACE_MS = 5000
const FALLBACK_AGENCY_SWARM_REQUIREMENT = "agency-swarm[fastapi,litellm]>=1.9.6"

export function shouldRunNpxOnboarding(input: {
  env: NodeJS.ProcessEnv
  argv?: string[]
  model?: string
  continue?: boolean
  session?: string
  prompt?: string
  agent?: string
}) {
  if (!isLauncher(input)) return false
  if (input.model) return false
  if (input.continue) return false
  if (input.session) return false
  if (input.prompt) return false
  if (input.agent) return false
  return true
}

export async function resolveNpxAutoProject(input: {
  directory: string
  env: NodeJS.ProcessEnv
  argv?: string[]
  model?: string
  continue?: boolean
  fork?: boolean
  session?: string
  prompt?: string
  agent?: string
  sessions?: Iterable<Pick<Session.Info, "id" | "directory" | "parentID" | "time">>
  runSessions?: Iterable<{ sessionID: string; directory: string }>
}) {
  if (!isLauncher(input)) return
  if (input.model && input.model.split("/")[0] !== AgencySwarmAdapter.PROVIDER_ID) return

  if (input.session) {
    const session = await getResumeSession(input.session, input.sessions)
    return session ? resolveRunProject(session, input.runSessions) : undefined
  }

  if (input.continue) {
    const sessions = input.sessions ? Array.from(input.sessions) : await listResumeSessions(input.directory)
    const session = sessions
      .filter((item) => item.directory === input.directory && !item.parentID)
      .toSorted((a, b) => b.time.updated - a.time.updated)[0]
    if (session) return resolveRunProject(session, input.runSessions)
    if (input.fork) return
    return detectAgencyProject(input.directory)
  }

  if (input.prompt || input.agent || input.model) {
    return detectAgencyProject(input.directory)
  }
}

async function getResumeSession(
  sessionID: string,
  sessions?: Iterable<Pick<Session.Info, "id" | "directory" | "parentID" | "time">>,
) {
  if (sessions) {
    return Array.from(sessions).find((item) => item.id === sessionID)
  }
  const { Session } = await import("@/session")
  return Session.get(SessionID.make(sessionID)).catch(() => undefined)
}

async function listResumeSessions(directory: string) {
  const { Session } = await import("@/session")
  const start = Date.now() - 30 * 24 * 60 * 60 * 1000
  return Array.from(Session.listGlobal({ directory, roots: true, start, limit: 1 }))
}

const BUNFS_PREFIXES = ["/$bunfs/", "B:/~BUN/", "B:\\~BUN\\"] as const
const LAUNCHER_SUBCOMMANDS = new Set([
  "completion",
  "acp",
  "mcp",
  "attach",
  "run",
  "generate",
  "debug",
  "console",
  "providers",
  "agent",
  "upgrade",
  "uninstall",
  "serve",
  "web",
  "models",
  "stats",
  "export",
  "import",
  "github",
  "pr",
  "session",
  "agency",
  "plugin",
  "db",
])
const PROJECT_PATH_PREFIXES = ["./", ".\\", "../", "..\\", "~/", "~\\", "/", "\\\\"] as const

function isBunfsPath(value: string | undefined): value is string {
  return typeof value === "string" && BUNFS_PREFIXES.some((prefix) => value.startsWith(prefix))
}

function isExistingDirectory(value: string) {
  const resolved = path.resolve(value)
  if (!existsSync(resolved)) return false
  try {
    return statSync(resolved).isDirectory()
  } catch {
    return false
  }
}

function looksLikeProjectPath(value: string) {
  if (PROJECT_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) return true
  if (/^[A-Za-z]:/.test(value)) return true
  return isExistingDirectory(value)
}

function looksLikeSubcommand(arg: string) {
  // Subcommands are bare words. Paths (with separators or dots) and flags are positional/optional.
  if (arg.startsWith("-")) return false
  if (arg.includes("/") || arg.includes("\\")) return false
  if (arg.includes(".")) return false
  return true
}

function isLauncher(input: { env: NodeJS.ProcessEnv; argv?: string[] }) {
  // The platform binary's argv[0] does not always round-trip as "agentswarm" (Bun single-file
  // executables rewrite argv to ["bun","/$bunfs/root/src/index.js", ...userArgs] on posix and
  // ["bun","B:/~BUN/root/src/index.js", ...userArgs] on Windows), so basename detection alone
  // is unreliable. The env var is the canonical opt-out. When neither signal is set, inspect
  // the user-facing args and default to launcher mode for the default TUI entry, including the
  // documented `$0 [project]` positional form.
  if (input.env[LAUNCHER_ENTRY_ENV] === "0") return false
  if (input.env[LAUNCHER_ENTRY_ENV] === "1") return true
  const argv = input.argv ?? process.argv
  if (isAgentswarmCommand(argv)) return true
  const userArgs = argv[0] === "bun" && isBunfsPath(argv[1]) ? argv.slice(2) : argv.slice(1)
  const firstUserArg = userArgs[0]
  if (!firstUserArg) return true
  if (firstUserArg.startsWith("-")) return true
  if (!LAUNCHER_SUBCOMMANDS.has(firstUserArg) && looksLikeProjectPath(firstUserArg)) return true
  // The default command accepts an optional positional `project` path. Treat any arg that does
  // not look like a subcommand as the project positional, which keeps launcher mode on.
  if (!looksLikeSubcommand(firstUserArg)) return true
  return false
}

async function resolveRunProject(
  session: Pick<Session.Info, "id" | "directory">,
  runSessions?: Iterable<{ sessionID: string; directory: string }>,
) {
  const run = runSessions
    ? Array.from(runSessions).find((item) => item.sessionID === session.id)
    : await AgencySwarmRunSession.get(session.id)
  if (run) {
    if (path.resolve(run.directory) !== path.resolve(session.directory)) return
    return detectAgencyProject(run.directory)
  }

  const project = await detectAgencyProject(session.directory)
  if (!project) return
  if (!(await isLegacyAgencySwarmRunSession(session.id))) return
  if (!(await hasLegacyLocalAgencyHistory(session.id))) return
  return project
}

async function isLegacyAgencySwarmRunSession(sessionID: Session.Info["id"]) {
  const providerID = await getLatestSessionProviderID(sessionID)
  if (providerID && providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return true
}

async function getLatestSessionProviderID(sessionID: Session.Info["id"]) {
  const { Session } = await import("@/session")
  const [latest] = await Session.messages({ sessionID, limit: 1 }).catch(() => [])
  if (!latest) return
  return latest.info.role === "user" ? latest.info.model.providerID : latest.info.providerID
}

function isAgentswarmCommand(argv: string[]) {
  return argv.slice(0, 2).some(
    (item) =>
      item
        .split(/[\\/]/)
        .at(-1)
        ?.replace(/\.exe$/i, "") === "agentswarm",
  )
}

async function hasLegacyLocalAgencyHistory(sessionID: string) {
  const keys = await Storage.list(["agency_swarm_history"]).catch(() => [] as string[][])
  let newest:
    | {
        agency: string
        baseURL: string
        updatedAt: number
      }
    | undefined
  for (const key of keys) {
    const entry = await Storage.read<{ scope?: unknown; updated_at?: unknown }>(key).catch(() => undefined)
    const parsed = parseLegacyHistoryScope(entry?.scope)
    if (!parsed || parsed.sessionID !== sessionID) continue
    const updatedAt = typeof entry?.updated_at === "number" ? entry.updated_at : 0
    if (!newest || updatedAt > newest.updatedAt) {
      newest = {
        agency: parsed.agency,
        baseURL: parsed.baseURL,
        updatedAt,
      }
    }
  }
  return !!newest && newest.agency === LOCAL_AGENCY_ID && isLoopbackBaseURL(newest.baseURL)
}

function parseLegacyHistoryScope(scope: unknown) {
  if (typeof scope !== "string") return
  const parts = scope.split("|")
  const sessionID = parts.at(-1)
  const agency = parts.at(-2)
  if (!sessionID || !agency || parts.length < 3) return
  return {
    baseURL: parts.slice(0, -2).join("|"),
    agency,
    sessionID,
  }
}

function isLoopbackBaseURL(baseURL: string) {
  try {
    const parsed = new URL(baseURL)
    return (
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "::1"
    )
  } catch {
    return false
  }
}

export function buildAgencyConfig(input: { baseURL: string; agency: string; token?: string }) {
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
    provider: {
      [AgencySwarmAdapter.PROVIDER_ID]: {
        name: "Agency Swarm",
        options: {
          baseURL: input.baseURL,
          agency: input.agency,
          discoveryTimeoutMs: 2000,
          ...(input.token ? { token: input.token } : {}),
        },
      },
    },
  })
}

export function buildPythonEnv(directory: string, env: NodeJS.ProcessEnv = process.env) {
  const pythonPath = env.PYTHONPATH ? [directory, env.PYTHONPATH].join(path.delimiter) : directory
  return {
    ...env,
    PYTHONPATH: pythonPath,
  }
}

export async function detectAgencyProject(directory: string) {
  const dir = path.resolve(directory)
  const agencyFile = path.join(dir, "agency.py")
  if (!(await Filesystem.exists(agencyFile))) return
  const source = await Filesystem.readText(agencyFile).catch(() => "")
  if (!source.includes("def create_agency")) return
  if (!source.includes("agency_swarm")) return
  return {
    directory: dir,
    agencyFile,
  } satisfies AgencyProject
}

export function formatProjectLabel(project: AgencyProject) {
  return `Use detected Agency Swarm project (${project.directory})`
}

export function validateStarterName(base: string, value?: string) {
  const name = value?.trim()
  if (!name) return "A name is required"
  if (/[\\/:*?\"<>|]/.test(name)) return "Use a simple folder or repository name"
  if (existsSync(path.join(base, name))) return "A folder with this name already exists"
}

export async function prepareNpxLaunch(directory: string): Promise<PreparedNpxLaunch | undefined> {
  prompts.intro("Agent Swarm")

  const project = await detectAgencyProject(directory)
  const choice = await chooseLaunchChoice(project)
  if (!choice) {
    prompts.outro("Cancelled")
    return
  }

  if (choice === "connect") {
    const launch = await prepareRemoteLaunch(directory)
    if (!launch) {
      prompts.outro("Cancelled")
      return
    }
    prompts.outro("Opening Agent Swarm")
    return launch
  }

  const targetProject =
    choice === "project"
      ? project
      : await createStarterProject({
          baseDirectory: directory,
        })
  if (!targetProject) {
    prompts.outro("Cancelled")
    return
  }

  const launch = await prepareProjectLaunch(targetProject)
  if (!launch) {
    prompts.outro("Cancelled")
    return
  }
  prompts.outro(`Opening Agent Swarm in ${targetProject.directory}`)
  return launch
}

async function chooseLaunchChoice(project: AgencyProject | undefined) {
  prompts.log.info("1. Choose how to start the terminal UI.")
  prompts.log.info(
    "   The launcher can use a detected project, create a starter project, or connect to an existing server.",
  )

  const result = await prompts.select<LaunchChoice>({
    message: "How do you want to start?",
    options: [
      ...(project
        ? [
            {
              value: "project" as const,
              label: formatProjectLabel(project),
            },
          ]
        : []),
      {
        value: "starter" as const,
        label: "Create a new starter project",
        hint: "recommended for a fresh setup",
      },
      {
        value: "connect" as const,
        label: "Connect to an existing agency",
        hint: "local or remote Agency Swarm server",
      },
    ],
  })
  if (prompts.isCancel(result)) return
  return result
}

async function prepareRemoteLaunch(directory: string): Promise<PreparedNpxLaunch | undefined> {
  prompts.log.info("2. Configure the Agency Swarm server.")
  prompts.log.info("   This path is for an agency that is already running somewhere else.")

  const url = await prompts.text({
    message: "Agency Swarm base URL",
    placeholder: AgencySwarmAdapter.DEFAULT_BASE_URL,
    defaultValue: AgencySwarmAdapter.DEFAULT_BASE_URL,
    validate(value) {
      if (!value?.trim()) return "Base URL is required"
      try {
        AgencySwarmAdapter.normalizeBaseURL(value)
        return
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid URL"
      }
    },
  })
  if (prompts.isCancel(url)) return

  const tokenConfirm = await prompts.confirm({
    message: "Does this server need a bearer token?",
    initialValue: false,
  })
  if (prompts.isCancel(tokenConfirm)) return

  let token: string | undefined
  if (tokenConfirm) {
    const entered = await prompts.password({
      message: "Bearer token",
      mask: "•",
    })
    if (prompts.isCancel(entered)) return
    token = entered.trim() || undefined
  }

  const baseURL = AgencySwarmAdapter.normalizeBaseURL(url)
  let selectedAgency: string | undefined

  try {
    const discovered = await AgencySwarmAdapter.discover({
      baseURL,
      token,
      timeoutMs: AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS,
    })
    if (discovered.agencies.length === 1) {
      selectedAgency = discovered.agencies[0].id
    } else if (discovered.agencies.length > 1) {
      const picked = await prompts.select<string>({
        message: "Choose the agency to open",
        options: discovered.agencies.map((agency) => ({
          value: agency.id,
          label: agency.id,
          hint: agency.description || undefined,
        })),
      })
      if (prompts.isCancel(picked)) return
      selectedAgency = picked
    }
  } catch {
    prompts.log.warn("Automatic discovery failed. Enter the agency id manually.")
  }

  if (!selectedAgency) {
    const manual = await prompts.text({
      message: "Agency id",
      placeholder: "my-agency",
      validate(value) {
        if (!value?.trim()) return "Agency id is required"
      },
    })
    if (prompts.isCancel(manual)) return
    selectedAgency = manual.trim()
  }

  return {
    directory,
    configContent: buildAgencyConfig({
      baseURL,
      agency: selectedAgency,
      token,
    }),
  }
}

async function createStarterProject(input: { baseDirectory: string }): Promise<AgencyProject | undefined> {
  prompts.log.info("2. Create the starter project.")
  prompts.log.info("   This gives the terminal UI a ready-to-run Agency Swarm project to launch.")

  const repoName = await prompts.text({
    message: "Project or repository name",
    placeholder: "my-agency",
    validate(value) {
      return validateStarterName(input.baseDirectory, value)
    },
  })
  if (prompts.isCancel(repoName)) return

  const ghReady = await hasGitHubTemplateFlow()
  let mode: StarterMode = "local"
  if (ghReady) {
    const selected = await prompts.select<StarterMode>({
      message: "How should the starter be created?",
      options: [
        {
          value: "github",
          label: "Create a GitHub repository from the template",
          hint: "recommended",
        },
        {
          value: "local",
          label: "Create a local folder from the template",
          hint: "skip GitHub for now",
        },
      ],
    })
    if (prompts.isCancel(selected)) return
    mode = selected
  }

  const name = repoName.trim()
  const targetDirectory = path.join(input.baseDirectory, name)
  if (await Filesystem.exists(targetDirectory)) {
    throw new Error(`Target directory already exists: ${targetDirectory}`)
  }

  const spinner = prompts.spinner()
  spinner.start(mode === "github" ? "Creating repository from the starter template" : "Cloning the starter template")
  try {
    if (mode === "github") {
      const visibility = await prompts.select<"private" | "public">({
        message: "Repository visibility",
        options: [
          {
            value: "private",
            label: "Private",
            hint: "recommended default",
          },
          {
            value: "public",
            label: "Public",
          },
        ],
      })
      if (prompts.isCancel(visibility)) {
        spinner.stop("Cancelled")
        return
      }

      const result = await runCommand(
        ["gh", "repo", "create", name, "--template", STARTER_TEMPLATE_REPO, "--clone", `--${visibility}`],
        {
          cwd: input.baseDirectory,
        },
      )
      if (result.code !== 0) {
        throw new Error(result.stderr.trim() || result.stdout.trim() || "GitHub template creation failed")
      }
    } else {
      const clone = await runCommand(["git", "clone", "--depth=1", STARTER_TEMPLATE_URL, targetDirectory])
      if (clone.code !== 0) {
        throw new Error(clone.stderr.trim() || clone.stdout.trim() || "Starter template clone failed")
      }
      await rm(path.join(targetDirectory, ".git"), {
        recursive: true,
        force: true,
      }).catch(() => undefined)
      await runCommand(["git", "init", "-b", "main"], { cwd: targetDirectory })
    }
    spinner.stop("Starter project ready")
  } catch (error) {
    spinner.stop("Starter project setup failed")
    throw error
  }

  return {
    directory: targetDirectory,
    agencyFile: path.join(targetDirectory, "agency.py"),
  }
}

export async function prepareProjectLaunch(project: AgencyProject): Promise<PreparedNpxLaunch | undefined> {
  prompts.log.info("3. Start the Agency Swarm project.")
  prompts.log.info(
    "   The launcher will reuse a project `.venv`, start a local FastAPI server, and connect the terminal UI to it.",
  )

  const python = await ensureProjectPython(project.directory)
  if (!python) return

  const server = await startProjectServer(project.directory, python)
  return {
    directory: project.directory,
    runProjectDirectory: project.directory,
    configContent: buildAgencyConfig({
      baseURL: server.baseURL,
      agency: LOCAL_AGENCY_ID,
    }),
    cleanup: server.cleanup,
  }
}

async function ensureProjectPython(directory: string) {
  const venvPython = getVenvPythonPath(directory)
  const venvDir = path.resolve(path.join(directory, ".venv"))
  let selfHealing = false
  let corruptedVenv = false
  const hasVenvPath = await Filesystem.exists(venvDir)
  const hasVenv = await Filesystem.exists(venvPython)
  if (hasVenv) {
    // Probing the venv's interpreter can throw if the base Python was removed
    // or the venv was moved between machines. Treat any failure as corruption so
    // the self-heal path rebuilds instead of the launcher aborting.
    let info: PythonInfo | undefined
    try {
      info = await inspectPython([venvPython])
    } catch (error) {
      prompts.log.warn(`Project Python could not be probed: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (!info) {
      corruptedVenv = true
    } else {
      prompts.log.info(`Using project Python: ${formatPython(info, [venvPython])}`)
      const refreshLogFile = await tryCreateProjectCommandLogFile(directory, "launcher-refresh", "launcher refresh")
      prompts.log.info(
        refreshLogFile
          ? `Refreshing project dependencies with uv. Streaming output to stderr. Full log: ${refreshLogFile}`
          : "Refreshing project dependencies with uv. Streaming output to stderr.",
      )
      const refresh = await refreshProjectDependencies(directory, venvPython, {
        logFile: refreshLogFile,
        timeoutMs: REBUILD_INSTALL_TIMEOUT_MS,
      })
      if (refresh.installerFailed) corruptedVenv = true
      if (!corruptedVenv) {
        prompts.log.info("Verifying Agency Swarm imports. First launch can take a minute.")
        let canary: VenvCanaryResult = { healthy: false, stderr: "", timedOut: false }
        try {
          canary = await venvCanaryPasses([venvPython], { includeStderr: true })
        } catch {
          canary = { healthy: false, stderr: "", timedOut: false }
        }
        if (canary.healthy) {
          prompts.log.success("Python environment ready")
          return [venvPython]
        }
        if (canary.timedOut) {
          throw new Error(await formatCanaryTimeoutFailure(directory, canary.stderr))
        }
        corruptedVenv = true
      }
    }
  } else if (hasVenvPath) {
    corruptedVenv = true
  }

  const detected = await findPythonExecutable(corruptedVenv ? venvDir : undefined)
  if (!detected) {
    if (corruptedVenv) {
      throw new Error(
        "Project `.venv` appears corrupted, and no replacement Python 3.12+ was found on PATH to rebuild it. Install Python 3.12+ and rerun.",
      )
    }
    throw new Error("Python 3.12 or newer was not found. Install Python, then rerun `npx @vrsen/agentswarm`.")
  }
  // During self-heal, invoke the resolved interpreter by its absolute path. The alias
  // (python3 etc.) resolves via PATH and, in an activated broken venv, still points at
  // the .venv binary we are about to delete.
  const rebuildCmd = corruptedVenv ? [detected.executable] : detected.cmd
  prompts.log.info(`Detected Python: ${formatPython(detected, rebuildCmd)}`)

  const uv = corruptedVenv ? await findUv() : undefined
  if (corruptedVenv) {
    prompts.log.warn("Project `.venv` is incomplete or corrupted. Rebuilding...")
    await rm(venvDir, { recursive: true, force: true })
    selfHealing = true
  }

  if (!selfHealing) {
    const createVenv = await prompts.confirm({
      message: "Create a local `.venv` in this project?",
      initialValue: true,
    })
    if (prompts.isCancel(createVenv)) {
      return
    }
    if (!createVenv) {
      const check = await runCommand([...rebuildCmd, "-c", "import agency_swarm"])
      if (check.code !== 0) {
        throw new Error(
          "This project does not have a `.venv` yet, and the selected Python environment cannot import `agency_swarm`.",
        )
      }
      return rebuildCmd
    }
  }

  const rebuildUv = uv ?? (await findUv())
  const spinner = prompts.spinner()
  spinner.start("Creating `.venv`")
  const created = await runCommand([...rebuildUv.cmd, "venv", "--python", detected.executable, ".venv"], {
    cwd: directory,
  })
  if (created.code !== 0) {
    spinner.stop("Failed to create `.venv`")
    throw new Error(created.stderr.trim() || created.stdout.trim() || "Virtual environment creation failed")
  }

  spinner.stop("`.venv` created")
  const installLogFile = await tryCreateProjectCommandLogFile(directory, "launcher-rebuild", "launcher rebuild")
  prompts.log.info(
    installLogFile
      ? `Installing project dependencies. Streaming output to stderr. Full log: ${installLogFile}`
      : "Installing project dependencies. Streaming output to stderr.",
  )
  const install = await installProjectDependencies(directory, venvPython, {
    logFile: installLogFile,
    timeoutMs: REBUILD_INSTALL_TIMEOUT_MS,
  })
  if (install.timedOut) {
    throw new Error(
      install.logFile
        ? `Dependency install timed out after ${formatInstallDuration(REBUILD_INSTALL_TIMEOUT_MS)}. Check the log file at ${install.logFile}.`
        : `Dependency install timed out after ${formatInstallDuration(REBUILD_INSTALL_TIMEOUT_MS)}.`,
    )
  }
  if (install.code !== 0) {
    throw new Error(formatCommandFailure(install, "Dependency install failed"))
  }
  prompts.log.info("Verifying Agency Swarm imports. First launch can take a minute.")
  const canary = await venvCanaryPasses([venvPython], { cwd: directory, includeStderr: true })
  if (canary.timedOut) {
    throw new Error(await formatCanaryTimeoutFailure(directory, canary.stderr))
  }
  if (!canary.healthy) {
    throw new Error(
      await formatPostInstallCanaryFailure(directory, install.hadManifests, canary.stderr, install.logFile),
    )
  }
  prompts.log.success("Python environment ready")
  return [venvPython]
}

async function installProjectDependencies(
  directory: string,
  venvPython: string,
  options: {
    logFile?: string
    timeoutMs: number
  },
): Promise<DependencyInstallResult> {
  const uv = await findUv()
  const requirements = path.join(directory, "requirements.txt")
  if (await Filesystem.exists(requirements)) {
    const result = await runCommand(
      [...uv.cmd, "pip", "install", "--python", venvPython, "--upgrade", "-r", "requirements.txt"],
      {
        cwd: directory,
        logFile: options.logFile,
        streamOutputToStderr: true,
        timeoutMs: options.timeoutMs,
      },
    )
    return { ...result, hadManifests: true }
  }

  const pyproject = path.join(directory, "pyproject.toml")
  if (await Filesystem.exists(pyproject)) {
    const result = await runCommand([...uv.cmd, "pip", "install", "--python", venvPython, "--upgrade", "-e", "."], {
      cwd: directory,
      logFile: options.logFile,
      streamOutputToStderr: true,
      timeoutMs: options.timeoutMs,
    })
    return { ...result, hadManifests: true }
  }

  const result = await runCommand(
    [...uv.cmd, "pip", "install", "--python", venvPython, FALLBACK_AGENCY_SWARM_REQUIREMENT],
    {
      logFile: options.logFile,
      streamOutputToStderr: true,
      timeoutMs: options.timeoutMs,
    },
  )
  return { ...result, hadManifests: false }
}

async function refreshProjectDependencies(
  directory: string,
  venvPython: string,
  options: {
    logFile?: string
    timeoutMs: number
  },
): Promise<{ installerFailed: boolean }> {
  try {
    if (!(await hasDependencyManifest(directory))) {
      return await ensureLatestAgencySwarm(directory, venvPython, options)
    }

    const result = await installProjectDependencies(directory, venvPython, options)
    if (result.timedOut) {
      prompts.log.warn(
        result.logFile
          ? `Timed out while refreshing project dependencies after ${formatInstallDuration(options.timeoutMs)}. Check the log file at ${result.logFile}.`
          : `Timed out while refreshing project dependencies after ${formatInstallDuration(options.timeoutMs)}.`,
      )
      return { installerFailed: false }
    }
    if (result.code !== 0) {
      const summary = summarizeCommandOutput(result)
      prompts.log.warn(
        summary
          ? `Could not refresh project dependencies from the manifest. Installer output: ${summary}.${
              result.logFile ? ` Check the log file at ${result.logFile}.` : ""
            } The current venv package set will be used as-is.`
          : "Could not refresh project dependencies from the manifest. The current venv package set will be used as-is.",
      )
      return { installerFailed: isUvLaunchFailure(`${result.stderr}\n${result.stdout}`) }
    }
  } catch (error) {
    if (!isUvUnavailableError(error)) throw error
    prompts.log.warn(
      "uv was not found, so project dependency refresh was skipped. The current venv package set will be used as-is.",
    )
  }
  return { installerFailed: false }
}

function isUvUnavailableError(error: unknown) {
  return error instanceof Error && error.message.includes("uv was not found")
}

async function formatPostInstallCanaryFailure(
  directory: string,
  hadManifests: boolean,
  stderr: string,
  logFile?: string,
) {
  const summary = summarizeBridgeStderr(stderr)
  const shadowingHint = await formatShadowingHint(directory)
  const logHint = logFile ? ` Check the log file at ${logFile}.` : ""
  const detail = summary ? ` Details: ${summary}` : ""
  if (isImportLikeCanaryFailure(stderr)) {
    if (hadManifests) {
      return `The launcher recreated the local Python environment, but it still could not import required Agency Swarm packages. Check requirements.txt/pyproject.toml for agency-swarm version compatibility.${shadowingHint}${logHint}${detail}`
    }
    return `The launcher recreated the local Python environment, but it still could not import required Agency Swarm packages. Check for project-local fastapi.py/agency_swarm.py files that may shadow installed packages.${shadowingHint}${logHint}${detail}`
  }
  return `The launcher recreated the local Python environment, but it still could not repair it.${shadowingHint}${logHint}${detail}`
}

async function formatCanaryTimeoutFailure(directory: string, stderr: string) {
  const summary = summarizeBridgeStderr(stderr)
  const shadowingHint = await formatShadowingHint(directory)
  return summary
    ? `Agency Swarm import canary timed out after ${formatInstallDuration(VENV_CANARY_TIMEOUT_MS)}. Startup stopped instead of waiting indefinitely.${shadowingHint} Canary stderr: ${summary}`
    : `Agency Swarm import canary timed out after ${formatInstallDuration(VENV_CANARY_TIMEOUT_MS)}. Startup stopped instead of waiting indefinitely.${shadowingHint}`
}

function isImportLikeCanaryFailure(stderr: string) {
  return /\b(?:ImportError|ModuleNotFoundError)\b/.test(stderr)
}

async function formatShadowingHint(directory: string) {
  const shadowingFiles = await findProjectShadowingFiles(directory)
  if (shadowingFiles.length === 0) return ""
  return ` Detected project-local ${shadowingFiles.join(", ")} that may shadow installed packages.`
}

async function findProjectShadowingFiles(directory: string) {
  const shadowingFiles = await Promise.all(
    ["fastapi.py", "agency_swarm.py"].map(async (file) =>
      (await Filesystem.exists(path.join(directory, file))) ? file : undefined,
    ),
  )
  return shadowingFiles.flatMap((file) => (file ? [file] : []))
}

async function venvCanaryPasses(python: string[], options?: { cwd?: string }): Promise<boolean>
async function venvCanaryPasses(
  python: string[],
  options: { cwd?: string; includeStderr: true },
): Promise<VenvCanaryResult>
async function venvCanaryPasses(python: string[], options?: { cwd?: string; includeStderr?: boolean }) {
  // No cwd by default: the canary must not pick up project-local modules (e.g. `fastapi.py`
  // sitting next to `agency.py`) that shadow installed packages and falsely flag a healthy
  // .venv as broken. Callers that need the server-launch cwd (post-install verification)
  // pass it explicitly.
  const result = await runCommand([...python, "-c", VENV_CANARY_SCRIPT], {
    cwd: options?.cwd,
    timeoutMs: VENV_CANARY_TIMEOUT_MS,
  })
  if (options?.includeStderr) {
    return {
      healthy: result.code === 0 && !result.timedOut,
      stderr: result.stderr,
      timedOut: result.timedOut === true,
    }
  }
  return result.code === 0 && !result.timedOut
}

async function ensureLatestAgencySwarm(
  directory: string,
  venvPython: string,
  options?: {
    logFile?: string
    timeoutMs?: number
  },
): Promise<{ installerFailed: boolean }> {
  const uv = await findUv()
  try {
    const result = await runCommand(
      [...uv.cmd, "pip", "install", "--python", venvPython, "--upgrade", "agency-swarm[fastapi,litellm]"],
      {
        cwd: directory,
        logFile: options?.logFile,
        streamOutputToStderr: true,
        suppressPythonTracebackStderr: true,
        timeoutMs: options?.timeoutMs,
      },
    )
    if (result.timedOut) {
      prompts.log.warn(
        result.logFile
          ? `Timed out while refreshing launcher-managed agency-swarm after ${formatInstallDuration(options?.timeoutMs ?? REBUILD_INSTALL_TIMEOUT_MS)}. Check the log file at ${result.logFile}.`
          : `Timed out while refreshing launcher-managed agency-swarm after ${formatInstallDuration(options?.timeoutMs ?? REBUILD_INSTALL_TIMEOUT_MS)}.`,
      )
      return { installerFailed: false }
    }
    if (result.code !== 0) {
      const summary = summarizeCommandOutput(result)
      prompts.log.warn(
        summary
          ? `Could not refresh launcher-managed agency-swarm. Installer output: ${summary}.${
              result.logFile ? ` Check the log file at ${result.logFile}.` : ""
            } The current venv package will be used as-is.`
          : "Could not refresh launcher-managed agency-swarm. The current venv package will be used as-is.",
      )
      return { installerFailed: isUvLaunchFailure(`${result.stderr}\n${result.stdout}`) }
    }
  } catch {
    prompts.log.warn("Could not refresh launcher-managed agency-swarm. The current venv package will be used as-is.")
  }
  return { installerFailed: false }
}

async function hasDependencyManifest(directory: string) {
  return (
    (await Filesystem.exists(path.join(directory, "requirements.txt"))) ||
    (await Filesystem.exists(path.join(directory, "pyproject.toml")))
  )
}

async function createProjectCommandLogFile(directory: string, stem: string) {
  const projectID = `${path.basename(path.resolve(directory)) || "project"}-${Bun.hash(path.resolve(directory)).toString(16)}`
  const logDirectory = path.join(os.tmpdir(), "agentswarm-cli-logs", projectID)
  await mkdir(logDirectory, { recursive: true })
  return path.join(logDirectory, `${new Date().toISOString().replaceAll(":", "").replaceAll(".", "")}-${stem}.log`)
}

async function tryCreateProjectCommandLogFile(directory: string, stem: string, label: string) {
  try {
    return await createProjectCommandLogFile(directory, stem)
  } catch (error) {
    prompts.log.warn(
      `Could not create ${label} log file. Continuing without a saved log: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function summarizeCommandOutput(result: Pick<CommandResult, "stdout" | "stderr">) {
  return summarizeInstallerOutput(result.stderr) || summarizeInstallerOutput(result.stdout)
}

function formatCommandFailure(result: CommandResult, fallback: string) {
  if (!result.logFile) {
    const detail = result.stderr.trim() || result.stdout.trim()
    return detail ? `${fallback}: ${detail}` : fallback
  }
  const summary = summarizeCommandOutput(result)
  const logHint = ` Check the log file at ${result.logFile}.`
  if (summary) return `${fallback}: ${summary}.${logHint}`
  return `${fallback}.${logHint}`.trim()
}

function formatInstallDuration(ms: number) {
  if (ms % 60000 === 0) {
    const minutes = ms / 60000
    return `${minutes} minute${minutes === 1 ? "" : "s"}`
  }
  if (ms % 1000 === 0) {
    const seconds = ms / 1000
    return `${seconds} second${seconds === 1 ? "" : "s"}`
  }
  return `${ms}ms`
}

async function startProjectServer(directory: string, python: string[]) {
  const port = await getFreePort()
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "agentswarm-npx-"))
  const scriptPath = path.join(tempDirectory, "launch_agency.py")
  const remove = () =>
    rm(tempDirectory, {
      recursive: true,
      force: true,
    }).catch(() => undefined)

  try {
    await Filesystem.write(scriptPath, SERVER_LAUNCHER_SCRIPT)
  } catch (error) {
    await remove()
    throw error
  }

  let child
  try {
    child = Bun.spawn({
      cmd: [...python, scriptPath, String(port), LOCAL_AGENCY_ID],
      cwd: directory,
      stdout: "ignore",
      stderr: "pipe",
      env: buildPythonEnv(directory),
    })
  } catch (error) {
    await remove()
    throw error
  }
  const stderr = createServerStderrCollector(child.stderr)

  const cleanup = async () => {
    child.kill()
    stderr.stop()
    await Promise.race([child.exited, sleep(5000)])
    await remove()
  }

  try {
    await waitForServer({
      baseURL: `http://127.0.0.1:${port}`,
      child,
      stderr,
    })
  } catch (error) {
    await cleanup()
    throw error
  }

  return {
    baseURL: `http://127.0.0.1:${port}`,
    cleanup,
  }
}

async function waitForServer(input: {
  baseURL: string
  child: ReturnType<typeof Bun.spawn>
  stderr: ServerStderrCollector
}) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS
  const metadataURL = `${input.baseURL}/${LOCAL_AGENCY_ID}/get_metadata`
  while (Date.now() < deadline) {
    const exited = await Promise.race([input.child.exited.then((code: number) => code), sleep(200).then(() => null)])
    if (typeof exited === "number") {
      const stderr = await input.stderr.read(SERVER_STDERR_COLLECT_TIMEOUT_MS)
      const summary = summarizeBridgeStderr(stderr)
      throw new Error(
        summary
          ? `Agency Swarm server exited with code ${exited}: ${summary}`
          : `Agency Swarm server exited with code ${exited}`,
      )
    }

    try {
      const response = await fetch(metadataURL)
      if (response.ok) return
    } catch {
      // server still starting
    }
  }

  input.child.kill()
  const stderr = await input.stderr.read(SERVER_STDERR_COLLECT_TIMEOUT_MS)
  const summary = summarizeActionableBridgeStderr(stderr)
  const warningSummary = summary ? "" : summarizeBridgeStderr(stderr)
  throw new Error(
    summary
      ? `Timed out waiting for the Agency Swarm server to start after ${formatInstallDuration(SERVER_START_TIMEOUT_MS)}. Last bridge output: ${summary}`
      : warningSummary
        ? `Timed out waiting for the Agency Swarm server to start after ${formatInstallDuration(SERVER_START_TIMEOUT_MS)}. Bridge output only contained non-fatal startup warnings: ${warningSummary}`
        : `Timed out waiting for the Agency Swarm server to start after ${formatInstallDuration(SERVER_START_TIMEOUT_MS)}`,
  )
}

function createServerStderrCollector(
  output: string | ReadableStream<Uint8Array> | null | undefined,
): ServerStderrCollector {
  if (typeof output === "string") {
    return {
      read: async () => output,
      stop() {},
    }
  }
  if (!output) {
    return {
      read: async () => "",
      stop() {},
    }
  }

  const reader = output.getReader()
  const decoder = new TextDecoder()
  let text = ""
  let settled = false
  const done = (async () => {
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        if (!chunk.value || chunk.value.length === 0) continue
        text += decoder.decode(chunk.value, { stream: true })
      }
      text += decoder.decode()
    } catch {
      text += decoder.decode()
    } finally {
      settled = true
    }
  })()

  return {
    async read(timeoutMs: number) {
      if (!settled) {
        await Promise.race([done, sleep(timeoutMs)])
      }
      return text
    },
    stop() {
      if (settled) return
      void reader.cancel().catch(() => undefined)
    },
  }
}

export function summarizeBridgeStderr(stderr: string): string {
  return summarizeBridgeStderrLines(splitStderrLines(stderr))
}

function summarizeActionableBridgeStderr(stderr: string): string {
  return summarizeBridgeStderrLines(splitStderrLines(stderr).filter((line) => !isNonFatalBridgeStartupWarning(line)))
}

function summarizeBridgeStderrLines(lines: string[]): string {
  if (lines.length === 0) return ""
  const tail = lines.slice(-5).join(" | ")
  return tail.length > 500 ? `${tail.slice(0, 500)}...` : tail
}

function splitStderrLines(stderr: string) {
  return stderr
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
}

function summarizeInstallerOutput(output: string) {
  const tracebackSummary = summarizePythonTraceback(output)
  if (tracebackSummary) return tracebackSummary
  return summarizeBridgeStderr(output)
}

function summarizePythonTraceback(output: string) {
  const lines = output
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
  if (!lines.some((line) => line.trim() === "Traceback (most recent call last):")) return ""
  return lines.findLast(isPythonTracebackFinalExceptionLine)?.trim() ?? ""
}

function isPythonTracebackFinalExceptionLine(line: string) {
  if (/^\s/.test(line)) return false
  return /^[A-Za-z_][\w.]*:(?:\s|$)/.test(line.trimEnd())
}

async function findUv(): Promise<UvInfo> {
  const result = await runCommand(["uv", "--version"])
  if (result.code !== 0) {
    throw new Error(
      "uv was not found. Install uv and rerun `npx @vrsen/agentswarm`; the launcher does not bootstrap uv with pip.",
    )
  }
  return {
    cmd: ["uv"],
  }
}

function isUvLaunchFailure(output: string) {
  return /uv(?:\.exe)?:?\s+(?:command not found|not found|No such file or directory|ENOENT)/i.test(output)
}

function isNonFatalBridgeStartupWarning(line: string) {
  const trimmed = line.trim()
  return (
    /^Files folder '.+' does not exist\. Skipping\.\.\.$/.test(trimmed) ||
    trimmed === "App token is not set. Authentication will be disabled."
  )
}

async function hasGitHubTemplateFlow() {
  const gh = await runCommand(["gh", "--version"])
  if (gh.code !== 0) return false
  const auth = await runCommand(["gh", "auth", "status"])
  return auth.code === 0
}

// Walk $PATH for python3.<minor> binaries before trying unqualified names. Some
// installers leave `python3` pointed at an older system interpreter while exposing
// supported versions only through their fully qualified names, such as python3.14.
// Prefer the oldest supported version when several are installed.
export async function collectUnixPythonCandidates(): Promise<string[][]> {
  const found = new Map<string, number>()
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      const match = entry.match(/^python3\.(\d+)$/)
      if (!match) continue
      const minor = Number(match[1])
      if (minor < 12) continue
      if (!found.has(entry)) found.set(entry, minor)
    }
  }
  const versioned = [...found.entries()].sort(([, a], [, b]) => a - b).map(([name]) => [name])
  return [...versioned, ["python3"], ["python"]]
}

async function findPythonExecutable(excludeUnder?: string) {
  const candidates: string[][] =
    process.platform === "win32"
      ? [["py", "-3.13"], ["py", "-3.12"], ["python"], ["python3"]]
      : await collectUnixPythonCandidates()

  const excludeRoot = excludeUnder ? path.resolve(excludeUnder) : undefined
  const excludePrefix = excludeRoot ? excludeRoot + path.sep : undefined
  const spawnEnv = excludeRoot ? stripVenvFromEnv(process.env, excludeRoot) : undefined

  for (const candidate of candidates) {
    const info = await inspectPython(candidate, spawnEnv)
    if (!info) continue
    if (excludeRoot && excludePrefix) {
      const resolved = path.resolve(info.executable)
      if (resolved === excludeRoot || resolved.startsWith(excludePrefix)) continue
    }
    const match = info.version.match(/^(\d+)\.(\d+)/)
    if (!match) continue
    const major = Number(match[1])
    const minor = Number(match[2])
    if (major > 3 || (major === 3 && minor >= 12)) return info
  }
}

function stripVenvFromEnv(env: NodeJS.ProcessEnv, venvRoot: string): NodeJS.ProcessEnv {
  const venvBin = path.join(venvRoot, process.platform === "win32" ? "Scripts" : "bin")
  const venvBinResolved = path.resolve(venvBin)
  const pathKey = process.platform === "win32" ? "Path" : "PATH"
  const rawPath = env[pathKey] ?? env.PATH ?? ""
  const sep = process.platform === "win32" ? ";" : ":"
  const filtered = rawPath
    .split(sep)
    .filter((entry) => {
      if (!entry) return false
      try {
        const resolved = path.resolve(entry)
        return resolved !== venvBinResolved && !resolved.startsWith(venvBinResolved + path.sep)
      } catch {
        return true
      }
    })
    .join(sep)
  const next = { ...env, [pathKey]: filtered }
  delete next.VIRTUAL_ENV
  // macOS's python3 honors __PYVENV_LAUNCHER__ when reporting sys.executable,
  // so leaving it in would make a healthy system Python lie and report itself
  // as the broken .venv interpreter, hiding the only valid recovery candidate.
  delete next.__PYVENV_LAUNCHER__
  return next
}

async function inspectPython(cmd: string[], env?: NodeJS.ProcessEnv): Promise<PythonInfo | undefined> {
  const result = await runCommand(
    [...cmd, "-c", "import sys; print(sys.executable); print(sys.version.split()[0])"],
    env ? { env } : undefined,
  )
  if (result.code !== 0) return
  const [executable, version] = result.stdout.trim().split(/\r?\n/)
  if (!executable || !version) return
  return {
    cmd,
    executable,
    version,
  }
}

function formatPython(info: PythonInfo | undefined, cmd: string[]) {
  if (!info) return cmd.join(" ")
  return `${info.executable} (Python ${info.version})`
}

function getVenvPythonPath(directory: string) {
  if (process.platform === "win32") return path.join(directory, ".venv", "Scripts", "python.exe")
  return path.join(directory, ".venv", "bin", "python")
}

async function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a free port")))
        return
      }
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(address.port)
      })
    })
  })
}

async function runCommand(cmd: string[], options?: RunCommandOptions): Promise<CommandResult> {
  const commandLog = openCommandLog(options?.logFile)
  const writeChunk = (chunk: string, streamToStderr: boolean) => {
    if (streamToStderr) {
      try {
        process.stderr.write(chunk)
      } catch {}
    }
    commandLog.write(chunk)
  }
  const stderrWriter = createStderrCommandWriter({
    commandLog,
    streamToStderr: options?.streamOutputToStderr === true,
    suppressPythonTracebacks: options?.suppressPythonTracebackStderr === true,
  })
  try {
    const proc = Bun.spawn({
      cmd,
      cwd: options?.cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: options?.env ?? process.env,
    })
    const outputAbort = new AbortController()
    let timeout: ReturnType<typeof setTimeout> | undefined
    const exitPromise = proc.exited.finally(() => {
      if (timeout) clearTimeout(timeout)
    })
    const exitResult = exitPromise.then((code) => ({ code, timedOut: false as const }))
    const timeoutResult =
      options?.timeoutMs === undefined
        ? undefined
        : new Promise<{ code: number; timedOut: true }>((resolve) => {
            timeout = setTimeout(() => {
              resolve({ code: -1, timedOut: true })
              void (async () => {
                try {
                  proc.kill()
                } catch {}
                const forceKill = setTimeout(() => {
                  try {
                    proc.kill("SIGKILL")
                  } catch {}
                }, PROCESS_KILL_GRACE_MS)
                await exitPromise.catch(() => undefined)
                clearTimeout(forceKill)
                outputAbort.abort()
              })()
            }, options.timeoutMs)
          })
    const [result, stdout, stderr] = await Promise.all([
      timeoutResult ? Promise.race([exitResult, timeoutResult]) : exitResult,
      readCommandOutput(
        proc.stdout,
        (chunk) => writeChunk(chunk, options?.streamOutputToStderr === true),
        outputAbort.signal,
      ),
      readCommandOutput(proc.stderr, stderrWriter, outputAbort.signal),
    ])
    const logFile = await closeCommandLog(commandLog)
    return { code: result.code, stdout, stderr, timedOut: result.timedOut, logFile }
  } catch (error) {
    const logFile = await closeCommandLog(commandLog)
    return {
      code: -1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      logFile,
    }
  }
}

function openCommandLog(logFile?: string) {
  if (!logFile) {
    return {
      getLogFile: () => undefined,
      write(_chunk: string) {},
      async close() {},
    }
  }

  let activeLogFile: string | undefined = logFile
  let stream: ReturnType<typeof createWriteStream> | undefined
  const disable = () => {
    activeLogFile = undefined
    if (!stream) return
    stream.destroy()
    stream = undefined
  }

  try {
    stream = createWriteStream(logFile, { flags: "a" })
    stream.on("error", () => {
      disable()
    })
  } catch {
    disable()
  }

  return {
    getLogFile: () => activeLogFile,
    write(chunk: string) {
      if (!stream) return
      try {
        stream.write(chunk)
      } catch {
        disable()
      }
    },
    async close() {
      if (!stream) return
      await new Promise<void>((resolve, reject) => {
        stream?.end((error?: Error | null) => {
          if (error) reject(error)
          else resolve()
        })
      }).catch(() => undefined)
      stream = undefined
    },
  }
}

function createStderrCommandWriter(input: {
  commandLog: ReturnType<typeof openCommandLog>
  streamToStderr: boolean
  suppressPythonTracebacks: boolean
}): OutputWriter {
  const userWriter = createUserStderrWriter(input.streamToStderr, input.suppressPythonTracebacks)
  return {
    write(chunk) {
      input.commandLog.write(chunk)
      userWriter.write(chunk)
    },
    close() {
      userWriter.close?.()
    },
  }
}

function createUserStderrWriter(streamToStderr: boolean, suppressPythonTracebacks: boolean): OutputWriter {
  let pending = ""
  let suppressingTraceback = false

  const writeLine = (line: string) => {
    const trimmed = line.trim()
    if (suppressPythonTracebacks && !suppressingTraceback && trimmed === "Traceback (most recent call last):") {
      suppressingTraceback = true
      return
    }
    if (suppressingTraceback) {
      if (isPythonTracebackFinalExceptionLine(line)) suppressingTraceback = false
      return
    }
    if (!streamToStderr) return
    try {
      process.stderr.write(line)
    } catch {}
  }

  return {
    write(chunk) {
      const text = pending + chunk
      const lines = text.split(/(?<=\n)/)
      pending = lines.at(-1)?.endsWith("\n") ? "" : (lines.pop() ?? "")
      for (const line of lines) {
        writeLine(line)
      }
    },
    close() {
      if (!pending) return
      writeLine(pending)
      pending = ""
    },
  }
}

async function closeCommandLog(log: ReturnType<typeof openCommandLog>) {
  await log.close()
  return log.getLogFile()
}

function writeOutput(writer: ((chunk: string) => void) | OutputWriter, chunk: string) {
  if (typeof writer === "function") writer(chunk)
  else writer.write(chunk)
}

function closeOutputWriter(writer: ((chunk: string) => void) | OutputWriter | undefined) {
  if (typeof writer === "function") return
  writer?.close?.()
}

async function readCommandOutput(
  output: string | ReadableStream<Uint8Array> | null | undefined,
  writer?: ((chunk: string) => void) | OutputWriter,
  signal?: AbortSignal,
) {
  if (typeof output === "string") {
    if (output && writer) writeOutput(writer, output)
    closeOutputWriter(writer)
    return output
  }
  if (!output) return ""

  const reader = output.getReader()
  const decoder = new TextDecoder()
  let text = ""
  const abortRead = () => {
    void reader.cancel().catch(() => undefined)
  }
  signal?.addEventListener("abort", abortRead, { once: true })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || signal?.aborted) break
      if (!value || value.length === 0) continue
      const chunk = decoder.decode(value, { stream: true })
      if (writer) writeOutput(writer, chunk)
      text += chunk
    }
    const tail = decoder.decode()
    if (tail) {
      if (writer) writeOutput(writer, tail)
      text += tail
    }
    return text
  } catch (error) {
    if (signal?.aborted) return text
    throw error
  } finally {
    closeOutputWriter(writer)
    signal?.removeEventListener("abort", abortRead)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
