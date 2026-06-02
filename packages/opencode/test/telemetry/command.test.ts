import { afterEach, describe, expect, test } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { captureCommand } from "../../src/telemetry/command"
import { Telemetry } from "../../src/telemetry/telemetry"

const originalFetch = globalThis.fetch

type Captured = {
  body: {
    properties?: Record<string, unknown>
  }
}

function enableTelemetry(stateDir: string) {
  process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST = "1"
  process.env.AGENTSWARM_POSTHOG_API_KEY = "ph_test"
  process.env.AGENTSWARM_POSTHOG_HOST = "https://posthog.example"
  process.env.AGENTSWARM_TELEMETRY_STATE_DIR = stateDir
}

function resetEnv() {
  delete process.env.AGENTSWARM_POSTHOG_API_KEY
  delete process.env.AGENTSWARM_POSTHOG_HOST
  delete process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST
  delete process.env.AGENTSWARM_TELEMETRY_STATE_DIR
}

describe("command telemetry", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    resetEnv()
  })

  test("tracks slash command telemetry without arguments", async () => {
    await using tmp = await tmpdir()
    const requests: Captured[] = []
    enableTelemetry(tmp.path)
    globalThis.fetch = (async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) })
      return new Response(null, { status: 200 })
    }) as typeof fetch

    captureCommand({
      category: "Provider",
      source: "slash",
      value: "/auth openai",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].body.properties).toMatchObject({
      category: "Provider",
      command: "auth",
      keybind: false,
      source: "slash",
    })
    expect(JSON.stringify(requests)).not.toContain("openai")
  })

  test("does not send non-allowlisted slash command names", async () => {
    await using tmp = await tmpdir()
    const requests: Captured[] = []
    enableTelemetry(tmp.path)
    globalThis.fetch = (async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) })
      return new Response(null, { status: 200 })
    }) as typeof fetch

    captureCommand({
      category: "Prompt",
      source: "slash",
      value: "/acme-deploy production",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(0)
    expect(JSON.stringify(requests)).not.toContain("acme-deploy")
    expect(JSON.stringify(requests)).not.toContain("production")
  })

  test("tracks commit slash command telemetry without arguments", async () => {
    await using tmp = await tmpdir()
    const requests: Captured[] = []
    enableTelemetry(tmp.path)
    globalThis.fetch = (async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) })
      return new Response(null, { status: 200 })
    }) as typeof fetch

    captureCommand({
      category: "System",
      source: "slash",
      value: "/commit private args",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].body.properties).toMatchObject({
      category: "System",
      command: "commit",
      keybind: false,
      source: "slash",
    })
    expect(JSON.stringify(requests)).not.toContain("private")
    expect(JSON.stringify(requests)).not.toContain("args")
  })

  test("tracks docs open command telemetry", async () => {
    await using tmp = await tmpdir()
    const requests: Captured[] = []
    enableTelemetry(tmp.path)
    globalThis.fetch = (async (_url, init) => {
      requests.push({ body: JSON.parse(String(init?.body)) })
      return new Response(null, { status: 200 })
    }) as typeof fetch

    captureCommand({
      category: "System",
      keybind: "help",
      source: "palette",
      value: "docs.open",
    })
    await Telemetry.flush()

    expect(requests).toHaveLength(1)
    expect(requests[0].body.properties).toMatchObject({
      category: "System",
      command: "docs.open",
      keybind: true,
      source: "palette",
    })
  })
})
