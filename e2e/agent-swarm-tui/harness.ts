import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawn, type Proc } from "../../packages/opencode/src/pty/pty.bun"

const repoRoot = path.resolve(import.meta.dir, "../..")
const packageRoot = path.join(repoRoot, "packages", "opencode")
const modelsFixture = path.join(packageRoot, "test", "tool", "fixtures", "models-api.json")
const discoveryTimeoutMs = process.env.CI ? 5_000 : 500
const initialOutputAttemptCount = process.env.CI ? 3 : 2
const initialOutputTimeoutMs = process.env.CI ? 45_000 : 5_000
const initialOutputRetryDelayMs = process.env.CI ? 500 : 250

export type AgencyProtocolServer = {
  baseURL: string
  requests: Array<{
    path: string
    body: Record<string, unknown>
    releaseStream?: () => void
    streamClosed?: Promise<void>
  }>
  stop(): void
}

type AgencyServerScenario = "qa" | "tui-demo"

export async function startAgencyProtocolServer(
  input: { scenario?: AgencyServerScenario } = {},
): Promise<AgencyProtocolServer> {
  const scenario = input.scenario ?? "qa"
  const requests: AgencyProtocolServer["requests"] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      const fixture = scenario === "tui-demo" ? tuiDemoAgencyFixture : qaAgencyFixture

      if (url.pathname === "/openapi.json") {
        return Response.json({
          openapi: "3.1.0",
          paths: {
            [`/${fixture.agencyID}/get_metadata`]: { get: {} },
            [`/${fixture.agencyID}/get_response_stream`]: { post: {} },
            [`/${fixture.agencyID}/cancel_response_stream`]: { post: {} },
          },
        })
      }

      if (url.pathname === `/${fixture.agencyID}/get_metadata`) {
        return Response.json(fixture.metadata)
      }

      if (url.pathname === `/${fixture.agencyID}/get_response_stream`) {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        let releaseStream!: () => void
        const streamReleased = new Promise<void>((resolve) => {
          releaseStream = resolve
        })
        let closed = false
        let resolveStreamClosed!: () => void
        const streamClosed = new Promise<void>((resolve) => {
          resolveStreamClosed = resolve
        })
        const closeStream = () => {
          if (closed) return
          closed = true
          resolveStreamClosed()
        }
        requests.push({ path: url.pathname, body, releaseStream, streamClosed })
        const responseBody = await fixture.stream(body, requests.length, streamReleased, closeStream)
        if (!(responseBody instanceof ReadableStream)) closeStream()
        return new Response(responseBody, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        })
      }

      if (url.pathname === `/${fixture.agencyID}/cancel_response_stream`) {
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

export async function startTuiDemoAgencyServer(): Promise<AgencyProtocolServer> {
  return startAgencyProtocolServer({ scenario: "tui-demo" })
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
  configSource?: "env" | "file"
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
              discoveryTimeoutMs,
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

  if (configContent && input.configSource === "file") {
    const globalConfig = path.join(root, "config", "agentswarm")
    await mkdir(globalConfig, { recursive: true })
    await writeFile(path.join(globalConfig, "agentswarm.json"), configContent)
  }

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
    ...(configContent && input.configSource !== "file" ? { OPENCODE_CONFIG_CONTENT: configContent } : {}),
    ...(input.env ?? {}),
  })
  let proc = spawnTuiProcess({ args, cwd: input.cwd, env })

  let dataReceived = false
  let activeProc = proc
  const attachProcess = (next: Proc) => {
    activeProc = next
    next.onData((chunk) => {
      if (next !== activeProc) return
      dataReceived = true
      raw += chunk
      if (raw.length > 200_000) raw = raw.slice(-120_000)
      screen.feed(chunk)
    })
    next.onExit((event) => {
      if (next !== activeProc) return
      exitCode = event.exitCode
    })
  }
  attachProcess(proc)

  try {
    await waitForInitialOutput({
      hasOutput: () => dataReceived,
      getExitCode: () => exitCode,
      history: () => stripAnsi(raw),
      attemptCount: initialOutputAttemptCount,
      timeoutMs: initialOutputTimeoutMs,
      onRetry: async () => {
        await closeProcess(proc)
        await Bun.sleep(initialOutputRetryDelayMs)
        proc = spawnTuiProcess({ args, cwd: input.cwd, env })
        dataReceived = false
        exitCode = undefined
        attachProcess(proc)
      },
    })
  } catch (error) {
    await cleanupTuiProcess(proc, root, exitCode === undefined)
    throw error
  }

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
        () => {
          if (exitCode !== undefined) {
            throw new Error(
              `TUI exited with code ${exitCode} while waiting for ${JSON.stringify(text)}.\n\n${tail(this.history())}`,
            )
          }
          return this.screen().includes(text) || this.history().includes(text)
        },
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
      await cleanupTuiProcess(proc, root, exitCode === undefined)
    },
  }
}

