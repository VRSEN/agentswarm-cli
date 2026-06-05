import { describe, expect, test } from "bun:test"
import { recentConnectedWorkspaces } from "../../../../src/cli/cmd/tui/component/dialog-workspace-create"

describe("recentConnectedWorkspaces", () => {
  test("returns connected workspaces sorted by time used", () => {
    const workspaces = [
      { id: "wrk_a", name: "alpha", timeUsed: 700 },
      { id: "wrk_b", name: "beta", timeUsed: 800 },
      { id: "wrk_c", name: "gamma", timeUsed: 400 },
      { id: "wrk_d", name: "delta", timeUsed: 300 },
      { id: "wrk_e", name: "epsilon", timeUsed: 200 },
    ]
    const status = {
      wrk_a: "connected",
      wrk_b: "disconnected",
      wrk_c: "error",
      wrk_d: "connected",
      wrk_e: "connected",
    } as const

    const { recent } = recentConnectedWorkspaces({
      workspaces,
      status: (workspaceID) => status[workspaceID as keyof typeof status],
    })

    expect(recent.map((workspace) => workspace.id)).toEqual(["wrk_a", "wrk_d", "wrk_e"])
  })

  test("omits the current workspace before limiting recent targets", () => {
    const workspaces = [
      { id: "wrk_current", name: "current", timeUsed: 900 },
      { id: "wrk_a", name: "alpha", timeUsed: 800 },
      { id: "wrk_b", name: "beta", timeUsed: 700 },
      { id: "wrk_c", name: "gamma", timeUsed: 600 },
    ]
    const { recent, hasMore } = recentConnectedWorkspaces({
      workspaces,
      status: () => "connected",
      limit: 3,
      omitWorkspaceID: "wrk_current",
    })

    expect(recent.map((workspace) => workspace.id)).toEqual(["wrk_a", "wrk_b", "wrk_c"])
    expect(hasMore).toBe(false)
  })
})
