import * as prompts from "@clack/prompts"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { AgencySwarmAdapter } from "./adapter"
import { Filesystem } from "@/util/filesystem"

export const NPX_ENTRY_ENV = "AGENTSWARM_NPX"
export const STARTER_TEMPLATE_REPO = "agency-ai-solutions/agency-starter-template"
export const STARTER_TEMPLATE_URL = `https://github.com/${STARTER_TEMPLATE_REPO}.git`
export const LOCAL_AGENCY_ID = "local-agency"

type LaunchChoice = "project" | "starter" | "connect"
type StarterMode = "github" | "local"

export interface PreparedNpxLaunch {
  directory: string
  configContent?: string
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

export function shouldRunNpxOnboarding(input: {
  env: NodeJS.ProcessEnv
  model?: string
  continue?: boolean
  session?: string
  prompt?: string
  agent?: string
}) {
  if (input.env[NPX_ENTRY_ENV] !== "1") return false
  if (input.model) return false
  if (input.continue) return false
  if (input.session) return false
  if (input.prompt) return false
  if (input.agent) return false
  return true
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
  const project = await findProject(directory)
  if (project) return project

  const children = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const projects = (
    await Promise.all(
      children
        .filter((child) => child.isDirectory() && !child.name.startsWith("."))
        .map((child) => readProject(path.join(directory, child.name))),
    )
  ).filter((project): project is AgencyProject => Boolean(project))
  if (projects.length === 1) return projects[0]
}

export function getStarterBaseDirectory(directory: string, project?: AgencyProject) {
  if (project) return path.dirname(project.directory)
  return directory
}

async function findProject(directory: string): Promise<AgencyProject | undefined> {
  const dir = path.resolve(directory)
  const project = await readProject(dir)
  if (project) return project

  const parent = path.dirname(dir)
  if (parent === dir) return
  return findProject(parent)
}

async function readProject(directory: string): Promise<AgencyProject | undefined> {
  const agencyFile = path.join(directory, "agency.py")
  if (!(await Filesystem.exists(agencyFile))) return
  const source = await Filesystem.readText(agencyFile).catch(() => "")
  if (!source.includes("def create_agency")) return
  if (!source.includes("agency_swarm")) return
  return {
    directory,
    agencyFile,
  } satisfies AgencyProject
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
          baseDirectory: getStarterBaseDirectory(directory, project),
        })
  if (!targetProject) {
    prompts.outro("Cancelled")
    return
  }

  const launch = await prepareProjectLaunch(targetProject)
  prompts.outro(`Opening Agent Swarm in ${targetProject.directory}`)
  return launch
}

