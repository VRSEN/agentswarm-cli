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

  test("optionsFromProvider maps supported FastAPI request options", () => {
    const options = SessionAgencySwarm.optionsFromProvider({
      id: "agency-swarm",
      name: "Agency Swarm",
      source: "config",
      env: [],
      models: {},
      options: {
        baseURL: "http://127.0.0.1:8080",
        agency: "builder",
        recipientAgent: "Planner",
        additionalInstructions: "reply with short updates",
        userContext: {
          tenant: "acme",
        },
        fileIDs: ["file_1", "file_2"],
        generateChatName: true,
        clientConfig: {
          base_url: "https://proxy.example.com/v1",
        },
        discoveryTimeoutMs: 12000,
      },
    })

    expect(options.baseURL).toBe("http://127.0.0.1:8080")
    expect(options.agency).toBe("builder")
    expect(options.recipientAgent).toBe("Planner")
    expect(options.additionalInstructions).toBe("reply with short updates")
    expect(options.userContext).toEqual({ tenant: "acme" })
    expect(options.fileIDs).toEqual(["file_1", "file_2"])
    expect(options.generateChatName).toBeTrue()
    expect(options.clientConfig).toEqual({ base_url: "https://proxy.example.com/v1" })
    expect(options.discoveryTimeoutMs).toBe(12000)
  })

  test("resolveAgency uses single discovered agency", async () => {
    AgencySwarmAdapter.discover = (async () => ({
      agencies: [{ id: "builder", name: "Builder", agents: [], metadata: {} }],
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
        { id: "builder", name: "Builder", agents: [], metadata: {} },
        { id: "research", name: "Research", agents: [], metadata: {} },
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
