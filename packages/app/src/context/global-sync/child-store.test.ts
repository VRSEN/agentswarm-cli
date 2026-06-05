import { beforeAll, describe, expect, mock, test } from "bun:test"
import { createRoot, getOwner } from "solid-js"
import { createStore, type SetStoreFunction, type Store } from "solid-js/store"
import type { ProviderListResponse } from "@opencode-ai/sdk/v2/client"
import type { QueryOptionsApi } from "../global-sync"
import type { State } from "./types"

let createChildStoreManager: typeof import("./child-store").createChildStoreManager

type QueryState<T = unknown> = {
  isLoading: boolean
  data?: T
  error?: unknown
}

let queries: [QueryState, QueryState, QueryState, QueryState] = [
  { isLoading: false },
  { isLoading: false },
  { isLoading: false },
  { isLoading: false },
]

beforeAll(async () => {
  mock.module("@/utils/persist", () => ({
    Persist: {
      workspace: () => ({}),
    },
    persisted: <T>(_target: unknown, store: [Store<T>, SetStoreFunction<T>]) => [
      store[0],
      store[1],
      null,
      Object.assign(() => true, { promise: undefined }),
    ],
  }))

  mock.module("@tanstack/solid-query", () => ({
    useQueries: () => queries,
  }))

  const mod = await import("./child-store")
  createChildStoreManager = mod.createChildStoreManager
})

const child = () => createStore({} as State)
const provider = (id: string): ProviderListResponse => ({
  all: [
    {
      id,
      name: id,
      source: "api",
      env: [],
      options: {},
      models: {},
    },
  ],
  connected: [id],
  default: {},
})

function manager(owner: NonNullable<ReturnType<typeof getOwner>>, global: ProviderListResponse = provider("global")) {
  return createChildStoreManager({
    owner,
    isBooting: () => false,
    isLoadingSessions: () => false,
    onBootstrap() {},
    onDispose() {},
    translate: (key) => key,
    queryOptions: {} as QueryOptionsApi,
    global: { provider: () => global },
  })
}

describe("createChildStoreManager", () => {
  test("does not evict the active directory during mark", () => {
    const owner = createRoot((dispose) => {
      const current = getOwner()
      dispose()
      return current
    })
    if (!owner) throw new Error("owner required")

    const store = manager(owner)

    Array.from({ length: 30 }, (_, index) => `/pinned-${index}`).forEach((directory) => {
      store.children[directory] = child()
      store.pin(directory)
    })

    const directory = "/active"
    store.children[directory] = child()
    store.mark(directory)

    expect(store.children[directory]).toBeDefined()
  })

  test("falls back to global providers when the workspace provider query fails without data", () => {
    const global = provider("global-provider")
    queries = [
      { isLoading: false },
      { isLoading: false },
      { isLoading: false },
      { isLoading: false, error: new Error("provider query failed") },
    ]

    createRoot((dispose) => {
      const owner = getOwner()
      if (!owner) throw new Error("owner required")

      const store = manager(owner, global)
      const [state] = store.ensureChild("/repo")

      expect(state.provider).toBe(global)
      expect(state.provider.all.map((item) => item.id)).toEqual(["global-provider"])

      dispose()
    })
  })

  test("keeps cached workspace providers when a refetch fails", () => {
    const global = provider("global-provider")
    const workspace = provider("workspace-provider")
    queries = [
      { isLoading: false },
      { isLoading: false },
      { isLoading: false },
      { isLoading: false, data: workspace, error: new Error("provider refetch failed") },
    ]

    createRoot((dispose) => {
      const owner = getOwner()
      if (!owner) throw new Error("owner required")

      const store = manager(owner, global)
      const [state] = store.ensureChild("/repo")

      expect(state.provider).toBe(workspace)
      expect(state.provider.all.map((item) => item.id)).toEqual(["workspace-provider"])

      dispose()
    })
  })
})
