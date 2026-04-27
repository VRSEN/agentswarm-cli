import { Storage } from "@/storage/storage"
import { Global } from "@opencode-ai/core/global"
import { Log } from "@/util"
import path from "path"
import { AgencySwarmAdapter } from "./adapter"

export namespace AgencySwarmHistory {
  const log = Log.create({ service: "agency-swarm.history" })
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
    const current = normalize(await readEntry(key), expectedScope)
    if (current) return current

    const recovered = await loadRecoveredLoopback(scope)
    if (recovered) {
      const migrated = {
        ...recovered,
        scope: expectedScope,
      } satisfies Entry
      await save(scope, migrated)
      return migrated
    }

    const legacy = normalize(await loadLegacy(scope), expectedScope)
    if (!legacy) return empty(expectedScope)
    await save(scope, legacy)
    return legacy
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

  async function readEntry(key: string[]) {
    return Storage.read<Entry>(key).catch((error) => {
      if (Storage.NotFoundError.isInstance(error)) return undefined
      throw error
    })
  }

  function storageKey(scope: Scope): string[] {
    const scopedKey = scopeKey(scope)
    const hash = Bun.hash.xxHash32(scopedKey).toString(16).padStart(8, "0")
    return ["agency_swarm_history", hash]
  }

  function asHistory(input: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(input)) return []
    return input.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item),
    )
  }

  async function loadLegacy(scope: Scope): Promise<Entry | undefined> {
    const file = legacyFile(scope)
    const existing = await Bun.file(file)
      .json()
      .catch((error) => {
        log.error("failed to load legacy agency-swarm history; continuing without it", {
          file,
          error: error instanceof Error ? error.message : String(error),
        })
        return undefined
      })
    return existing as Entry | undefined
  }

  function legacyFile(scope: Scope) {
    return path.join(path.dirname(Global.Path.data), "opencode", "storage", ...storageKey(scope)) + ".json"
  }

  async function loadRecoveredLoopback(scope: Scope): Promise<Entry | undefined> {
    if (!isLoopbackBaseURL(scope.baseURL)) return

    const keys = await Storage.list(["agency_swarm_history"]).catch((error) => {
      log.error("failed to list agency-swarm history while recovering loopback state; continuing without recovery", {
        error: error instanceof Error ? error.message : String(error),
      })
      return [] as string[][]
    })
    let newest: Entry | undefined

    for (const key of keys) {
      const existing = normalize(await readEntry(key))
      const parsed = parseScope(existing?.scope)
      if (!existing || !parsed) continue
      if (parsed.sessionID !== scope.sessionID || parsed.agency !== scope.agency) continue
      if (!isLoopbackBaseURL(parsed.baseURL)) continue
      if (!newest || existing.updated_at > newest.updated_at) {
        newest = existing
      }
    }

    return newest
  }

  function normalize(existing: Entry | undefined, expectedScope?: string): Entry | undefined {
    if (!existing) return
    if (expectedScope && existing.scope !== expectedScope) return
    return {
      scope: existing.scope,
      chat_history: asHistory(existing.chat_history),
      last_run_id: typeof existing.last_run_id === "string" && existing.last_run_id ? existing.last_run_id : undefined,
      updated_at: typeof existing.updated_at === "number" ? existing.updated_at : Date.now(),
    }
  }

  function parseScope(scope: string | undefined) {
    if (!scope) return
    const parts = scope.split("|")
    const sessionID = parts.at(-1)
    const agency = parts.at(-2)
    if (!sessionID || !agency || parts.length < 3) return
    return {
      baseURL: parts.slice(0, -2).join("|"),
      agency,
      sessionID,
    }
  }

  function isLoopbackBaseURL(baseURL: string) {
    try {
      const parsed = new URL(baseURL)
      return (
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "0.0.0.0" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "::1"
      )
    } catch (error) {
      log.error("failed to parse agency-swarm history base URL while checking loopback recovery", {
        baseURL,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}