function spawnTuiProcess(input: { args: string[]; cwd?: string; env: Record<string, string | undefined> }) {
  return spawn(process.execPath, ["--conditions=browser", "./src/index.ts", ...input.args], {
    cwd: input.cwd ?? packageRoot,
    cols: 100,
    rows: 30,
    name: "xterm-256color",
    env: cleanEnv(input.env),
  })
}

export async function writeAgencyProject(dir: string) {
  await writeFile(
    path.join(dir, "agency.py"),
    ["from agency_swarm import Agency", "", "def create_agency():", "    return Agency()", ""].join("\n"),
  )
}

type AgencyFixture = {
  agencyID: string
  metadata: Record<string, unknown>
  stream(
    body: Record<string, unknown>,
    requestCount: number,
    streamReleased: Promise<void>,
    closeStream: () => void,
  ): BodyInit | Promise<BodyInit>
}

const qaAgencyFixture: AgencyFixture = {
  agencyID: "local-agency",
  metadata: {
    agency_swarm_version: "1.9.6",
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
  },
  stream(body, requestCount, streamReleased, closeStream) {
    const message = typeof body.message === "string" ? body.message : ""
    if (message.includes("issue 172 hold")) {
      return controlledSse(
        [
          ["meta", { run_id: `run_e2e_${requestCount}` }],
          [
            "messages",
            {
              new_messages: [
                {
                  id: `msg_issue172_${requestCount}`,
                  type: "message",
                  role: "assistant",
                  agent: "entry-agent",
                  content: [{ type: "output_text", text: "completed first issue 172 prompt" }],
                },
              ],
            },
          ],
          ["end", {}],
        ],
        streamReleased,
        closeStream,
      )
    }
    return sse([
      ["meta", { run_id: `run_e2e_${requestCount}` }],
      ["end", {}],
    ])
  },
}

