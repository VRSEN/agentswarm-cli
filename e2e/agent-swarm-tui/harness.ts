import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawn, type Proc } from "../../packages/opencode/src/pty/pty.bun"

const repoRoot = path.resolve(import.meta.dir, "../..")
const packageRoot = path.join(repoRoot, "packages", "opencode")
const modelsFixture = path.join(packageRoot, "test", "tool", "fixtures", "models-api.json")

export type FakeAgencyServer = {
  baseURL: string
  requests: Array<{ path: string; body: Record<string, unknown> }>
  stop(): void
}

export async function startFakeAgencyServer(): Promise<FakeAgencyServer> {
  const requests: FakeAgencyServer["requests"] = []
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
          metadata: {
            agencyName: "Live QA Agency",
            agents: ["entry-agent", "review-agent"],
            entryPoints: ["entry-agent"],
          },
          nodes: [
            {
              id: "entry-agent",
              type: "agent",
              data: {
                label: "Entry Agent",
                description: "Primary QA route",
                isEntryPoint: true,
                model: "gpt-4o-mini",
              },
            },
            {
              id: "review-agent",
              type: "agent",
              data: {
                label: "Review Agent",
                description: "Review QA route",
                model: "gpt-4o-mini",
              },
            },
          ],
        })
      }

      if (url.pathname === "/local-agency/get_response_stream") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        requests.push({ path: url.pathname, body })
        return new Response(['event: meta\ndata: {"run_id":"run_e2e"}\n\n', "event: end\ndata: {}\n\n"].join(""), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        })
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

export type TuiProcess = {
  root: string
  write(input: string): void
  screen(): string
  history(): string
  waitForText(text: string, timeoutMs?: number): Promise<string>
  waitFor(predicate: () => boolean, message: string, timeoutMs?: number): Promise<void>
  close(): Promise<void>
}

export async function startTui(input: {
  args?: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  baseURL?: string
  agency?: string
  recipientAgent?: string
}): Promise<TuiProcess> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentswarm-tui-e2e-"))
  await mkdir(path.join(root, "home"), { recursive: true })
  await mkdir(path.join(root, "config"), { recursive: true })
  await mkdir(path.join(root, "config", "opencode"), { recursive: true })
  await mkdir(path.join(root, "data"), { recursive: true })
  await mkdir(path.join(root, "managed"), { recursive: true })

  const screen = new TerminalScreen(100, 30)
  let raw = ""
  let exitCode: number | undefined
  const configContent = input.baseURL
    ? JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        model: "agency-swarm/default",
        provider: {
          "agency-swarm": {
            name: "Agency Swarm",
            options: {
              baseURL: input.baseURL,
              agency: input.agency ?? "local-agency",
              recipientAgent: input.recipientAgent ?? "entry-agent",
              discoveryTimeoutMs: 500,
              token: "bridge-token",
              clientConfig: {
                apiKey: "not-a-live-key",
                model: "gpt-4o-mini",
              },
            },
          },
        },
      })
    : undefined

  const args = input.args ?? (input.baseURL ? ["--model", "agency-swarm/default"] : [])
  const env = await scrubProviderEnv({
    ...allowedParentEnv(),
    CI: "1",
    TERM: "xterm-256color",
    HOME: path.join(root, "home"),
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_DATA_HOME: path.join(root, "data"),
    OPENCODE_CONFIG_DIR: path.join(root, "config", "opencode"),
    OPENCODE_TEST_HOME: path.join(root, "home"),
    OPENCODE_TEST_MANAGED_CONFIG_DIR: path.join(root, "managed"),
    OPENCODE_DISABLE_AUTOUPDATE: "true",
    OPENCODE_DISABLE_DEFAULT_PLUGINS: "true",
    OPENCODE_DISABLE_MODELS_FETCH: "true",
    OPENCODE_DISABLE_PROJECT_CONFIG: "true",
    OPENCODE_MODELS_PATH: modelsFixture,
    OPENCODE_PURE: "1",
    ...(configContent ? { OPENCODE_CONFIG_CONTENT: configContent } : {}),
    ...(input.env ?? {}),
  })
  const proc = spawn(process.execPath, ["--conditions=browser", "./src/index.ts", ...args], {
    cwd: input.cwd ?? packageRoot,
    cols: 100,
    rows: 30,
    name: "xterm-256color",
    env: cleanEnv(env),
  })

  proc.onData((chunk) => {
    raw += chunk
    if (raw.length > 200_000) raw = raw.slice(-120_000)
    screen.feed(chunk)
  })
  proc.onExit((event) => {
    exitCode = event.exitCode
  })

  return {
    root,
    write(data) {
      proc.write(data)
    },
    screen() {
      return screen.text()
    },
    history() {
      return stripAnsi(raw)
    },
    async waitForText(text, timeoutMs = 10_000) {
      await waitFor(
        () => this.screen().includes(text) || this.history().includes(text),
        () =>
          `Timed out waiting for ${JSON.stringify(text)}.\n\nScreen:\n${this.screen()}\n\nHistory tail:\n${tail(this.history())}`,
        timeoutMs,
      )
      return this.screen()
    },
    async waitFor(predicate, message, timeoutMs = 10_000) {
      await waitFor(
        () => {
          if (exitCode !== undefined) {
            throw new Error(`TUI exited with code ${exitCode} while waiting for ${message}.\n\n${tail(this.history())}`)
          }
          return predicate()
        },
        () =>
          `Timed out waiting for ${message}.\n\nScreen:\n${this.screen()}\n\nHistory tail:\n${tail(this.history())}`,
        timeoutMs,
      )
    },
    async close() {
      await closeProcess(proc)
      await rm(root, { recursive: true, force: true })
    },
  }
}

