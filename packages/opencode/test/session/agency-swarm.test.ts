import { afterEach, describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"

describe("session.agency-swarm", () => {
  const originalDiscover = AgencySwarmAdapter.discover

  afterEach(() => {
    AgencySwarmAdapter.discover = originalDiscover
  })

  test("optionsFromProvider applies defaults", () => {
    const options = SessionAgencySwarm.optionsFromProvider(undefined)

    expect(options.baseURL).toBe(AgencySwarmAdapter.DEFAULT_BASE_URL)
    expect(options.discoveryTimeoutMs).toBe(AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS)
    expect(options.agency).toBeUndefined()
  })

  test("resolveAgency returns configured agency without discovery", async () => {
    let called = false
    AgencySwarmAdapter.discover = (async () => {
      called = true
      return { agencies: [], rawOpenAPI: {} }
    }) as typeof AgencySwarmAdapter.discover

    const agency = await SessionAgencySwarm.resolveAgency({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      discoveryTimeoutMs: 5000,
    })

    expect(agency).toBe("builder")
    expect(called).toBeFalse()
  })

  test("resolveAgency uses single discovered agency", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [{ id: "builder", name: "Builder", metadata: {} }],
      rawOpenAPI: {},
    })) as typeof AgencySwarmAdapter.discover

    const agency = await SessionAgencySwarm.resolveAgency({
      baseURL: "http://127.0.0.1:8000",
      discoveryTimeoutMs: 5000,
    })

    expect(agency).toBe("builder")
  })

  test("normalizeCallerAgent converts string None to null", () => {
    expect(SessionAgencySwarm.normalizeCallerAgent("None")).toBeNull()
    expect(SessionAgencySwarm.normalizeCallerAgent("Main")).toBe("Main")
    expect(SessionAgencySwarm.normalizeCallerAgent(undefined)).toBeUndefined()
  })

  test("extractFunctionCallOutputs pulls tool outputs from messages payload", () => {
    const outputs = SessionAgencySwarm.extractFunctionCallOutputs([
      { type: "message", id: "m1" },
      { type: "function_call_output", call_id: "call_1", output: { value: 42 } },
      { type: "function_call_output", call_id: "call_2", output: "done" },
    ])

    expect(outputs).toEqual([
      { callID: "call_1", output: '{\n  "value": 42\n}' },
      { callID: "call_2", output: "done" },
    ])
  })

  test("resolveAgency throws when multiple agencies are discovered", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [
        { id: "builder", name: "Builder", metadata: {} },
        { id: "research", name: "Research", metadata: {} },
      ],
      rawOpenAPI: {},
    })) as typeof AgencySwarmAdapter.discover

    await expect(
      SessionAgencySwarm.resolveAgency({
        baseURL: "http://127.0.0.1:8000",
        discoveryTimeoutMs: 5000,
      }),
    ).rejects.toThrow("Multiple agencies")
  })
})
