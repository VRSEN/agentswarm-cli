import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import path from "node:path"
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

  test("sync preserves remote metadata when agency sessions have no local project directory", async () => {
    spyOn(Filesystem, "readJson").mockResolvedValue({
      ses_123: {
        mode: "remote-config",
        directory: "/tmp/product/project",
        config: {
          baseURL: "https://remote.example",
          agency: "remote-agency",
          token: "server-token",
        },
      },
    } as never)
    const writeJson = spyOn(Filesystem, "writeJson").mockResolvedValue(undefined as never)

    await AgencySwarmRunSession.sync({
      sessionID: "ses_123",
      providerID: "agency-swarm",
    })

    expect(writeJson).not.toHaveBeenCalled()
  })

  test("sync clears stale local-project metadata when the local project env is absent", async () => {
    spyOn(Filesystem, "readJson").mockResolvedValue({
      ses_123: {
        mode: "local-project",
        directory: "/tmp/project",
      },
    } as never)
    const writeJson = spyOn(Filesystem, "writeJson").mockResolvedValue(undefined as never)

    await AgencySwarmRunSession.sync({
      sessionID: "ses_123",
      providerID: "agency-swarm",
    })

    expect(writeJson).toHaveBeenCalledTimes(1)
    expect(writeJson.mock.calls[0]?.[1]).toEqual({})
  })

  test("remoteConfigFromEnv reads state-root launch config for the product project directory", () => {
    const root = path.join("/tmp", "product-state")
    const config = AgencySwarmRunSession.remoteConfigFromEnv({
      directory: path.join(root, "project"),
      env: {
        [AgencySwarmRunSession.PRODUCT_STATE_ROOT_ENV]: root,
        OPENCODE_CONFIG_CONTENT: JSON.stringify({
          provider: {
            "agency-swarm": {
              options: {
                baseURL: "https://remote.example/",
                agency: "remote-agency",
                token: "server-token",
              },
            },
          },
        }),
      },
    })

    expect(config).toEqual({
      baseURL: "https://remote.example",
      agency: "remote-agency",
      token: "server-token",
    })
  })
})
