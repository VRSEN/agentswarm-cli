import { Storage } from "@/storage/storage"
import { AgencySwarmAdapter } from "./adapter"

export namespace AgencySwarmHistory {
  export type Scope = {
    baseURL: string
    agency: string
    sessionID: string
  }

  export type Entry = {
    scope: string
    chat_history: Array<Record<string, unknown>>
    last_run_id?: string
    updated_at: number
  }

  export async function load(scope: Scope): Promise<Entry> {
    const key = storageKey(scope)
    const expectedScope = scopeKey(scope)

    const existing = await Storage.read<Entry>(key).catch((error) => {
      if (Storage.NotFoundError.isInstance(error)) return undefined
      throw error
    })

    if (!existing || existing.scope !== expectedScope) {
      return empty(expectedScope)
    }

    return {
      scope: existing.scope,
      chat_history: asHistory(existing.chat_history),
      last_run_id: typeof existing.last_run_id === "string" && existing.last_run_id ? existing.last_run_id : undefined,
      updated_at: typeof existing.updated_at === "number" ? existing.updated_at : Date.now(),
    }
  }

  export async function appendMessages(scope: Scope, newMessages: unknown): Promise<Entry> {
    const current = await load(scope)
    const next: Entry = {
      ...current,
      chat_history: [...current.chat_history, ...asHistory(newMessages)],
      updated_at: Date.now(),
    }
    await save(scope, next)
    return next
  }

  export async function setLastRunID(scope: Scope, runID: string | undefined): Promise<Entry> {
    const current = await load(scope)
    const next: Entry = {
      ...current,
      last_run_id: runID,
      updated_at: Date.now(),
    }
    await save(scope, next)
    return next
  }

  export function scopeKey(scope: Scope): string {
    const normalized = AgencySwarmAdapter.normalizeBaseURL(scope.baseURL)
    return `${normalized}|${scope.agency}|${scope.sessionID}`
  }

  function empty(scope: string): Entry {
    return {
      scope,
      chat_history: [],
      updated_at: Date.now(),
    }
  }

  async function save(scope: Scope, entry: Entry) {
    await Storage.write<Entry>(storageKey(scope), entry)
  }

  function storageKey(scope: Scope): string[] {
    const scopedKey = scopeKey(scope)
    const hash = Bun.hash.xxHash32(scopedKey).toString(16).padStart(8, "0")
    return ["agency_swarm_history", hash]
  }

  function asHistory(input: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(input)) return []
    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
  }
}