async function chooseLaunchChoice(project: AgencyProject | undefined) {
  prompts.log.info("1. Choose how to start the terminal UI.")
  prompts.log.info(
    "   The NPX launcher can reuse the current project, create a starter project, or connect to an existing server.",
  )

  const result = await prompts.select<LaunchChoice>({
    message: "How do you want to start?",
    options: [
      ...(project
        ? [
            {
              value: "project" as const,
              label: "Use existing Agency Swarm project",
              hint: path.basename(project.directory),
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
      if (!value?.trim()) return "A name is required"
      if (/[\\/:*?\"<>|]/.test(value)) return "Use a simple folder or repository name"
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

export async function prepareProjectLaunch(project: AgencyProject): Promise<PreparedNpxLaunch> {
  prompts.log.info("3. Prepare Python for Agent Builder.")
  prompts.log.info(
    "   The launcher will reuse a project `.venv` when it exists, otherwise it will create one before opening the local builder.",
  )

  await ensureProjectPython(project.directory)
  return {
    directory: project.directory,
  }
}

async function ensureProjectPython(directory: string) {
  const venvPython = getVenvPythonPath(directory)
  const hasVenv = await Filesystem.exists(venvPython)
  if (hasVenv) return [venvPython]

  const detected = await findPythonExecutable()
  if (!detected) {
    throw new Error("Python 3.12 or newer was not found. Install Python, then rerun `npx @vrsen/agentswarm`.")
  }

  const createVenv = await prompts.confirm({
    message: "Create a local `.venv` in this project?",
    initialValue: true,
  })
  if (prompts.isCancel(createVenv)) {
    throw new Error("Cancelled before creating the project virtual environment.")
  }
  if (!createVenv) {
    const check = await runCommand([...detected, "-c", "import agency_swarm"])
    if (check.code !== 0) {
      throw new Error(
        "This project does not have a `.venv` yet, and the selected Python environment cannot import `agency_swarm`.",
      )
    }
    return detected
  }

  const spinner = prompts.spinner()
  spinner.start("Creating `.venv`")
  const created = await runCommand([...detected, "-m", "venv", ".venv"], {
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
    return runCommand([...python, "-m", "pip", "install", "-r", "requirements.txt"], {
      cwd: directory,
    })
  }

  const pyproject = path.join(directory, "pyproject.toml")
  if (await Filesystem.exists(pyproject)) {
    return runCommand([...python, "-m", "pip", "install", "-e", "."], {
      cwd: directory,
    })
  }

  return runCommand([...python, "-m", "pip", "install", "agency-swarm[fastapi]>=1.8.1"])
}

async function startProjectServer(directory: string, python: string[]) {
  const port = await getFreePort()
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "agentswarm-npx-"))
  const scriptPath = path.join(tempDirectory, "launch_agency.py")
  await Filesystem.write(
    scriptPath,
    [
      "from agency import create_agency",
      "from agency_swarm.integrations.fastapi import run_fastapi",
      "import sys",
      "",
      "port = int(sys.argv[1])",
      "agency_id = sys.argv[2]",
      "",
      "run_fastapi(",
      "    agencies={agency_id: create_agency},",
      '    host="127.0.0.1",',
      "    port=port,",
      '    server_url=f"http://127.0.0.1:{port}",',
      '    app_token_env="",',
      ")",
      "",
    ].join("\n"),
  )

  const child = Bun.spawn({
    cmd: [...python, scriptPath, String(port), LOCAL_AGENCY_ID],
    cwd: directory,
    stdout: "ignore",
    stderr: "pipe",
    env: buildPythonEnv(directory),
  })
  const stderrPromise = child.stderr ? new Response(child.stderr).text().catch(() => "") : Promise.resolve("")

  await waitForServer({
    baseURL: `http://127.0.0.1:${port}`,
    child,
    stderrPromise,
  })

  return {
    baseURL: `http://127.0.0.1:${port}`,
    cleanup: async () => {
      child.kill()
      await Promise.race([child.exited, sleep(5000)])
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      }).catch(() => undefined)
    },
  }
}

async function waitForServer(input: {
  baseURL: string
  child: ReturnType<typeof Bun.spawn>
  stderrPromise: Promise<string>
}) {
  const deadline = Date.now() + 15000
  const metadataURL = `${input.baseURL}/${LOCAL_AGENCY_ID}/get_metadata`
  while (Date.now() < deadline) {
    const exited = await Promise.race([input.child.exited.then((code: number) => code), sleep(200).then(() => null)])
    if (typeof exited === "number") {
      const stderr = await input.stderrPromise
      throw new Error(stderr.trim() || `Agency Swarm server exited with code ${exited}`)
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
  throw new Error(stderr.trim() || "Timed out waiting for the Agency Swarm server to start")
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
    const result = await runCommand([...candidate, "--version"])
    if (result.code !== 0) continue
    const versionText = `${result.stdout}${result.stderr}`
    const match = versionText.match(/Python (\d+)\.(\d+)/)
    if (!match) continue
    const major = Number(match[1])
    const minor = Number(match[2])
    if (major > 3 || (major === 3 && minor >= 12)) {
      return candidate
    }
  }
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
