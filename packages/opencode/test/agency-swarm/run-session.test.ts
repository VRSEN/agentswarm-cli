import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { AgencySwarmRunSession } from "../../src/agency-swarm/run-session"
import { Filesystem } from "../../src/util/filesystem"

describe("agency-swarm run session state", () => {
  afterEach(() => {
    mock.restore()
  })

  test("sync stores local-project metadata only for agency-swarm sessions", async () => {
    const readJson = spyOn(Filesystem, "readJson").mockRejectedValue(new Error("missing"))
    const writeJson = spyOn(Filesystem, "writeJson").mockResolvedValue(undefined as never)

    await AgencySwarmRunSession.sync({
      sessionID: "ses_123",
      providerID: "agency-swarm",
      directory: "/tmp/project",
    })

    expect(readJson).toHaveBeenCalledTimes(1)
    expect(writeJson).toHaveBeenCalledTimes(1)
    expect(writeJson.mock.calls[0]?.[1]).toEqual({
      ses_123: {
        mode: "local-project",
        directory: "/tmp/project",
      },
    })
  })

  test("sync clears stale local-project metadata for non-agency sessions", async () => {
    spyOn(Filesystem, "readJson").mockResolvedValue({
      ses_123: {
        mode: "local-project",
        directory: "/tmp/project",
      },
    } as never)
    const writeJson = spyOn(Filesystem, "writeJson").mockResolvedValue(undefined as never)

    await AgencySwarmRunSession.sync({
      sessionID: "ses_123",
      providerID: "openai",
      directory: "/tmp/project",
    })

    expect(writeJson).toHaveBeenCalledTimes(1)
    expect(writeJson.mock.calls[0]?.[1]).toEqual({})
  })
})
