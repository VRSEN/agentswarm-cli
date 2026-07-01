import { afterAll, afterEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Telemetry } from "../../src/telemetry/telemetry"

const originalClient = process.env.OPENCODE_CLIENT
const originalEnableTelemetry = process.env.ENABLE_TELEMETRY
const originalTelemetry = process.env.OPENCODE_TELEMETRY
const runnerDirs: string[] = []
let buildQueue = Promise.resolve()

type Captured = {
  api_key?: unknown
  distinct_id?: unknown
  event?: unknown
  properties?: Record<string, unknown>
}

type RunnerMode = "capture" | "flush-before-capture" | "bounded-flush" | "abort" | "command"

type RunnerInput = {
  binaryVersion?: string
  command?: {
    category?: string
    keybind?: string
    source: "keybind" | "palette" | "programmatic" | "slash" | "suggested"
    value: string
  }
  env?: Record<string, string | undefined>
  event?: Parameters<typeof Telemetry.capture>[0]
  host?: string | null
  key?: string | null
  mode?: RunnerMode
  productVersion?: string | null
  properties?: Record<string, unknown>
  readState?: boolean
  stateDir: string
  testMode?: boolean
}

type RunnerOutput = {
  aborted: boolean
  captured: boolean
  elapsed: number
  requests: Array<{ url: string; body: Captured }>
  state?: unknown
}

function defineString(value: string | null | undefined, fallback?: string) {
  if (value === null || (value === undefined && fallback === undefined)) return "undefined"
  return JSON.stringify(value ?? fallback)
}

async function buildRunner(input: RunnerInput) {
  const previous = buildQueue
  let release!: () => void
  buildQueue = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await buildRunnerUnlocked(input)
  } finally {
    release()
  }
}

