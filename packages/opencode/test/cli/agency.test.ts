import { describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { connectOptions, runtimeOptions } from "../../src/cli/cmd/agency"

describe("agency", () => {
  test("connect options clear remembered agency state", () => {
    expect(connectOptions("http://127.0.0.1:9000")).toEqual({
      baseURL: "http://127.0.0.1:9000",
      discoveryTimeoutMs: AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS,
      agency: null,
      recipientAgent: null,
      recipient_agent: null,
    })
  })

  test("runtime options honor snake_case config keys", () => {
    expect(
      runtimeOptions(
        {},
        {
          base_url: "https://proxy.example.com/v1/",
          discovery_timeout_ms: 12000,
          token: "config-token",
        },
        {
          type: "api",
          key: "auth-token",
        },
      ),
    ).toEqual({
      baseURL: "https://proxy.example.com/v1",
      token: "auth-token",
      timeout: 12000,
    })
  })
})
