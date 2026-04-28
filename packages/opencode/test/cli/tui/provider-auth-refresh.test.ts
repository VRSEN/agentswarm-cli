import { describe, expect, test } from "bun:test"
import { hasActiveSession, refreshAfterProviderAuth } from "../../../src/cli/cmd/tui/util/provider-auth-refresh"

describe("provider auth refresh", () => {
  test("detects active session statuses", () => {
    expect(hasActiveSession({})).toBe(false)
    expect(hasActiveSession({ ses_1: { type: "idle" } })).toBe(false)
    expect(hasActiveSession({ ses_1: { type: "busy" } })).toBe(true)
  })

  test("defers instance disposal while a session is active", async () => {
    const calls: string[] = []

    await refreshAfterProviderAuth({
      sessionStatus: { ses_1: { type: "busy" } },
      dispose: async () => {
        calls.push("dispose")
      },
      bootstrap: async () => {
        calls.push("bootstrap")
      },
    })

    expect(calls).toEqual(["bootstrap"])
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
})
