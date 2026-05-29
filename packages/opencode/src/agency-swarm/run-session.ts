import path from "node:path"
import { chmod } from "node:fs/promises"
import { Global } from "@opencode-ai/core/global"
import { Log } from "@/util"
import { Filesystem } from "@/util/filesystem"
import { AgencySwarmAdapter } from "./adapter"

export namespace AgencySwarmRunSession {
  const log = Log.create({ service: "agency-swarm.run-session" })
  export const LOCAL_PROJECT_ENV = "AGENTSWARM_RUN_PROJECT"
  export const PRODUCT_STATE_ROOT_ENV = "AGENTSWARM_PRODUCT_STATE_ROOT"
  const PROVIDER_ID = "agency-swarm"

  export type RemoteConfig = {
    baseURL: string
    agency: string
    token?: string
  }

  export type Info =
    | {
        mode: "local-project"
        directory: string
      }
    | {
        mode: "remote-config"
        directory: string
        config: RemoteConfig
      }

  const file = path.join(Global.Path.state, "agency-swarm-run-sessions.json")

  export async function mark(input: { sessionID: string; directory: string }) {
    const data = await read()
    data[input.sessionID] = {
      mode: "local-project",
      directory: path.resolve(input.directory),
    }
    await write(data)
  }

  export async function markRemote(input: { sessionID: string; directory: string; config: RemoteConfig }) {
    const data = await read()
    data[input.sessionID] = {
      mode: "remote-config",
      directory: path.resolve(input.directory),
      config: input.config,
    }
    await write(data)
  }

  export async function clear(sessionID: string) {
    const data = await read()
    if (!(sessionID in data)) return
    delete data[sessionID]
    await write(data)
  }

  export async function copy(input: { sourceID: string; targetID: string }) {
    const data = await read()
    const info = data[input.sourceID]
    if (!info) return
    data[input.targetID] = structuredClone(info)
    await write(data)
  }

  export async function sync(input: { sessionID: string; providerID: string; directory?: string }) {
    if (input.providerID !== PROVIDER_ID) {
      await clear(input.sessionID)
      return
    }
    if (input.directory) {
      await mark({ sessionID: input.sessionID, directory: input.directory })
      return
    }
    if ((await get(input.sessionID))?.mode === "remote-config") return
    await clear(input.sessionID)
  }

  export async function get(sessionID: string): Promise<Info | undefined> {
    return (await read())[sessionID]
  }

  export function remoteConfigFromEnv(input: { directory: string; env?: NodeJS.ProcessEnv }) {
    const env = input.env ?? process.env
    const root = env[PRODUCT_STATE_ROOT_ENV]?.trim()
    if (!root) return
    if (Filesystem.resolve(input.directory) !== path.join(Filesystem.resolve(root), "project")) return
    return remoteConfigFromContent(env.OPENCODE_CONFIG_CONTENT)
  }

  export function remoteConfigFromContent(content: string | undefined): RemoteConfig | undefined {
    if (!content) return
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return
    }
    const provider = asRecord(asRecord(parsed)?.["provider"])?.[PROVIDER_ID]
    const options = asRecord(asRecord(provider)?.["options"])
    const baseURL = readString(options?.["baseURL"]) ?? readString(options?.["base_url"])
    const agency = readString(options?.["agency"])
    if (!baseURL || !agency) return
    const token = readString(asRecord(provider)?.["key"]) ?? readString(options?.["token"])
    return {
      baseURL: AgencySwarmAdapter.normalizeBaseURL(baseURL),
      agency,
      ...(token ? { token } : {}),
    }
  }

  async function read(): Promise<Record<string, Info>> {
    const data = await Filesystem.readJson<Record<string, Info>>(file).catch((error): Record<string, Info> => {
      log.error("failed to read agency-swarm run-session state; continuing with empty state", {
        file,
        error: error instanceof Error ? error.message : String(error),
      })
      return {}
    })
    return data && typeof data === "object" && !Array.isArray(data) ? data : {}
  }

  async function write(data: Record<string, Info>) {
    await Filesystem.writeJson(file, data, 0o600)
    if (process.platform !== "win32") {
      await chmod(file, 0o600).catch((error) => {
        if (isEnoent(error)) return
        throw error
      })
    }
  }

  function asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
  }

  function readString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined
  }

  function isEnoent(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
  }
}
