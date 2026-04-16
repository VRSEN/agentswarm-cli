import path from "node:path"
import { Global } from "@/global"
import { Filesystem } from "@/util/filesystem"

export namespace AgencySwarmRunSession {
  export const LOCAL_PROJECT_ENV = "AGENTSWARM_RUN_PROJECT"

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
    await Filesystem.writeJson(file, data)
  }

  export async function get(sessionID: string): Promise<Info | undefined> {
    return (await read())[sessionID]
  }

  async function read(): Promise<Record<string, Info>> {
    const data = await Filesystem.readJson<Record<string, Info>>(file).catch((): Record<string, Info> => ({}))
    return data && typeof data === "object" && !Array.isArray(data) ? data : {}
  }
}
