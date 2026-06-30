/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { Global } from "@opencode-ai/core/global"
import { tmpdir } from "../../../fixture/fixture"
import { directory, json, mount, wait } from "./sync-fixture"
import type { GlobalEvent, QuestionRequest } from "@opencode-ai/sdk/v2"

function branchEvent(branch: string, workspace?: string): GlobalEvent {
  return {
    directory: "/tmp/other",
    project: "proj_test",
    workspace,
    payload: {
      id: `evt_vcs_${branch}`,
      type: "vcs.branch.updated",
      properties: { branch },
    },
  }
}

function question(id: string, sessionID: string): QuestionRequest {
  return {
    id,
    sessionID,
    questions: [
      {
        question: "Switch to Build?",
        header: "Plan done",
        options: [
          { label: "Yes", description: "Switch to Build." },
          { label: "No", description: "Stay in Plan." },
        ],
        multiple: false,
      },
    ],
    tool: {
      messageID: "msg_plan_exit",
      callID: `call_${id}`,
    },
  }
}

function questionAsked(request: QuestionRequest, workspace?: string): GlobalEvent {
  return {
    directory,
    project: "proj_test",
    workspace,
    payload: {
      id: `evt_${request.id}`,
      type: "question.asked",
      properties: request,
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe("tui sync", () => {
  test("refresh scopes sessions by default and lists project sessions when disabled", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, kv, sync, session } = await mount()

    try {
      expect(kv.get("session_directory_filter_enabled", true)).toBe(true)
      expect(session.at(-1)?.searchParams.get("scope")).toBeNull()
      expect(session.at(-1)?.searchParams.get("path")).toBe("packages/opencode")

      kv.set("session_directory_filter_enabled", false)
      await sync.session.refresh()

      expect(session.at(-1)?.searchParams.get("scope")).toBe("project")
      expect(session.at(-1)?.searchParams.get("path")).toBeNull()
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("vcs branch updates only apply for the active workspace", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, emit, project, sync } = await mount()

    try {
      expect(sync.data.vcs?.branch).toBe("main")

      project.workspace.set("ws_a")
      emit(branchEvent("other", "ws_b"))
      await Bun.sleep(30)

      expect(sync.data.vcs?.branch).toBe("main")

      emit(branchEvent("feature", "ws_a"))
      await wait(() => sync.data.vcs?.branch === "feature")

      expect(sync.data.vcs?.branch).toBe("feature")
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("question sync prunes stale local questions without crossing workspace or live-event boundaries", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")

    const sessionID = "ses_plan"
    const otherSessionID = "ses_other"
    const stale = question("que_stale", sessionID)
    const live = question("que_live", sessionID)
    const other = question("que_other", otherSessionID)
    const session = {
      id: sessionID,
      title: "Plan",
      time: { created: 0, updated: 0 },
      version: "1.14.42",
      directory,
      projectID: "proj_test",
      workspaceID: "ws_a",
    }
    let questionCalls = 0
    const pending = deferred<Response>()
    const { app, emit, project, sync } = await mount((url) => {
      if (url.pathname === "/question") {
        questionCalls += 1
        if (questionCalls === 1) return json([])
        return pending.promise
      }
      if (url.pathname === `/session/${sessionID}`) return json(session)
      if (url.pathname === `/session/${sessionID}/messages`) return json([])
      if (url.pathname === `/session/${sessionID}/todo`) return json([])
      if (url.pathname === `/session/${sessionID}/diff`) return json([])
      if (url.pathname === "/session") return json([session])
      return undefined
    })

    try {
      emit(questionAsked(stale, "ws_a"))
      emit(questionAsked(other, "ws_b"))
      await wait(() => (sync.data.question[sessionID] ?? []).some((item) => item.id === stale.id))
      await wait(() => (sync.data.question[otherSessionID] ?? []).some((item) => item.id === other.id))

      project.workspace.set("ws_a")
      const synced = sync.session.sync(sessionID)
      await wait(() => questionCalls === 2)

      emit(questionAsked(live, "ws_a"))
      await wait(() => (sync.data.question[sessionID] ?? []).some((item) => item.id === live.id))

      pending.resolve(json([]))
      await synced

      expect((sync.data.question[sessionID] ?? []).map((item) => item.id)).toEqual([live.id])
      expect((sync.data.question[otherSessionID] ?? []).map((item) => item.id)).toEqual([other.id])
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("question sync preserves local questions when recovery returns no data", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")

    const sessionID = "ses_plan"
    const active = question("que_active", sessionID)
    const session = {
      id: sessionID,
      title: "Plan",
      time: { created: 0, updated: 0 },
      version: "1.14.42",
      directory,
      projectID: "proj_test",
      workspaceID: "ws_a",
    }
    let questionCalls = 0
    const { app, emit, project, sync } = await mount((url) => {
      if (url.pathname === "/question") {
        questionCalls += 1
        if (questionCalls === 1) return json([])
        return new Response("temporary outage", { status: 503, statusText: "Service Unavailable" })
      }
      if (url.pathname === `/session/${sessionID}`) return json(session)
      if (url.pathname === `/session/${sessionID}/messages`) return json([])
      if (url.pathname === `/session/${sessionID}/todo`) return json([])
      if (url.pathname === `/session/${sessionID}/diff`) return json([])
      if (url.pathname === "/session") return json([session])
      return undefined
    })

    try {
      emit(questionAsked(active, "ws_a"))
      await wait(() => (sync.data.question[sessionID] ?? []).some((item) => item.id === active.id))

      project.workspace.set("ws_a")
      await sync.session.sync(sessionID)

      expect(questionCalls).toBe(2)
      expect((sync.data.question[sessionID] ?? []).map((item) => item.id)).toEqual([active.id])
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("question sync does not let a stale response resurrect a pruned question", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")

    const sessionID = "ses_plan"
    const stale = question("que_stale_overlap", sessionID)
    const session = {
      id: sessionID,
      title: "Plan",
      time: { created: 0, updated: 0 },
      version: "1.14.42",
      directory,
      projectID: "proj_test",
      workspaceID: "ws_a",
    }
    let questionCalls = 0
    const older = deferred<Response>()
    const { app, emit, project, sync } = await mount((url) => {
      if (url.pathname === "/question") {
        questionCalls += 1
        if (questionCalls < 3) return json([])
        if (questionCalls === 3) return older.promise
        return json([])
      }
      if (url.pathname === `/session/${sessionID}`) return json(session)
      if (url.pathname === `/session/${sessionID}/messages`) return json([])
      if (url.pathname === `/session/${sessionID}/todo`) return json([])
      if (url.pathname === `/session/${sessionID}/diff`) return json([])
      if (url.pathname === "/session") return json([session])
      return undefined
    })

    try {
      project.workspace.set("ws_a")
      await sync.session.sync(sessionID)
      emit(questionAsked(stale, "ws_a"))
      await wait(() => (sync.data.question[sessionID] ?? []).some((item) => item.id === stale.id))

      const oldSync = sync.session.sync(sessionID)
      await wait(() => questionCalls === 3)
      await sync.session.sync(sessionID)
      expect(sync.data.question[sessionID] ?? []).toEqual([])

      older.resolve(json([stale]))
      await oldSync

      expect(sync.data.question[sessionID] ?? []).toEqual([])
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("question sync failure does not block session sync", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")

    const sessionID = "ses_plan"
    const session = {
      id: sessionID,
      title: "Plan",
      time: { created: 0, updated: 0 },
      version: "1.14.42",
      directory,
      projectID: "proj_test",
      workspaceID: "ws_a",
    }
    let questionCalls = 0
    const { app, project, sync } = await mount((url) => {
      if (url.pathname === "/question") {
        questionCalls += 1
        if (questionCalls === 1) return json([])
        throw new Error("question recovery transport failure")
      }
      if (url.pathname === `/session/${sessionID}`) return json(session)
      if (url.pathname === `/session/${sessionID}/messages`) return json([])
      if (url.pathname === `/session/${sessionID}/todo`) return json([])
      if (url.pathname === `/session/${sessionID}/diff`) return json([])
      if (url.pathname === "/session") return json([session])
      return undefined
    })

    try {
      project.workspace.set("ws_a")
      await sync.session.sync(sessionID)

      expect(questionCalls).toBe(2)
      expect(sync.session.get(sessionID)?.id).toBe(sessionID)
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })

  test("question recovery records the workspace for reply routing", async () => {
    const previous = Global.Path.state
    await using tmp = await tmpdir()
    Global.Path.state = tmp.path
    await Bun.write(`${tmp.path}/kv.json`, "{}")

    const sessionID = "ses_plan"
    const recovered = question("que_recovered", sessionID)
    const session = {
      id: sessionID,
      title: "Plan",
      time: { created: 0, updated: 0 },
      version: "1.14.42",
      directory,
      projectID: "proj_test",
      workspaceID: "ws_a",
    }
    const { app, project, sync } = await mount((url) => {
      if (url.pathname === "/question") return json([recovered])
      if (url.pathname === `/session/${sessionID}`) return json(session)
      if (url.pathname === `/session/${sessionID}/messages`) return json([])
      if (url.pathname === `/session/${sessionID}/todo`) return json([])
      if (url.pathname === `/session/${sessionID}/diff`) return json([])
      if (url.pathname === "/session") return json([session])
      return undefined
    })

    try {
      project.workspace.set("ws_a")
      await sync.session.sync(sessionID)
      await wait(() => (sync.data.question[sessionID] ?? []).some((item) => item.id === recovered.id))

      expect(sync.question.workspace(recovered.id)).toBe("ws_a")
    } finally {
      app.renderer.destroy()
      Global.Path.state = previous
    }
  })
})
