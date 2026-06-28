import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Telemetry } from "../../src/telemetry/telemetry"
import { captureCommand } from "../../src/telemetry/command"

const originalClient = process.env.OPENCODE_CLIENT
const originalEnableTelemetry = process.env.ENABLE_TELEMETRY
const originalTelemetry = process.env.OPENCODE_TELEMETRY
const originalFetch = globalThis.fetch

type Captured = {
  api_key?: unknown
  distinct_id?: unknown
  event?: unknown
  properties?: Record<string, unknown>
}

function enableTelemetry(input: { key?: string; host?: string; stateDir: string }) {
  process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST = "1"
  process.env.AGENTSWARM_POSTHOG_API_KEY = input.key ?? "ph_test"
  process.env.AGENTSWARM_POSTHOG_HOST = input.host ?? "https://posthog.example"
  process.env.AGENTSWARM_TELEMETRY_STATE_DIR = input.stateDir
  delete process.env.AGENTSWARM_TELEMETRY
  delete process.env.ENABLE_TELEMETRY
  delete process.env.OPEN_SWARM_TELEMETRY
  delete process.env.OPENCODE_TELEMETRY
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

function asFetch(fn: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  return fn as unknown as typeof fetch
}

function useFetch(next: typeof fetch) {
  globalThis.fetch = next
}

async function captureBody(event: Parameters<typeof Telemetry.capture>[0], properties: Record<string, unknown>) {
  await using tmp = await tmpdir()
  const requests: { body: Captured }[] = []
  enableTelemetry({ stateDir: tmp.path })
  useFetch(
    asFetch(async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) as Captured })
      return new Response(null, { status: 200 })
    }),
  )

  await Telemetry.capture(event, properties)
  await Telemetry.flush()

  expect(requests).toHaveLength(1)
  return requests[0].body
}

