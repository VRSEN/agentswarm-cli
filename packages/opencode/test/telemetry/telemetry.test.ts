import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Telemetry } from "../../src/telemetry/telemetry"

function enableTelemetry(input: { key?: string; host?: string; stateDir: string }) {
  process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST = "1"
  process.env.AGENTSWARM_POSTHOG_API_KEY = input.key ?? "ph_test"
  process.env.AGENTSWARM_POSTHOG_HOST = input.host ?? "https://posthog.example"
  process.env.AGENTSWARM_TELEMETRY_STATE_DIR = input.stateDir
  delete process.env.AGENTSWARM_TELEMETRY
}

function resetEnv() {
  delete process.env.AGENTSWARM_POSTHOG_API_KEY
  delete process.env.AGENTSWARM_POSTHOG_HOST
  delete process.env.AGENTSWARM_TELEMETRY
  delete process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST
  delete process.env.AGENTSWARM_TELEMETRY_STATE_DIR
}

function asFetch(fn: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  return fn as unknown as typeof fetch
}

describe("Telemetry", () => {
  afterEach(() => {
    Telemetry.resetForTests()
    resetEnv()
  })

  test("sends allowlisted product analytics without prompt content", async () => {
    await using tmp = await tmpdir()
    const requests: { url: string; body: any }[] = []
    enableTelemetry({ stateDir: tmp.path })
    Telemetry.setFetchForTests(
      asFetch(async (url, init) => {
        requests.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
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
      command: "run",
      framework_mode: true,
      has_file_parts: true,
      mode: "normal",
      provider_id: "agency-swarm",
      type: "prompt",
    })
    expect(JSON.stringify(requests[0].body)).not.toContain("secret prompt")
  })

  test("does not send when opted out", async () => {
    await using tmp = await tmpdir()
    const requests: unknown[] = []
    enableTelemetry({ stateDir: tmp.path })
    process.env.AGENTSWARM_TELEMETRY = "false"
    Telemetry.setFetchForTests(
      asFetch(async () => {
        requests.push({})
        return new Response(null, { status: 200 })
      }),
    )

    await expect(Telemetry.capture("app_started", { entrypoint: "tui" })).resolves.toBe(false)
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
  })

  test("reuses the anonymous install id from state", async () => {
    await using tmp = await tmpdir()
    const requests: { body: any }[] = []
    enableTelemetry({ stateDir: tmp.path })
    Telemetry.setFetchForTests(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) })
        return new Response(null, { status: 200 })
      }),
    )

    await Telemetry.capture("app_started", { entrypoint: "tui" })
    await Telemetry.flush()
    Telemetry.resetForTests()
    enableTelemetry({ stateDir: tmp.path })
    Telemetry.setFetchForTests(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) })
        return new Response(null, { status: 200 })
      }),
    )
    await Telemetry.capture("app_started", { entrypoint: "tui" })
    await Telemetry.flush()

    expect(requests).toHaveLength(2)
    expect(requests[1].body.distinct_id).toBe(requests[0].body.distinct_id)
    expect(await Bun.file(path.join(tmp.path, "telemetry.json")).json()).toEqual({
      installID: requests[0].body.distinct_id,
    })
  })

  test("captures provider auth setup without credential material", async () => {
    await using tmp = await tmpdir()
    const requests: { body: any }[] = []
    enableTelemetry({ stateDir: tmp.path })
    Telemetry.setFetchForTests(
      asFetch(async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) })
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
})
