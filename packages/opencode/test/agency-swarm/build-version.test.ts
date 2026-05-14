import { describe, expect, test } from "bun:test"
import { createPlatformPackageMetadata, createReleaseVersionValues, resolveBuildVersion } from "../../script/version"

describe("resolveBuildVersion", () => {
  test("uses the downstream product version when both version env values are set", () => {
    expect(
      resolveBuildVersion(
        {
          AGENTSWARM_PRODUCT_VERSION: "2.0.0-downstream",
          OPENCODE_VERSION: "1.0.0-opencode",
        },
        "0.0.0-local",
      ),
    ).toBe("2.0.0-downstream")
  })

  test("keeps normal Agent Swarm build version precedence", () => {
    expect(resolveBuildVersion({ OPENCODE_VERSION: "1.0.0-opencode" }, "0.0.0-local")).toBe("1.0.0-opencode")
    expect(resolveBuildVersion({}, "0.0.0-local")).toBe("0.0.0-local")
  })
})

describe("build metadata version wiring", () => {
  test("creates generated platform package metadata from the build version", () => {
    expect(
      createPlatformPackageMetadata({
        name: "@agentswarm/agentswarm-cli-darwin-arm64",
        buildVersion: "2.0.0-downstream",
        os: "darwin",
        arch: "arm64",
      }),
    ).toEqual({
      name: "@agentswarm/agentswarm-cli-darwin-arm64",
      version: "2.0.0-downstream",
      os: ["darwin"],
      cpu: ["arm64"],
    })
  })

  test("creates release values from the build version", () => {
    expect(createReleaseVersionValues("2.0.0-downstream")).toEqual({
      binaryVersion: "2.0.0-downstream",
      releaseTag: "v2.0.0-downstream",
    })
  })
})