async function buildRunnerUnlocked(input: RunnerInput) {
  const root = path.resolve(import.meta.dir, "../..")
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-telemetry-runner-"))
  runnerDirs.push(dir)
  const entry = path.join(dir, "telemetry-runner.ts")
  const outdir = path.join(dir, "out")
  await Bun.write(
    entry,
    [
      `import fs from "fs/promises"`,
      `import path from "path"`,
      `import { Telemetry } from ${JSON.stringify(path.join(root, "src/telemetry/telemetry.ts"))}`,
      `import { captureCommand } from ${JSON.stringify(path.join(root, "src/telemetry/command.ts"))}`,
      `type Input = { command?: Parameters<typeof captureCommand>[0]; event?: Parameters<typeof Telemetry.capture>[0]; mode?: "capture" | "flush-before-capture" | "bounded-flush" | "abort" | "command"; properties?: Record<string, unknown>; readState?: boolean; stateDir: string }`,
      `const input = await Bun.file(process.argv[2]).json() as Input`,
      `process.env.AGENTSWARM_TELEMETRY_STATE_DIR = input.stateDir`,
      `const requests: Array<{ url: string; body: unknown }> = []`,
      `let aborted = false`,
      `let captured = false`,
      `let elapsed = 0`,
      `let markFetchReady: () => void = () => {}`,
      `const fetchReady = new Promise<void>((resolve) => {`,
      `  markFetchReady = resolve`,
      `})`,
      `async function waitForFetch() {`,
      `  let timeout: ReturnType<typeof setTimeout> | undefined`,
      `  try {`,
      `    await Promise.race([`,
      `      fetchReady,`,
      `      new Promise<void>((_, reject) => {`,
      `        timeout = setTimeout(() => reject(new Error("telemetry request did not start")), 500)`,
      `      }),`,
      `    ])`,
      `  } finally {`,
      `    if (timeout) clearTimeout(timeout)`,
      `  }`,
      `}`,
      `globalThis.fetch = (async (url, init) => {`,
      `  if (init?.signal?.aborted) {`,
      `    aborted = true`,
      `    markFetchReady()`,
      `    return new Response(null, { status: 499 })`,
      `  }`,
      `  if (input.mode === "bounded-flush") {`,
      `    return new Promise<Response>((resolve) => {`,
      `      const timeout = setTimeout(() => resolve(new Response(null, { status: 200 })), 50)`,
      `      init?.signal?.addEventListener("abort", () => {`,
      `        clearTimeout(timeout)`,
      `        aborted = true`,
      `        resolve(new Response(null, { status: 499 }))`,
      `      }, { once: true })`,
      `      markFetchReady()`,
      `    })`,
      `  }`,
      `  if (input.mode === "abort") {`,
      `    return new Promise<Response>((resolve) => {`,
      `      init?.signal?.addEventListener("abort", () => {`,
      `        aborted = true`,
      `        resolve(new Response(null, { status: 499 }))`,
      `      }, { once: true })`,
      `      markFetchReady()`,
      `    })`,
      `  }`,
      `  requests.push({ url: String(url), body: JSON.parse(String(init?.body)) })`,
      `  return new Response(null, { status: 200 })`,
      `}) as typeof fetch`,
      `if (input.mode === "command") {`,
      `  if (!input.command) throw new Error("missing command input")`,
      `  captureCommand(input.command)`,
      `  await Telemetry.flush()`,
      `  captured = requests.length > 0`,
      `} else if (input.mode === "flush-before-capture") {`,
      `  if (!input.event) throw new Error("missing event input")`,
      `  const capture = Telemetry.capture(input.event, input.properties)`,
      `  await Telemetry.flush()`,
      `  captured = await capture`,
      `} else {`,
      `  if (!input.event) throw new Error("missing event input")`,
      `  captured = await Telemetry.capture(input.event, input.properties)`,
      `  if (input.mode === "bounded-flush" || input.mode === "abort") {`,
      `    await waitForFetch()`,
      `    const started = Date.now()`,
      `    await Telemetry.flush({ timeoutMs: 1 })`,
      `    elapsed = Date.now() - started`,
      `  } else {`,
      `    await Telemetry.flush()`,
      `  }`,
      `}`,
      `let state: unknown`,
      `if (input.readState) {`,
      `  try { state = JSON.parse(await fs.readFile(path.join(input.stateDir, "telemetry.json"), "utf8")) } catch {}`,
      `}`,
      `console.log(JSON.stringify({ aborted, captured, elapsed, requests, state }))`,
    ].join("\n"),
  )
  const config = {
    entrypoints: [entry],
    outdir,
    format: "esm",
    target: "bun",
    tsconfig: path.join(root, "tsconfig.json"),
    define: {
      AGENTSWARM_POSTHOG_API_KEY: defineString(input.key, "ph_test"),
      AGENTSWARM_POSTHOG_HOST: defineString(input.host, "https://posthog.example"),
      AGENTSWARM_PRODUCT_VERSION: defineString(input.productVersion),
      AGENTSWARM_TELEMETRY_TEST: input.testMode === false ? "undefined" : "true",
      OPENCODE_VERSION: defineString(input.binaryVersion, "local"),
    },
  }
  const builder = path.join(dir, "build-runner.js")
  await Bun.write(
    builder,
    [
      `const result = await Bun.build(${JSON.stringify(config)})`,
      `if (!result.success) {`,
      `  console.error(result.logs.map((log) => log.message).join("\\n"))`,
      `  process.exit(1)`,
      `}`,
    ].join("\n"),
  )
  const proc = Bun.spawn([process.execPath, builder], {
    cwd: root,
    env: Object.fromEntries(
      Object.entries({ PATH: process.env.PATH }).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(stderr || stdout)
  return path.join(outdir, "telemetry-runner.js")
}

async function runCompiledTelemetry(input: RunnerInput) {
  const runner = await buildRunner(input)
  const payload = path.join(path.dirname(path.dirname(runner)), "input.json")
  await Bun.write(
    payload,
    JSON.stringify({
      command: input.command,
      event: input.event,
      mode: input.mode ?? "capture",
      properties: input.properties,
      readState: input.readState,
      stateDir: input.stateDir,
    }),
  )
  const baseEnv = {
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    TMPDIR: process.env.TMPDIR,
    ...input.env,
  }
  const env = Object.fromEntries(
    Object.entries(baseEnv).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
  const proc = Bun.spawn([process.execPath, runner, payload], {
    cwd: path.resolve(import.meta.dir, "../.."),
    env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  expect(stderr).toBe("")
  expect(code).toBe(0)
  return JSON.parse(stdout) as RunnerOutput
}

function resetEnv() {
  delete process.env.AGENTSWARM_POSTHOG_API_KEY
  delete process.env.AGENTSWARM_POSTHOG_HOST
  delete process.env.AGENTSWARM_TELEMETRY
  delete process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST
  delete process.env.AGENTSWARM_TELEMETRY_STATE_DIR
  if (originalEnableTelemetry === undefined) delete process.env.ENABLE_TELEMETRY
  else process.env.ENABLE_TELEMETRY = originalEnableTelemetry
  delete process.env.OPEN_SWARM_TELEMETRY
  if (originalTelemetry === undefined) delete process.env.OPENCODE_TELEMETRY
  else process.env.OPENCODE_TELEMETRY = originalTelemetry
  if (originalClient === undefined) delete process.env.OPENCODE_CLIENT
  else process.env.OPENCODE_CLIENT = originalClient
}

async function captureBody(event: Parameters<typeof Telemetry.capture>[0], properties: Record<string, unknown>) {
  await using tmp = await tmpdir()
  const output = await runCompiledTelemetry({
    event,
    properties,
    stateDir: tmp.path,
  })

  expect(output.requests).toHaveLength(1)
  return output.requests[0].body
}

describe("Telemetry", () => {
  afterAll(async () => {
    await Promise.all(runnerDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })))
  })

  afterEach(() => {
    resetEnv()
  })

  test("sends allowlisted product analytics without prompt content", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "ui_prompt_submitted",
      properties: {
        command: "run",
        framework_mode: true,
        has_file_parts: true,
        message: "secret prompt",
        mode: "normal",
        provider_id: "agency-swarm",
        type: "prompt",
      },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(true)
    expect(output.requests).toHaveLength(1)
    expect(output.requests[0].url).toBe("https://posthog.example/i/v0/e/")
    expect(output.requests[0].body.event).toBe("ui_prompt_submitted")
    expect(output.requests[0].body.api_key).toBe("ph_test")
    expect(output.requests[0].body.distinct_id).toBeTruthy()
    expect(output.requests[0].body.properties).toMatchObject({
      $process_person_profile: false,
      framework_mode: true,
      has_file_parts: true,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    expect(output.requests[0].body.properties?.command).toBeUndefined()
    expect(JSON.stringify(output.requests[0].body)).not.toContain("secret prompt")
  })

  test("keeps compiled telemetry key when runtime key env is set", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "https://runtime.example",
        AGENTSWARM_TELEMETRY_ALLOW_TEST: "1",
        BUN_TEST: "1",
      },
      event: "app_started",
      host: "https://compiled.example",
      key: "ph_compiled",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(true)
    expect(output.requests[0].url).toBe("https://compiled.example/i/v0/e/")
    expect(output.requests[0].body.api_key).toBe("ph_compiled")
  })

  test("sends product version separately from binary version without prompt content", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      binaryVersion: "9.9.9-agentswarm",
      env: {
        AGENTSWARM_PRODUCT_VERSION: "1.2.3-openswarm",
      },
      event: "ui_prompt_submitted",
      properties: {
        framework_mode: true,
        has_file_parts: false,
        message: "secret prompt",
        mode: "normal",
        provider_id: "agency-swarm",
        type: "prompt",
      },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(true)
    expect(output.requests[0].body.properties).toMatchObject({
      product_version: "1.2.3-openswarm",
      version: "9.9.9-agentswarm",
    })
    expect(JSON.stringify(output.requests[0].body)).not.toContain("secret prompt")
  })

  test("uses compiled product version when runtime product env is blank", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "app_started",
      productVersion: "2.0.0-compiled",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.requests[0].body.properties?.product_version).toBe("2.0.0-compiled")
  })

  test("uses the default host when no host is compiled", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: {
        AGENTSWARM_POSTHOG_HOST: "https://runtime.example",
      },
      event: "app_started",
      host: null,
      key: "ph_compiled",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(true)
    expect(output.requests[0].url).toBe("https://us.i.posthog.com/i/v0/e/")
    expect(output.requests[0].body.api_key).toBe("ph_compiled")
  })

  test("ignores runtime telemetry key and host env when no key is compiled", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: {
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "https://runtime.example",
        AGENTSWARM_TELEMETRY_ALLOW_TEST: "1",
        BUN_TEST: "1",
        NODE_ENV: "test",
        OPENCODE_TEST_HOME: tmp.path,
      },
      event: "app_started",
      host: null,
      key: null,
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(false)
    expect(output.requests).toHaveLength(0)
  })

  test("does not send when opted out", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: { AGENTSWARM_TELEMETRY: "false" },
      event: "app_started",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(false)
    expect(output.requests).toHaveLength(0)
  })

  test("does not send when OpenSwarm opt-out is set", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: { OPEN_SWARM_TELEMETRY: "0" },
      event: "app_started",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(false)
    expect(output.requests).toHaveLength(0)
  })

  test("does not send when generic telemetry opt-out is set", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: { ENABLE_TELEMETRY: "0" },
      event: "app_started",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(false)
    expect(output.requests).toHaveLength(0)
  })

  test("uses the anonymous install id from state", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, "telemetry.json"), JSON.stringify({ installID: "known-install-id" }))
    const output = await runCompiledTelemetry({
      event: "app_started",
      properties: { entrypoint: "tui" },
      readState: true,
      stateDir: tmp.path,
    })

    expect(output.requests).toHaveLength(1)
    expect(output.requests[0].body.distinct_id).toBe("known-install-id")
    expect(output.state).toEqual({
      installID: "known-install-id",
    })
  })

  test("flush waits for fire-and-forget capture setup", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "app_started",
      mode: "flush-before-capture",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.requests).toHaveLength(1)
    expect(output.requests[0].body.event).toBe("app_started")
  })

  test("flush can be bounded for shutdown", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "app_started",
      mode: "bounded-flush",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.elapsed).toBeLessThan(40)
  })

  test("bounded flush aborts pending telemetry requests", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "app_started",
      mode: "abort",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.aborted).toBe(true)
  })

  test("captures provider auth setup without credential material", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "provider_auth_configured",
      properties: {
        auth_method: "api",
        framework_mode: true,
        provider_id: "openai",
        source: "auth_dialog",
        token: "sk-secret",
      },
      stateDir: tmp.path,
    })

    expect(output.requests[0].body.event).toBe("provider_auth_configured")
    expect(output.requests[0].body.properties).toMatchObject({
      $process_person_profile: false,
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(JSON.stringify(output.requests[0].body)).not.toContain("sk-secret")
  })

  test("captures the approved trust-safe event properties", async () => {
    const cases: Array<{
      event: Parameters<typeof Telemetry.capture>[0]
      properties: Record<string, unknown>
      expected: Record<string, unknown>
    }> = [
      {
        event: "agent_created",
        properties: {
          mode: "subagent",
          scope: "project",
          tool_count_bucket: "4_7",
        },
        expected: {
          mode: "subagent",
          scope: "project",
          tool_count_bucket: "4_7",
        },
      },
      {
        event: "provider_requested",
        properties: {
          connected_before: false,
          framework_mode: true,
          provider_id: "openai",
          source: "auth_dialog",
        },
        expected: {
          connected_before: false,
          framework_mode: true,
          provider_id: "openai",
          source: "auth_dialog",
        },
      },
      {
        event: "provider_auth_started",
        properties: {
          auth_method: "api",
          framework_mode: true,
          provider_id: "anthropic",
          source: "auth_dialog",
        },
        expected: {
          auth_method: "api",
          framework_mode: true,
          provider_id: "anthropic",
          source: "auth_dialog",
        },
      },
      {
        event: "provider_auth_failed",
        properties: {
          auth_method: "oauth",
          error_bucket: "auth_rejected",
          framework_mode: true,
          provider_id: "openai",
          source: "auth_dialog",
          step: "oauth_callback",
        },
        expected: {
          auth_method: "oauth",
          error_bucket: "auth_rejected",
          framework_mode: true,
          provider_id: "openai",
          source: "auth_dialog",
          step: "oauth_callback",
        },
      },
      {
        event: "project_initialized",
        properties: {
          source: "init_command",
          vcs: "git",
        },
        expected: {
          source: "init_command",
          vcs: "git",
        },
      },
      {
        event: "task_succeeded",
        properties: {
          duration_bucket: "lt_2s",
          framework_mode: true,
          has_agent_parts: false,
          has_file_parts: true,
          mode: "normal",
          provider_id: "agency-swarm",
        },
        expected: {
          duration_bucket: "lt_2s",
          framework_mode: true,
          has_agent_parts: false,
          has_file_parts: true,
          mode: "normal",
          provider_id: "agency-swarm",
        },
      },
      {
        event: "task_failed",
        properties: {
          duration_bucket: "2s_10s",
          error_bucket: "network",
          framework_mode: true,
          has_agent_parts: true,
          has_file_parts: false,
          mode: "normal",
          provider_id: "agency-swarm",
        },
        expected: {
          duration_bucket: "2s_10s",
          error_bucket: "network",
          framework_mode: true,
          has_agent_parts: true,
          has_file_parts: false,
          mode: "normal",
          provider_id: "agency-swarm",
        },
      },
      {
        event: "integration_requested",
        properties: {
          already_configured: true,
          integration_id: "search",
          provider_id: "openai",
          source: "addons_dialog",
        },
        expected: {
          already_configured: true,
          integration_id: "search",
          provider_id: "openai",
          source: "addons_dialog",
        },
      },
    ]

    for (const item of cases) {
      const body = await captureBody(item.event, {
        ...item.properties,
        agent_name: "private-agent-name",
        agent_path: "/Users/example/.agents/private-agent.md",
        description: "private agent description",
        env_var: "OPENAI_API_KEY=sk-env-secret",
        error_text: "Invalid API key: sk-error-secret",
        file_path: "/Users/example/private.ts",
        generated_prompt: "private generated system prompt",
        message: "secret prompt text",
        message_content: "private conversation content",
        messageID: "msg_secret",
        model_id: "openai/gpt-5.4-mini",
        project_id: "proj_secret",
        prompt_text: "private prompt text",
        raw_error: "Invalid API key: sk-secret",
        secret: "sk-explicit-secret",
        sessionID: "ses_secret",
        source_content: "private source content",
        tool_count: 7,
        tool_input: "private tool input",
        tool_output: "private tool output",
      })

      expect(body.event).toBe(item.event)
      expect(body.properties).toMatchObject(item.expected)
      const serialized = JSON.stringify(body)
      expect(serialized).not.toContain("secret prompt text")
      expect(serialized).not.toContain("private-agent-name")
      expect(serialized).not.toContain("private-agent.md")
      expect(serialized).not.toContain("private agent description")
      expect(serialized).not.toContain("OPENAI_API_KEY")
      expect(serialized).not.toContain("sk-env-secret")
      expect(serialized).not.toContain("sk-error-secret")
      expect(serialized).not.toContain("msg_secret")
      expect(serialized).not.toContain("/Users/example/private.ts")
      expect(serialized).not.toContain("private conversation content")
      expect(serialized).not.toContain("private generated system prompt")
      expect(serialized).not.toContain("openai/gpt-5.4-mini")
      expect(serialized).not.toContain("proj_secret")
      expect(serialized).not.toContain("private prompt text")
      expect(serialized).not.toContain("sk-secret")
      expect(serialized).not.toContain("sk-explicit-secret")
      expect(serialized).not.toContain("ses_secret")
      expect(serialized).not.toContain("private source content")
      expect(serialized).not.toContain("private tool input")
      expect(serialized).not.toContain("private tool output")
    }
  })

  test("drops invalid enum values and buckets unknown public ids", async () => {
    const auth = await captureBody("provider_auth_failed", {
      auth_method: "password",
      error_bucket: "raw provider error",
      framework_mode: true,
      provider_id: "openai/gpt-5.4-mini",
      source: "external",
      step: "token_exchange",
    })

    expect(auth.properties).toMatchObject({
      framework_mode: true,
      provider_id: "custom",
    })
    expect(auth.properties?.auth_method).toBeUndefined()
    expect(auth.properties?.error_bucket).toBeUndefined()
    expect(auth.properties?.source).toBeUndefined()
    expect(auth.properties?.step).toBeUndefined()
    expect(JSON.stringify(auth)).not.toContain("openai/gpt-5.4-mini")
    expect(JSON.stringify(auth)).not.toContain("raw provider error")

    const integration = await captureBody("integration_requested", {
      already_configured: false,
      integration_id: "private-crm",
      provider_id: "private-provider",
      source: "addons_dialog",
    })

    expect(integration.properties).toMatchObject({
      already_configured: false,
      integration_id: "custom",
      provider_id: "custom",
      source: "addons_dialog",
    })
    expect(JSON.stringify(integration)).not.toContain("private-crm")
    expect(JSON.stringify(integration)).not.toContain("private-provider")

    const project = await captureBody("project_initialized", {
      source: "private source",
      vcs: "hg",
    })

    expect(project.properties?.source).toBeUndefined()
    expect(project.properties?.vcs).toBeUndefined()
    expect(JSON.stringify(project)).not.toContain("private source")

    const agent = await captureBody("agent_created", {
      mode: "debug",
      scope: "private-scope",
      tool_count_bucket: "11",
    })

    expect(agent.properties?.mode).toBeUndefined()
    expect(agent.properties?.scope).toBeUndefined()
    expect(agent.properties?.tool_count_bucket).toBeUndefined()
    expect(JSON.stringify(agent)).not.toContain("private-scope")
  })

  test("drops string payloads passed to boolean telemetry fields", async () => {
    const provider = await captureBody("provider_requested", {
      connected_before: "private connected sentinel",
      framework_mode: "private env var sentinel",
      provider_id: "openai",
      source: "auth_dialog",
    })

    expect(provider.properties).toMatchObject({
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(provider.properties?.connected_before).toBeUndefined()
    expect(provider.properties?.framework_mode).toBeUndefined()

    const prompt = await captureBody("ui_prompt_submitted", {
      framework_mode: "private framework sentinel",
      has_agent_parts: "private agent sentinel",
      has_editor_selection: "private editor sentinel",
      has_file_parts: "private file sentinel",
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })

    expect(prompt.properties).toMatchObject({
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    expect(prompt.properties?.framework_mode).toBeUndefined()
    expect(prompt.properties?.has_agent_parts).toBeUndefined()
    expect(prompt.properties?.has_editor_selection).toBeUndefined()
    expect(prompt.properties?.has_file_parts).toBeUndefined()

    const integration = await captureBody("integration_requested", {
      already_configured: "private configured sentinel",
      integration_id: "search",
      provider_id: "openai",
      source: "addons_dialog",
    })

    expect(integration.properties).toMatchObject({
      integration_id: "search",
      provider_id: "openai",
      source: "addons_dialog",
    })
    expect(integration.properties?.already_configured).toBeUndefined()

    const command = await captureBody("ui_command_executed", {
      category: "System",
      command: "docs.open",
      keybind: "private keybind sentinel",
      source: "palette",
    })

    expect(command.properties).toMatchObject({
      category: "System",
      command: "docs.open",
      source: "palette",
    })
    expect(command.properties?.keybind).toBeUndefined()

    const serialized = JSON.stringify([provider, prompt, integration, command])
    expect(serialized).not.toContain("private env var sentinel")
    expect(serialized).not.toContain("private connected sentinel")
    expect(serialized).not.toContain("private framework sentinel")
    expect(serialized).not.toContain("private agent sentinel")
    expect(serialized).not.toContain("private editor sentinel")
    expect(serialized).not.toContain("private file sentinel")
    expect(serialized).not.toContain("private configured sentinel")
    expect(serialized).not.toContain("private keybind sentinel")
  })

  test("drops prototype-named unknown telemetry properties", async () => {
    const body = await captureBody("ui_prompt_submitted", {
      constructor: "private constructor sentinel",
      framework_mode: true,
      hasOwnProperty: "private hasOwnProperty sentinel",
      has_agent_parts: false,
      has_editor_selection: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
      toString: "private toString sentinel",
      type: "prompt",
      valueOf: "private valueOf sentinel",
    })

    expect(body.properties).toMatchObject({
      framework_mode: true,
      has_agent_parts: false,
      has_editor_selection: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    for (const key of ["constructor", "hasOwnProperty", "toString", "valueOf"]) {
      expect(Object.prototype.hasOwnProperty.call(body.properties ?? {}, key)).toBe(false)
    }
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain("private constructor sentinel")
    expect(serialized).not.toContain("private hasOwnProperty sentinel")
    expect(serialized).not.toContain("private toString sentinel")
    expect(serialized).not.toContain("private valueOf sentinel")
  })

  test("classifies durations and errors into fixed buckets", () => {
    expect(Telemetry.durationBucket(100)).toBe("lt_2s")
    expect(Telemetry.durationBucket(2_500)).toBe("2s_10s")
    expect(Telemetry.durationBucket(20_000)).toBe("10s_60s")
    expect(Telemetry.durationBucket(70_000)).toBe("gte_60s")
    expect(Telemetry.durationBucket(Number.NaN)).toBe("unknown")

    expect(Telemetry.errorBucket({ status: 403 })).toBe("auth_rejected")
    expect(Telemetry.errorBucket(new Error("request timed out"))).toBe("timeout")
    expect(Telemetry.errorBucket(new Error("fetch failed ECONNREFUSED"))).toBe("network")
    expect(Telemetry.errorBucket({ status: 502 })).toBe("server")
    expect(Telemetry.errorBucket(new Error("private backend stack trace"))).toBe("unknown")

    expect(Telemetry.toolCountBucket(0)).toBe("0")
    expect(Telemetry.toolCountBucket(1)).toBe("1_3")
    expect(Telemetry.toolCountBucket(3)).toBe("1_3")
    expect(Telemetry.toolCountBucket(4)).toBe("4_7")
    expect(Telemetry.toolCountBucket(7)).toBe("4_7")
    expect(Telemetry.toolCountBucket(8)).toBe("8_plus")
    expect(Telemetry.toolCountBucket(Number.NaN)).toBe("unknown")
  })

  test("buckets nested SDK error wrapper data without exposing raw text", async () => {
    const authStatus = Object.assign(new Error("wrapper message"), {
      data: { message: "ignored raw auth detail sk-nested-secret", statusCode: 401 },
    })
    const serverStatus = {
      data: { message: "ignored raw server detail", status: 503 },
      message: "wrapper message",
    }
    const authMessage = {
      data: { message: "Invalid API key sk-nested-secret" },
      message: "wrapper message",
    }
    const serverMessage = {
      data: { message: "Internal server error private stack" },
      message: "wrapper message",
    }

    expect(Telemetry.errorBucket(authStatus)).toBe("auth_rejected")
    expect(Telemetry.errorBucket(serverStatus)).toBe("server")
    expect(Telemetry.errorBucket(authMessage)).toBe("auth_rejected")
    expect(Telemetry.errorBucket(serverMessage)).toBe("server")

    const body = await captureBody("task_failed", {
      duration_bucket: "lt_2s",
      error_bucket: Telemetry.errorBucket(authMessage),
      framework_mode: true,
      has_agent_parts: false,
      has_file_parts: false,
      mode: "normal",
      provider_id: "agency-swarm",
      raw_error: authMessage.data.message,
    })

    expect(body.properties).toMatchObject({
      error_bucket: "auth_rejected",
      provider_id: "agency-swarm",
    })
    expect(JSON.stringify(body)).not.toContain("sk-nested-secret")
    expect(JSON.stringify(body)).not.toContain("Invalid API key")
  })

  test("buckets custom provider ids", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "provider_auth_configured",
      properties: {
        auth_method: "api",
        provider_id: "internal-client-gateway",
        source: "auth_dialog",
      },
      stateDir: tmp.path,
    })

    expect(output.requests[0].body.properties?.provider_id).toBe("custom")
    expect(JSON.stringify(output.requests[0].body)).not.toContain("internal-client-gateway")
  })

  test("preserves well-known provider ids", async () => {
    for (const provider of ["openrouter", "mistral", "gitlab"]) {
      const body = await captureBody("provider_auth_configured", {
        auth_method: "api",
        provider_id: provider,
        source: "auth_dialog",
      })

      expect(body.properties?.provider_id).toBe(provider)
    }
  })

  test("does not send custom command telemetry", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      command: {
        category: "Plugin",
        keybind: "ctrl+x",
        source: "palette",
        value: "private.plugin.command",
      },
      mode: "command",
      stateDir: tmp.path,
    })

    expect(output.requests).toHaveLength(0)
    expect(JSON.stringify(output.requests)).not.toContain("private.plugin.command")
    expect(JSON.stringify(output.requests)).not.toContain("ctrl+x")
  })

  test("does not send broad command telemetry at the privacy boundary", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      event: "ui_command_executed",
      properties: {
        category: "Provider",
        command: "provider.connect",
        source: "slash",
      },
      stateDir: tmp.path,
    })

    expect(output.captured).toBe(false)
    expect(output.requests).toHaveLength(0)
    expect(JSON.stringify(output.requests)).not.toContain("provider.connect")
  })

  test("tracks docs click command telemetry with a safe command shape", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      command: {
        category: "System",
        source: "palette",
        value: "docs.open",
      },
      mode: "command",
      stateDir: tmp.path,
    })

    expect(output.requests).toHaveLength(1)
    expect(output.requests[0].body.event).toBe("ui_command_executed")
    expect(output.requests[0].body.properties).toMatchObject({
      category: "System",
      command: "docs.open",
      keybind: false,
      source: "palette",
    })
  })

  test("does not send broad slash command telemetry", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      command: {
        category: "Provider",
        source: "slash",
        value: "provider.connect",
      },
      mode: "command",
      stateDir: tmp.path,
    })

    expect(output.requests).toHaveLength(0)
    expect(JSON.stringify(output.requests)).not.toContain("provider.connect")
  })

  test("sanitizes built-in properties through the privacy boundary", async () => {
    await using tmp = await tmpdir()
    const output = await runCompiledTelemetry({
      env: {
        AGENTSWARM_PRODUCT_VERSION: "bad\nprivate product sentinel",
        OPENCODE_CLIENT: "bad\nterminal",
      },
      event: "app_started",
      properties: { entrypoint: "tui" },
      stateDir: tmp.path,
    })

    expect(output.requests[0].body.properties?.terminal).toBeUndefined()
    expect(output.requests[0].body.properties?.product_version).toBeUndefined()
    expect(JSON.stringify(output.requests[0].body)).not.toContain("private product sentinel")
  })
})
