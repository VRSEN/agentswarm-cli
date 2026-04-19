/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { createAgencySwarmConnectionMonitor } from "../../../src/cli/cmd/tui/context/agency-swarm-connection"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("agency-swarm connection monitor", () => {
  afterEach(() => {
    mock.restore()
  })

  test("opens the connect dialog after consecutive health check failures", async () => {
    const openConnectDialog = mock(() => {})
    let serverAlive = true
    const [frameworkMode, setFrameworkMode] = createSignal(true)
    let state!: ReturnType<typeof createAgencySwarmConnectionMonitor>

    const Harness = () => {
      state = createAgencySwarmConnectionMonitor({
        frameworkMode,
        config: () => ({
          baseURL: "http://127.0.0.1:8000",
          timeoutMs: 10,
        }),
        openConnectDialog,
        idleIntervalMs: 5,
        recoveredIntervalMs: 15,
        fetchImpl: async () => {
          if (serverAlive) {
            return new Response("{}", {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            })
          }
          throw new Error("connect ECONNREFUSED 127.0.0.1:8000")
        },
      })
      return <box />
    }

    await testRender(() => <Harness />)
    await Bun.sleep(15)
    await flushEffects()

    expect(state.status()).toBe("connected")
    expect(state.requiresReconnect()).toBe(false)

    serverAlive = false
    await Bun.sleep(20)
    await flushEffects()

    expect(state.status()).toBe("disconnected")
    expect(state.failureCount()).toBeGreaterThanOrEqual(2)
    expect(state.requiresReconnect()).toBe(true)
    expect(openConnectDialog).toHaveBeenCalledTimes(1)

    setFrameworkMode(false)
    await flushEffects()
  })
})
