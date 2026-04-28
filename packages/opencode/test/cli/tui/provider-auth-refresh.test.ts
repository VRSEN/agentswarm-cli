import { describe, expect, test } from "bun:test"
import {
  hasActiveSession,
  refreshAfterActiveSessionsIdle,
  refreshAfterProviderAuth,
} from "../../../src/cli/cmd/tui/util/provider-auth-refresh"

describe("provider auth refresh", () => {
  test("detects active session statuses", () => {
    expect(hasActiveSession({})).toBe(false)
    expect(hasActiveSession({ ses_1: { type: "idle" } })).toBe(false)
    expect(hasActiveSession({ ses_1: { type: "busy" } })).toBe(true)
  })

  test("defers instance disposal while a session is active", async () => {
    const calls: string[] = []
    let deferred: (() => Promise<void>) | undefined
    const statuses = [{ ses_1: { type: "busy" } }, { ses_1: { type: "idle" } }]

    await refreshAfterProviderAuth({
      sessionStatus: () => statuses[0] ?? { ses_1: { type: "idle" } },
      dispose: async () => {
        calls.push("dispose")
      },
      bootstrap: async () => {
        calls.push("bootstrap")
      },
      defer: (task) => {
        deferred = task
      },
      sleep: async () => {
        calls.push("sleep")
        statuses.shift()
      },
    })

    expect(calls).toEqual(["bootstrap"])
    await deferred?.()
    expect(calls).toEqual(["bootstrap", "sleep", "dispose", "bootstrap"])
  })

  test("reloads the instance when all sessions are idle", async () => {
    const calls: string[] = []

    await refreshAfterProviderAuth({
      sessionStatus: { ses_1: { type: "idle" } },
      dispose: async () => {
        calls.push("dispose")
      },
      bootstrap: async () => {
        calls.push("bootstrap")
      },
    })

    expect(calls).toEqual(["dispose", "bootstrap"])
  })

  test("waits until active sessions are idle before refreshing the instance", async () => {
    const calls: string[] = []
    const statuses = [{ ses_1: { type: "busy" } }, { ses_1: { type: "busy" } }, { ses_1: { type: "idle" } }]

    await refreshAfterActiveSessionsIdle({
      sessionStatus: () => statuses[0] ?? { ses_1: { type: "idle" } },
      dispose: async () => {
        calls.push("dispose")
      },
      bootstrap: async () => {
        calls.push("bootstrap")
      },
      sleep: async () => {
        calls.push("sleep")
        statuses.shift()
      },
    })

    expect(calls).toEqual(["sleep", "sleep", "dispose", "bootstrap"])
  })
})