export async function writeAgencyProject(dir: string) {
  await writeFile(
    path.join(dir, "agency.py"),
    ["from agency_swarm import Agency", "", "def create_agency():", "    return Agency()", ""].join("\n"),
  )
}

async function closeProcess(proc: Proc) {
  proc.write("\x03")
  await new Promise((resolve) => setTimeout(resolve, 100))
  proc.kill("SIGTERM")
  await new Promise((resolve) => setTimeout(resolve, 100))
}

async function waitFor(predicate: () => boolean, failure: () => string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      if (predicate()) return
    } catch (error) {
      lastError = error
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  if (lastError) throw lastError
  throw new Error(failure())
}

function cleanEnv(env: Record<string, string | undefined>) {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) result[key] = value
  }
  return result
}

function allowedParentEnv() {
  const names = ["PATH", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE"] as const
  const result: Record<string, string | undefined> = {}
  for (const name of names) result[name] = process.env[name]
  return result
}

async function scrubProviderEnv(env: Record<string, string | undefined>) {
  const result = { ...env }
  const providerEnvNames = await loadProviderEnvNames()
  providerEnvNames.add("OPENAI_API_KEY")
  providerEnvNames.add("ANTHROPIC_API_KEY")
  providerEnvNames.add("ANTHROPIC_AUTH_TOKEN")
  for (const name of providerEnvNames) result[name] = undefined
  return result
}

async function loadProviderEnvNames() {
  const fixture = (await Bun.file(modelsFixture).json()) as
    | { providers?: Record<string, unknown> }
    | Record<string, unknown>
  const providers = "providers" in fixture && fixture.providers ? fixture.providers : fixture
  const names = new Set<string>()
  for (const provider of Object.values(providers)) {
    if (!provider || typeof provider !== "object") continue
    const envNames = (provider as { env?: unknown }).env
    if (!Array.isArray(envNames)) continue
    for (const name of envNames) {
      if (typeof name === "string") names.add(name)
    }
  }
  return names
}

function tail(value: string, lines = 80) {
  return value.split(/\r?\n/).slice(-lines).join("\n")
}

function stripAnsi(value: string) {
  return value
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[PX^_][\s\S]*?\x1b\\/g, "")
    .replace(/\x1b[@-_]/g, "")
}

class TerminalScreen {
  private rows: string[][]
  private row = 0
  private col = 0
  private pending = ""

  constructor(
    private readonly cols: number,
    private readonly rowCount: number,
  ) {
    this.rows = Array.from({ length: rowCount }, () => [])
  }

  feed(input: string) {
    let data = this.pending + input
    this.pending = ""
    for (let index = 0; index < data.length; index++) {
      const char = data[index]
      if (char === "\x1b") {
        const parsed = this.readEscape(data, index)
        if (!parsed) {
          this.pending = data.slice(index)
          return
        }
        index = parsed.next
        continue
      }
      if (char === "\r") {
        this.col = 0
        continue
      }
      if (char === "\n") {
        this.newline()
        continue
      }
      if (char === "\b") {
        this.col = Math.max(0, this.col - 1)
        continue
      }
      if (char && char >= " ") this.put(char)
    }
  }

  text() {
    return this.rows
      .map((row) => row.join("").trimEnd())
      .join("\n")
      .trimEnd()
  }

  private readEscape(data: string, start: number): { next: number } | undefined {
    const kind = data[start + 1]
    if (!kind) return
    if (kind === "[") {
      for (let i = start + 2; i < data.length; i++) {
        const code = data.charCodeAt(i)
        if (code >= 0x40 && code <= 0x7e) {
          this.handleCsi(data.slice(start + 2, i), data[i])
          return { next: i }
        }
      }
      return
    }
    if (kind === "]") {
      for (let i = start + 2; i < data.length; i++) {
        if (data[i] === "\x07") return { next: i }
        if (data[i] === "\x1b" && data[i + 1] === "\\") return { next: i + 1 }
      }
      return
    }
    return { next: start + 1 }
  }

  private handleCsi(raw: string, final: string) {
    const privateMode = raw.startsWith("?")
    const values = raw
      .replace(/^[?=>]/, "")
      .split(";")
      .map((item) => Number.parseInt(item || "0", 10))
    if (privateMode && values.includes(1049) && (final === "h" || final === "l")) {
      this.clear()
      return
    }
    if (final === "H" || final === "f") {
      this.row = clamp((values[0] || 1) - 1, 0, this.rowCount - 1)
      this.col = clamp((values[1] || 1) - 1, 0, this.cols - 1)
      return
    }
    if (final === "J") {
      if ((values[0] || 0) >= 2) this.clear()
      return
    }
    if (final === "K") {
      this.rows[this.row].splice(this.col)
      return
    }
    if (final === "A") this.row = clamp(this.row - (values[0] || 1), 0, this.rowCount - 1)
    if (final === "B") this.row = clamp(this.row + (values[0] || 1), 0, this.rowCount - 1)
    if (final === "C") this.col = clamp(this.col + (values[0] || 1), 0, this.cols - 1)
    if (final === "D") this.col = clamp(this.col - (values[0] || 1), 0, this.cols - 1)
    if (final === "G") this.col = clamp((values[0] || 1) - 1, 0, this.cols - 1)
  }

  private put(char: string) {
    if (this.col >= this.cols) this.newline()
    this.rows[this.row][this.col] = char
    this.col++
  }

  private newline() {
    this.row++
    this.col = 0
    if (this.row < this.rowCount) return
    this.rows.shift()
    this.rows.push([])
    this.row = this.rowCount - 1
  }

  private clear() {
    this.rows = Array.from({ length: this.rowCount }, () => [])
    this.row = 0
    this.col = 0
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
