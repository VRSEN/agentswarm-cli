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
    const openConnectDialog = mock(() => true)
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

  test("retries the reconnect dialog after a blocked open", async () => {
    let dialogBlocked = true
    const openConnectDialog = mock(() => {
      if (dialogBlocked) return false
      return true
    })
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
        failureThreshold: 1,
        idleIntervalMs: 20,
        recoveredIntervalMs: 20,
        fetchImpl: async () => {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8000")
        },
      })
      return <box />
    }

    await testRender(() => <Harness />)
    await Bun.sleep(5)
    await flushEffects()

    expect(state.status()).toBe("disconnected")
    expect(state.requiresReconnect()).toBe(true)
    expect(openConnectDialog).toHaveBeenCalledTimes(1)

    dialogBlocked = false
    await Bun.sleep(25)
    await flushEffects()

    expect(openConnectDialog).toHaveBeenCalledTimes(2)

    setFrameworkMode(false)
    await flushEffects()
  })
})
