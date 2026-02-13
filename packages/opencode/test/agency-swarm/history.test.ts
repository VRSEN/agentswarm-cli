import { describe, expect, test } from "bun:test"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

describe("agency-swarm.history", () => {
  test("stores and resumes chat history for the same baseURL/agency/session key", async () => {
    await using tmp = await tmpdir({ config: {} })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const scope = {
          baseURL: "http://127.0.0.1:8000",
          agency: "builder",
          sessionID: "sess_1",
        }

        await AgencySwarmHistory.appendMessages(scope, [{ type: "message", id: "msg_1" }])
        const loaded = await AgencySwarmHistory.load(scope)

        expect(loaded.chat_history).toEqual([{ type: "message", id: "msg_1" }])
      },
    })
  })

  test("does not leak history across baseURL or agency changes", async () => {
    await using tmp = await tmpdir({ config: {} })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const primary = {
          baseURL: "http://127.0.0.1:8000",
          agency: "builder",
          sessionID: "sess_2",
        }

        await AgencySwarmHistory.appendMessages(primary, [{ type: "message", id: "msg_primary" }])

        const differentAgency = await AgencySwarmHistory.load({
          ...primary,
          agency: "research",
        })

        const differentBaseURL = await AgencySwarmHistory.load({
          ...primary,
          baseURL: "http://127.0.0.1:9000",
        })

        expect(differentAgency.chat_history).toEqual([])
        expect(differentBaseURL.chat_history).toEqual([])
      },
    })
  })

  test("stores last_run_id alongside chat_history", async () => {
    await using tmp = await tmpdir({ config: {} })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const scope = {
          baseURL: "http://127.0.0.1:8000",
          agency: "builder",
          sessionID: "sess_3",
        }

        await AgencySwarmHistory.setLastRunID(scope, "run_123")
        const loaded = await AgencySwarmHistory.load(scope)

        expect(loaded.last_run_id).toBe("run_123")
      },
    })
  })
})