describe("Telemetry", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    resetEnv()
  })

  test("sends allowlisted product analytics without prompt content", async () => {
    await using tmp = await tmpdir()
    const requests: { url: string; body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (url, init) => {
        requests.push({
          url: String(url),
          body: JSON.parse(String(init?.body)) as Captured,
        })
        return new Response(null, { status: 200 })
      }),
    )

    await expect(
      Telemetry.capture("ui_prompt_submitted", {
        command: "run",
        framework_mode: true,
        has_file_parts: true,
        message: "secret prompt",
        mode: "normal",
        provider_id: "agency-swarm",
        type: "prompt",
      }),
    ).resolves.toBe(true)
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe("https://posthog.example/i/v0/e/")
    expect(requests[0].body.event).toBe("ui_prompt_submitted")
    expect(requests[0].body.api_key).toBe("ph_test")
    expect(requests[0].body.distinct_id).toBeTruthy()
    expect(requests[0].body.properties).toMatchObject({
      $process_person_profile: false,
      framework_mode: true,
      has_file_parts: true,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    expect(requests[0].body.properties?.command).toBeUndefined()
    expect(JSON.stringify(requests[0].body)).not.toContain("secret prompt")
  })

  test("keeps compiled telemetry key when runtime key env is set", async () => {
    await using tmp = await tmpdir()
    const root = path.resolve(import.meta.dir, "../..")
    const entry = path.join(tmp.path, "compiled-telemetry.ts")
    const outdir = path.join(tmp.path, "out")
    await Bun.write(
      entry,
      [
        `import { Telemetry } from ${JSON.stringify(path.join(root, "src/telemetry/telemetry.ts"))}`,
        "const requests = []",
        "globalThis.fetch = async (url, init) => {",
        "  requests.push({ url: String(url), body: JSON.parse(String(init?.body)) })",
        "  return new Response(null, { status: 200 })",
        "}",
        "const captured = await Telemetry.capture('app_started', { entrypoint: 'tui' })",
        "await Telemetry.flush()",
        "console.log(JSON.stringify({ captured, requests }))",
      ].join("\n"),
    )

    const result = await Bun.build({
      entrypoints: [entry],
      outdir,
      format: "esm",
      target: "bun",
      tsconfig: path.join(root, "tsconfig.json"),
      define: {
        AGENTSWARM_POSTHOG_API_KEY: JSON.stringify("ph_compiled"),
        AGENTSWARM_POSTHOG_HOST: JSON.stringify("https://compiled.example"),
      },
    })
    if (!result.success) throw new Error(result.logs.map((log) => log.message).join("\n"))

    const proc = Bun.spawn([process.execPath, path.join(outdir, "compiled-telemetry.js")], {
      cwd: root,
      env: {
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
        AGENTSWARM_TELEMETRY_ALLOW_TEST: "1",
        BUN_TEST: "1",
        AGENTSWARM_POSTHOG_API_KEY: "ph_runtime",
        AGENTSWARM_POSTHOG_HOST: "https://runtime.example",
        AGENTSWARM_TELEMETRY_STATE_DIR: tmp.path,
      },
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
    const output = JSON.parse(stdout) as {
      captured: boolean
      requests: Array<{ url: string; body: { api_key?: unknown } }>
    }
    expect(output.captured).toBe(true)
    expect(output.requests[0].url).toBe("https://compiled.example/i/v0/e/")
    expect(output.requests[0].body.api_key).toBe("ph_compiled")
  })

  test("does not send when opted out", async () => {
    await using tmp = await tmpdir()
    const requests: unknown[] = []
    enableTelemetry({ stateDir: tmp.path })
    process.env.AGENTSWARM_TELEMETRY = "false"
    useFetch(
      asFetch(async () => {
        requests.push({})
        return new Response(null, { status: 200 })
      }),
    )

    await expect(Telemetry.capture("app_started", { entrypoint: "tui" })).resolves.toBe(false)
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
  })

  test("does not send when OpenSwarm opt-out is set", async () => {
    await using tmp = await tmpdir()
    const requests: unknown[] = []
    enableTelemetry({ stateDir: tmp.path })
    process.env.OPEN_SWARM_TELEMETRY = "0"
    useFetch(
      asFetch(async () => {
        requests.push({})
        return new Response(null, { status: 200 })
      }),
    )

    await expect(Telemetry.capture("app_started", { entrypoint: "tui" })).resolves.toBe(false)
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
  })

  test("does not send when generic telemetry opt-out is set", async () => {
    await using tmp = await tmpdir()
    const requests: unknown[] = []
    enableTelemetry({ stateDir: tmp.path })
    process.env.ENABLE_TELEMETRY = "0"
    useFetch(
      asFetch(async () => {
        requests.push({})
        return new Response(null, { status: 200 })
      }),
    )

    await expect(Telemetry.capture("app_started", { entrypoint: "tui" })).resolves.toBe(false)
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
  })

  test("uses the anonymous install id from state", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    await Bun.write(path.join(tmp.path, "telemetry.json"), JSON.stringify({ installID: "known-install-id" }))
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )
    await Telemetry.capture("app_started", { entrypoint: "tui" })
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].body.distinct_id).toBe("known-install-id")
    expect(await Bun.file(path.join(tmp.path, "telemetry.json")).json()).toEqual({
      installID: "known-install-id",
    })
  })

  test("flush waits for fire-and-forget capture setup", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    const capture = Telemetry.capture("app_started", { entrypoint: "tui" })
    await Telemetry.flush()
    await capture

    expect(requests).toHaveLength(1)
    expect(requests[0].body.event).toBe("app_started")
  })

  test("flush can be bounded for shutdown", async () => {
    await using tmp = await tmpdir()
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(
        (_url, init) =>
          new Promise<Response>((resolve) => {
            const timeout = setTimeout(() => resolve(new Response(null, { status: 200 })), 50)
            init?.signal?.addEventListener(
              "abort",
              () => {
                clearTimeout(timeout)
                resolve(new Response(null, { status: 499 }))
              },
              { once: true },
            )
          }),
      ),
    )

    await Telemetry.capture("app_started", { entrypoint: "tui" })
    const started = Date.now()
    await Telemetry.flush({ timeoutMs: 1 })

    expect(Date.now() - started).toBeLessThan(40)
  })

  test("bounded flush aborts pending telemetry requests", async () => {
    await using tmp = await tmpdir()
    enableTelemetry({ stateDir: tmp.path })
    let aborted = false
    let enter!: () => void
    const entered = new Promise<void>((resolve) => {
      enter = resolve
    })
    useFetch(
      asFetch((_url, init) => {
        enter()
        return new Promise<Response>((resolve) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              aborted = true
              resolve(new Response(null, { status: 499 }))
            },
            { once: true },
          )
        })
      }),
    )

    await Telemetry.capture("app_started", { entrypoint: "tui" })
    await entered
    await Telemetry.flush({ timeoutMs: 1 })

    expect(aborted).toBe(true)
  })

  test("captures provider auth setup without credential material", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    await Telemetry.capture("provider_auth_configured", {
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
      token: "sk-secret",
    })
    await Telemetry.flush()

    expect(requests[0].body.event).toBe("provider_auth_configured")
    expect(requests[0].body.properties).toMatchObject({
      $process_person_profile: false,
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(JSON.stringify(requests[0].body)).not.toContain("sk-secret")
  })

  test("captures the approved trust-safe event properties", async () => {
    const cases: Array<{
      event: Parameters<typeof Telemetry.capture>[0]
      properties: Record<string, unknown>
      expected: Record<string, unknown>
    }> = [
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
        env_var: "OPENAI_API_KEY=sk-env-secret",
        error_text: "Invalid API key: sk-error-secret",
        file_path: "/Users/example/private.ts",
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
        tool_input: "private tool input",
        tool_output: "private tool output",
      })

      expect(body.event).toBe(item.event)
      expect(body.properties).toMatchObject(item.expected)
      const serialized = JSON.stringify(body)
      expect(serialized).not.toContain("secret prompt text")
      expect(serialized).not.toContain("OPENAI_API_KEY")
      expect(serialized).not.toContain("sk-env-secret")
      expect(serialized).not.toContain("sk-error-secret")
      expect(serialized).not.toContain("msg_secret")
      expect(serialized).not.toContain("/Users/example/private.ts")
      expect(serialized).not.toContain("private conversation content")
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
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    await Telemetry.capture("provider_auth_configured", {
      auth_method: "api",
      provider_id: "internal-client-gateway",
      source: "auth_dialog",
    })
    await Telemetry.flush()

    expect(requests[0].body.properties?.provider_id).toBe("custom")
    expect(JSON.stringify(requests[0].body)).not.toContain("internal-client-gateway")
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
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    captureCommand({
      category: "Plugin",
      keybind: "ctrl+x",
      source: "palette",
      value: "private.plugin.command",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
    expect(JSON.stringify(requests)).not.toContain("private.plugin.command")
    expect(JSON.stringify(requests)).not.toContain("ctrl+x")
  })

  test("does not send broad command telemetry at the privacy boundary", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    await expect(
      Telemetry.capture("ui_command_executed", {
        category: "Provider",
        command: "provider.connect",
        source: "slash",
      }),
    ).resolves.toBe(false)
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
    expect(JSON.stringify(requests)).not.toContain("provider.connect")
  })

  test("tracks docs click command telemetry with a safe command shape", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    captureCommand({
      category: "System",
      source: "palette",
      value: "docs.open",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].body.event).toBe("ui_command_executed")
    expect(requests[0].body.properties).toMatchObject({
      category: "System",
      command: "docs.open",
      keybind: false,
      source: "palette",
    })
  })

  test("does not send broad slash command telemetry", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    captureCommand({
      category: "Provider",
      source: "slash",
      value: "provider.connect",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
    expect(JSON.stringify(requests)).not.toContain("provider.connect")
  })

  test("sanitizes built-in properties through the privacy boundary", async () => {
    await using tmp = await tmpdir()
    const requests: { body: Captured }[] = []
    enableTelemetry({ stateDir: tmp.path })
    process.env.OPENCODE_CLIENT = "bad\nterminal"
    useFetch(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) as Captured })
        return new Response(null, { status: 200 })
      }),
    )

    await Telemetry.capture("app_started", { entrypoint: "tui" })
    await Telemetry.flush()

    expect(requests[0].body.properties?.terminal).toBeUndefined()
  })
})