// Mirrors the two-agent shape of VRSEN/agency-swarm examples/interactive/tui.py
// without depending on Python, network installs, or live LLM credentials.
const tuiDemoAgencyFixture: AgencyFixture = {
  agencyID: "tui-demo-agency",
  metadata: {
    agency_swarm_version: "1.9.6",
    metadata: {
      agencyName: "TuiDemoAgency",
      agents: ["UserSupportAgent", "MathAgent"],
      entryPoints: ["UserSupportAgent"],
    },
    nodes: [
      {
        id: "UserSupportAgent",
        type: "agent",
        data: {
          label: "UserSupportAgent",
          description: "Receives user requests and coordinates reasoning, search, and file work.",
          isEntryPoint: true,
          model: "gpt-5.4-mini",
        },
      },
      {
        id: "MathAgent",
        type: "agent",
        data: {
          label: "MathAgent",
          description: "Handles arithmetic and calculation-heavy requests.",
          model: "gpt-5.4-mini",
        },
      },
    ],
  },
  stream(body, requestCount) {
    const message = typeof body.message === "string" ? body.message.toLowerCase() : ""
    if (message.includes("nested delegate")) {
      return sse([
        ["meta", { run_id: `run_tui_demo_${requestCount}` }],
        [
          "data",
          {
            type: "raw_response_event",
            agent: "UserSupportAgent",
            data: {
              type: "response.output_item.added",
              output_index: "1",
              item: {
                type: "function_call",
                id: "fc_send_message_nested",
                call_id: "call_send_message_nested",
                name: "SendMessage",
                arguments: JSON.stringify({
                  recipient_agent: "MathAgent",
                  message: "Please calculate this.",
                }),
              },
            },
          },
        ],
        [
          "data",
          {
            type: "agent_updated_stream_event",
            callerAgent: "UserSupportAgent",
            parent_run_id: `run_tui_demo_${requestCount}`,
            new_agent: {
              id: "MathAgent",
              name: "MathAgent",
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                type: "function_call_output",
                call_id: "call_send_message_nested",
                output: JSON.stringify({
                  recipient_agent: "MathAgent",
                  response: "Nested delegation completed without transfer.",
                }),
              },
              {
                id: `msg_nested_delegate_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "MathAgent",
                content: [{ type: "output_text", text: "Nested SendMessage delegation finished." }],
              },
            ],
          },
        ],
        ["end", {}],
      ])
    }
    if (message.includes("mixed handoff")) {
      return sse([
        ["meta", { run_id: `run_tui_demo_${requestCount}` }],
        [
          "data",
          {
            type: "raw_response_event",
            agent: "UserSupportAgent",
            data: {
              type: "response.output_item.added",
              output_index: "1",
              item: {
                type: "function_call",
                id: "fc_transfer_math_mixed",
                call_id: "call_transfer_math_mixed",
                name: "transfer_to_math_agent",
                arguments: "{}",
              },
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                type: "handoff_output_item",
                call_id: "call_transfer_math_mixed",
                output: '{"assistant":"MathAgent"}',
              },
            ],
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                type: "handoff_output_item",
                call_id: "call_nested_handoff_mixed",
                callerAgent: "MathAgent",
                parent_run_id: `run_tui_demo_${requestCount}`,
                output: {
                  assistant: "UserSupportAgent",
                },
              },
            ],
          },
        ],
        [
          "data",
          {
            type: "agent_updated_stream_event",
            callerAgent: "MathAgent",
            parent_run_id: `run_tui_demo_${requestCount}`,
            new_agent: {
              id: "UserSupportAgent",
              name: "UserSupportAgent",
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                id: `msg_mixed_handoff_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "UserSupportAgent",
                content: [{ type: "output_text", text: "Math handoff finished after nested delegation." }],
              },
            ],
          },
        ],
        ["end", {}],
      ])
    }
    if (message.includes("delegate")) {
      return sse([
        ["meta", { run_id: `run_tui_demo_${requestCount}` }],
        [
          "data",
          {
            type: "raw_response_event",
            agent: "UserSupportAgent",
            data: {
              type: "response.output_item.added",
              output_index: "1",
              item: {
                type: "function_call",
                id: "fc_send_message",
                call_id: "call_send_message",
                name: "SendMessage",
                arguments: JSON.stringify({
                  recipient_agent: "MathAgent",
                  message: "Please calculate this.",
                }),
              },
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                id: `msg_delegate_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "UserSupportAgent",
                content: [{ type: "output_text", text: "Starting SendMessage delegation." }],
              },
            ],
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                type: "function_call_output",
                call_id: "call_send_message",
                output: JSON.stringify({
                  recipient_agent: "MathAgent",
                  response: "Delegation completed without transfer.",
                }),
              },
              {
                id: `msg_delegate_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "MathAgent",
                content: [{ type: "output_text", text: "Delegated to MathAgent with SendMessage." }],
              },
            ],
          },
        ],
        ["end", {}],
      ])
    }
    if (message.includes("live handoff")) {
      return sse([
        ["meta", { run_id: `run_tui_demo_${requestCount}` }],
        [
          "data",
          {
            type: "agent_updated_stream_event",
            agent: "MathAgent",
            new_agent: {
              id: "MathAgent",
              name: "MathAgent",
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                id: `msg_live_handoff_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "MathAgent",
                content: [{ type: "output_text", text: "Live agent update moved control to MathAgent." }],
              },
            ],
          },
        ],
        ["end", {}],
      ])
    }
    if (message.includes("handoff")) {
      return sse([
        ["meta", { run_id: `run_tui_demo_${requestCount}` }],
        [
          "data",
          {
            type: "raw_response_event",
            agent: "UserSupportAgent",
            data: {
              type: "response.output_item.added",
              output_index: "1",
              item: {
                type: "function_call",
                id: "fc_transfer_math",
                call_id: "call_transfer_math",
                name: "transfer_to_math_agent",
                arguments: "{}",
              },
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                type: "handoff_output_item",
                call_id: "call_transfer_math",
                output: '{"assistant":"MathAgent"}',
              },
            ],
          },
        ],
        [
          "data",
          {
            type: "agent_updated_stream_event",
            agent: "MathAgent",
            new_agent: {
              id: "MathAgent",
              name: "MathAgent",
            },
          },
        ],
        [
          "messages",
          {
            new_messages: [
              {
                id: `msg_math_${requestCount}`,
                type: "message",
                role: "assistant",
                agent: "MathAgent",
                content: [{ type: "output_text", text: "Math agent now has control." }],
              },
            ],
          },
        ],
        ["end", {}],
      ])
    }

    return sse([
      ["meta", { run_id: `run_tui_demo_${requestCount}` }],
      [
        "messages",
        {
          new_messages: [
            {
              id: `msg_support_${requestCount}`,
              type: "message",
              role: "assistant",
              agent: body.recipient_agent || "UserSupportAgent",
              content: [{ type: "output_text", text: "TUI demo response complete." }],
            },
          ],
        },
      ],
      ["end", {}],
    ])
  },
}

function sse(events: Array<[event: string, data: Record<string, unknown>]>) {
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("")
}

function controlledSse(
  events: Array<[event: string, data: Record<string, unknown>]>,
  streamReleased: Promise<void>,
  closeStream: () => void,
) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sse(events.slice(0, 1))))
      await streamReleased
      controller.enqueue(encoder.encode(sse(events.slice(1))))
      controller.close()
      closeStream()
    },
    cancel() {
      closeStream()
    },
  })
}

async function closeProcess(proc: Proc) {
  let exited = false
  let dispose: (() => void) | undefined
  const exit = new Promise<void>((resolve) => {
    const disp = proc.onExit(() => {
      exited = true
      dispose?.()
      resolve()
    })
    dispose = () => disp.dispose()
  })
  const wait = (timeoutMs: number) =>
    Promise.race([exit.then(() => true), new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs))])

  proc.write("\x03")
  if (await wait(1000)) return

  proc.kill("SIGTERM")
  if (await wait(2000)) return

  if (!exited) proc.kill("SIGKILL")
  await wait(1000)
  dispose?.()
}

async function cleanupTuiProcess(proc: Proc, root: string, closeActiveProcess: boolean) {
  try {
    if (closeActiveProcess) await closeProcess(proc)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
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

async function waitForInitialOutput(input: {
  hasOutput: () => boolean
  getExitCode: () => number | undefined
  history: () => string
  attemptCount: number
  timeoutMs: number
  onRetry: () => Promise<void>
}) {
  for (let attempt = 1; attempt <= input.attemptCount; attempt++) {
    const message = attempt === 1 ? "initial TUI output" : `initial TUI output after retry ${attempt - 1}`
    try {
      await waitForInitialOutputOnce(input, message)
      return
    } catch {
      const exitCode = input.getExitCode()
      if (exitCode !== undefined) throw initialOutputExitError(exitCode, message, input.history())
      if (attempt === input.attemptCount) throw initialOutputTimeoutError(message, input.history())
      await input.onRetry()
    }
  }
}

async function waitForInitialOutputOnce(
  input: {
    hasOutput: () => boolean
    getExitCode: () => number | undefined
    history: () => string
    timeoutMs: number
  },
  message: string,
) {
  await waitFor(
    () => {
      if (input.hasOutput()) return true
      const exitCode = input.getExitCode()
      if (exitCode !== undefined) {
        throw initialOutputExitError(exitCode, message, input.history())
      }
      return false
    },
    () => initialOutputTimeoutError(message, input.history()).message,
    input.timeoutMs,
  )
}

function initialOutputExitError(exitCode: number, message: string, history: string) {
  return new Error(`TUI exited with code ${exitCode} before ${message}.\n\nHistory tail:\n${tail(history)}`)
}

function initialOutputTimeoutError(message: string, history: string) {
  return new Error(`Timed out waiting for ${message}.\n\nHistory tail:\n${tail(history)}`)
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
