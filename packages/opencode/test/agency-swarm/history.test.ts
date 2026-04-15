import { afterEach, expect, test } from "bun:test"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { Storage } from "../../src/storage/storage"

const originalRead = Storage.read
const originalWrite = Storage.write
const originalFile = Bun.file

afterEach(() => {
  Storage.read = originalRead
  Storage.write = originalWrite
  Bun.file = originalFile
})

test("load falls back to legacy opencode storage and migrates entry", async () => {
  const scope = {
    baseURL: "http://127.0.0.1:8000",
    agency: "builder",
    sessionID: "session_1",
  }
  const scopedKey = AgencySwarmHistory.scopeKey(scope)
  const hash = Bun.hash.xxHash32(scopedKey).toString(16).padStart(8, "0")
  const writes: Array<{ key: string[]; content: unknown }> = []

  Storage.read = (async () => {
    throw new Storage.NotFoundError({ message: "missing" })
  }) as typeof Storage.read
  Storage.write = (async (key, content) => {
    writes.push({ key, content })
  }) as typeof Storage.write
  Bun.file = ((file: string) => ({
    json: async () => {
      expect(file.endsWith(`/opencode/storage/agency_swarm_history/${hash}.json`)).toBeTrue()
      return {
        scope: scopedKey,
        chat_history: [{ type: "message", role: "assistant" }],
        last_run_id: "run_1",
        updated_at: 123,
      }
    },
  })) as typeof Bun.file

  const entry = await AgencySwarmHistory.load(scope)

  expect(entry).toEqual({
    scope: scopedKey,
    chat_history: [{ type: "message", role: "assistant" }],
    last_run_id: "run_1",
    updated_at: 123,
  })
  expect(writes).toEqual([
    {
      key: ["agency_swarm_history", hash],
      content: entry,
    },
  ])
})
