import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Telemetry } from "../../src/telemetry/telemetry"
import { captureCommand } from "../../src/telemetry/command"

const originalClient = process.env.OPENCODE_CLIENT
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
  delete process.env.OPEN_SWARM_TELEMETRY
}

function resetEnv() {
  delete process.env.AGENTSWARM_POSTHOG_API_KEY
  delete process.env.AGENTSWARM_POSTHOG_HOST
  delete process.env.AGENTSWARM_TELEMETRY
  delete process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST
  delete process.env.AGENTSWARM_TELEMETRY_STATE_DIR
  delete process.env.OPEN_SWARM_TELEMETRY
  if (originalClient === undefined) delete process.env.OPENCODE_CLIENT
  else process.env.OPENCODE_CLIENT = originalClient
}

function asFetch(fn: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  return fn as unknown as typeof fetch
}

function useFetch(next: typeof fetch) {
  globalThis.fetch = next
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
      framework_mode: true,
      has_file_parts: true,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    expect(requests[0].body.properties?.command).toBeUndefined()
    expect(JSON.stringify(requests[0].body)).not.toContain("secret prompt")
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
      auth_method: "api",
      framework_mode: true,
      provider_id: "openai",
      source: "auth_dialog",
    })
    expect(JSON.stringify(requests[0].body)).not.toContain("sk-secret")
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
  })

  test("does not send externally registered command telemetry for colliding values", async () => {
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
      builtin: false,
      category: "Plugin",
      source: "palette",
      value: "provider.auth",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
  })

  test("tracks built-in slash command source without raw slash names", async () => {
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
      value: "provider.addons",
    })
    await Telemetry.flush()

    expect(requests[0].body.event).toBe("ui_command_executed")
    expect(requests[0].body.properties).toMatchObject({
      category: "Provider",
      command: "provider.addons",
      source: "slash",
    })
    expect(requests[0].body.properties?.slash).toBeUndefined()
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
