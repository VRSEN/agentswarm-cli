import { afterEach, expect, test } from "bun:test"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { Storage } from "../../src/storage/storage"

const originalRead = Storage.read
const originalWrite = Storage.write
const originalList = Storage.list
const originalFile = Bun.file

afterEach(() => {
  Storage.read = originalRead
  Storage.write = originalWrite
  Storage.list = originalList
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

test("load recovers latest loopback history across baseURL port changes for the same local agency", async () => {
  const scope = {
    baseURL: "http://127.0.0.1:8124",
    agency: "QAAgency",
    sessionID: "session_1",
  }
  const previousScope = {
    baseURL: "http://127.0.0.1:8123",
    agency: "QAAgency",
    sessionID: "session_1",
  }
  const ignoredRemoteScope = {
    baseURL: "https://remote.example.com",
    agency: "QAAgency",
    sessionID: "session_1",
  }
  const ignoredAgencyScope = {
    baseURL: "http://127.0.0.1:9000",
    agency: "builder",
    sessionID: "session_1",
  }
  const currentHash = Bun.hash.xxHash32(AgencySwarmHistory.scopeKey(scope)).toString(16).padStart(8, "0")
  const previousHash = Bun.hash.xxHash32(AgencySwarmHistory.scopeKey(previousScope)).toString(16).padStart(8, "0")
  const ignoredRemoteHash = Bun.hash
    .xxHash32(AgencySwarmHistory.scopeKey(ignoredRemoteScope))
    .toString(16)
    .padStart(8, "0")
  const ignoredAgencyHash = Bun.hash
    .xxHash32(AgencySwarmHistory.scopeKey(ignoredAgencyScope))
    .toString(16)
    .padStart(8, "0")
  const writes: Array<{ key: string[]; content: unknown }> = []

  Storage.list = (async () => [
    ["agency_swarm_history", previousHash],
    ["agency_swarm_history", ignoredRemoteHash],
    ["agency_swarm_history", ignoredAgencyHash],
  ]) as typeof Storage.list
  Storage.read = (async (key) => {
    const hash = key.at(-1)
    if (hash === currentHash) throw new Storage.NotFoundError({ message: "missing" })
    if (hash === previousHash) {
      return {
        scope: AgencySwarmHistory.scopeKey(previousScope),
        chat_history: [{ type: "message", role: "assistant", content: "kept" }],
        last_run_id: "run_1",
        updated_at: 123,
      }
    }
    if (hash === ignoredRemoteHash) {
      return {
        scope: AgencySwarmHistory.scopeKey(ignoredRemoteScope),
        chat_history: [{ type: "message", role: "assistant", content: "ignored remote" }],
        updated_at: 999,
      }
    }
    if (hash === ignoredAgencyHash) {
      return {
        scope: AgencySwarmHistory.scopeKey(ignoredAgencyScope),
        chat_history: [{ type: "message", role: "assistant", content: "ignored agency" }],
        updated_at: 998,
      }
    }
    throw new Storage.NotFoundError({ message: "missing" })
  }) as typeof Storage.read
  Storage.write = (async (key, content) => {
    writes.push({ key, content })
  }) as typeof Storage.write
  Bun.file = (() => ({
    json: async () => undefined,
  })) as unknown as typeof Bun.file

  const entry = await AgencySwarmHistory.load(scope)

  expect(entry).toEqual({
    scope: AgencySwarmHistory.scopeKey(scope),
    chat_history: [{ type: "message", role: "assistant", content: "kept" }],
    last_run_id: "run_1",
    updated_at: 123,
  })
  expect(writes).toEqual([
    {
      key: ["agency_swarm_history", currentHash],
      content: entry,
    },
  ])
})
