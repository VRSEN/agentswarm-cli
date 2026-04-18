import * as prompts from "@clack/prompts"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
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
}

interface PythonInfo {
  cmd: string[]
  executable: string
  version: string
}

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

function isLauncher(input: { env: NodeJS.ProcessEnv; argv?: string[] }) {
  return input.env[LAUNCHER_ENTRY_ENV] === "1" || isAgentswarmCommand(input.argv ?? process.argv)
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
  let selfHealing = false
  let corruptedVenv = false
  const hasVenv = await Filesystem.exists(venvPython)
  if (hasVenv) {
    const info = await inspectPython([venvPython])
    prompts.log.info(`Using project Python: ${formatPython(info, [venvPython])}`)
    await ensureLatestAgencySwarm(directory, [venvPython])
    const healthy = await venvCanaryPasses([venvPython])
    if (healthy) return [venvPython]
    corruptedVenv = true
  }

  const detected = await findPythonExecutable()
  if (!detected) {
    if (corruptedVenv) {
      throw new Error(
        "Project `.venv` appears corrupted, and no replacement Python 3.12+ was found on PATH to rebuild it. Install Python 3.12+ and rerun.",
      )
    }
    throw new Error("Python 3.12 or newer was not found. Install Python, then rerun `npx @vrsen/agentswarm`.")
  }
  prompts.log.info(`Detected Python: ${formatPython(detected, detected.cmd)}`)

  if (corruptedVenv) {
    prompts.log.warn("Project `.venv` is missing module sources (corrupted install). Rebuilding...")
    await rm(path.join(directory, ".venv"), { recursive: true, force: true })
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
      const check = await runCommand([...detected.cmd, "-c", "import agency_swarm"])
      if (check.code !== 0) {
        throw new Error(
          "This project does not have a `.venv` yet, and the selected Python environment cannot import `agency_swarm`.",
        )
      }
      return detected.cmd
    }
  }

  const spinner = prompts.spinner()
  spinner.start("Creating `.venv`")
  const created = await runCommand([...detected.cmd, "-m", "venv", ".venv"], {
    cwd: directory,
  })
  if (created.code !== 0) {
    spinner.stop("Failed to create `.venv`")
    throw new Error(created.stderr.trim() || created.stdout.trim() || "Virtual environment creation failed")
  }

  spinner.stop("`.venv` created")
  spinner.start("Installing project dependencies")
  const install = await installProjectDependencies(directory, [venvPython])
  if (install.code !== 0) {
    spinner.stop("Dependency install failed")
    throw new Error(install.stderr.trim() || install.stdout.trim() || "Dependency install failed")
  }
  spinner.stop("Python environment ready")
  return [venvPython]
}

async function installProjectDependencies(directory: string, python: string[]) {
  const requirements = path.join(directory, "requirements.txt")
  if (await Filesystem.exists(requirements)) {
    return runCommand([...python, "-m", "pip", "install", "--upgrade", "-r", "requirements.txt"], {
      cwd: directory,
    })
  }

  const pyproject = path.join(directory, "pyproject.toml")
  if (await Filesystem.exists(pyproject)) {
    return runCommand([...python, "-m", "pip", "install", "--upgrade", "-e", "."], {
      cwd: directory,
    })
  }

  return runCommand([...python, "-m", "pip", "install", "--upgrade", "agency-swarm[fastapi,litellm]>=1.9.1"])
}

async function venvCanaryPasses(python: string[]) {
  const result = await runCommand([
    ...python,
    "-c",
    "from agency_swarm.integrations.fastapi import run_fastapi",
  ])
  return result.code === 0
}

async function ensureLatestAgencySwarm(directory: string, python: string[]) {
  try {
    const result = await runCommand(
      [...python, "-m", "pip", "install", "--upgrade", "agency-swarm[fastapi,litellm]"],
      { cwd: directory },
    )
    if (result.code !== 0) {
      prompts.log.warn(
        "Could not refresh agency-swarm to the latest version. The current venv package will be used as-is.",
      )
    }
  } catch {
    prompts.log.warn(
      "Could not refresh agency-swarm to the latest version. The current venv package will be used as-is.",
    )
  }
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
  const stderrPromise = child.stderr ? new Response(child.stderr).text().catch(() => "") : Promise.resolve("")

  const cleanup = async () => {
    child.kill()
    await Promise.race([child.exited, sleep(5000)])
    await remove()
  }

  try {
    await waitForServer({
      baseURL: `http://127.0.0.1:${port}`,
      child,
      stderrPromise,
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
  stderrPromise: Promise<string>
}) {
  const deadline = Date.now() + 30000
  const metadataURL = `${input.baseURL}/${LOCAL_AGENCY_ID}/get_metadata`
  while (Date.now() < deadline) {
    const exited = await Promise.race([input.child.exited.then((code: number) => code), sleep(200).then(() => null)])
    if (typeof exited === "number") {
      const stderr = await input.stderrPromise
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
  const stderr = await input.stderrPromise
  const summary = summarizeBridgeStderr(stderr)
  throw new Error(
    summary
      ? `Timed out waiting for the Agency Swarm server to start. Last bridge output: ${summary}`
      : "Timed out waiting for the Agency Swarm server to start",
  )
}

export function summarizeBridgeStderr(stderr: string): string {
  const trimmed = stderr.trim()
  if (!trimmed) return ""
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const tail = lines.slice(-5).join(" | ")
  return tail.length > 500 ? `${tail.slice(0, 500)}...` : tail
}

async function hasGitHubTemplateFlow() {
  const gh = await runCommand(["gh", "--version"])
  if (gh.code !== 0) return false
  const auth = await runCommand(["gh", "auth", "status"])
  return auth.code === 0
}

async function findPythonExecutable() {
  const candidates: string[][] =
    process.platform === "win32"
      ? [["py", "-3.13"], ["py", "-3.12"], ["python"], ["python3"]]
      : [["python3.13"], ["python3.12"], ["python3"], ["python"]]

  for (const candidate of candidates) {
    const info = await inspectPython(candidate)
    if (!info) continue
    const match = info.version.match(/^(\d+)\.(\d+)/)
    if (!match) continue
    const major = Number(match[1])
    const minor = Number(match[2])
    if (major > 3 || (major === 3 && minor >= 12)) return info
  }
}

async function inspectPython(cmd: string[]): Promise<PythonInfo | undefined> {
  const result = await runCommand([...cmd, "-c", "import sys; print(sys.executable); print(sys.version.split()[0])"])
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

async function runCommand(cmd: string[], options?: { cwd?: string }): Promise<CommandResult> {
  const proc = Bun.spawn({
    cmd,
    cwd: options?.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })

  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
  ])

  return {
    code,
    stdout,
    stderr,
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
