import path from "node:path"
import { Global } from "@opencode-ai/core/global"
import { Log } from "@/util"
import { Filesystem } from "@/util/filesystem"

export namespace AgencySwarmRunSession {
  const log = Log.create({ service: "agency-swarm.run-session" })
  export const LOCAL_PROJECT_ENV = "AGENTSWARM_RUN_PROJECT"
  const PROVIDER_ID = "agency-swarm"

  type Info = {
    mode: "local-project"
    directory: string
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

  export async function clear(sessionID: string) {
    const data = await read()
    if (!(sessionID in data)) return
    delete data[sessionID]
    await write(data)
  }

  export async function sync(input: { sessionID: string; providerID: string; directory?: string }) {
    if (input.providerID !== PROVIDER_ID || !input.directory) {
      await clear(input.sessionID)
      return
    }
    await mark({ sessionID: input.sessionID, directory: input.directory })
  }

  export async function get(sessionID: string): Promise<Info | undefined> {
    return (await read())[sessionID]
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
    await Filesystem.writeJson(file, data)
  }
}
