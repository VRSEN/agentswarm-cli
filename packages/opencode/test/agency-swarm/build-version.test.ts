import { describe, expect, test } from "bun:test"
import {
  createAgentSwarmPlatformOptionalDependencyTarget,
  createPlatformPackageMetadata,
  createReleaseVersionValues,
  resolveReleaseRepo,
  resolveBuildVersion,
} from "../../script/version"

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
  })

  test("build script falls back to package.json version instead of Script.version", async () => {
    const source = await Bun.file(new URL("../../script/build.ts", import.meta.url)).text()
    expect(source).toContain("resolveBuildVersion(process.env, pkg.version)")
    expect(source).not.toContain("resolveBuildVersion(process.env, Script.version)")
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

  test("keeps platform optional-dependency names separate from product package metadata", () => {
    expect(
      createPlatformPackageMetadata({
        name: "@agency-swarm/custom-cli",
        buildVersion: "2.0.0-downstream",
        os: "darwin",
        arch: "arm64",
      }).name,
    ).toBe("@agency-swarm/custom-cli")

    expect(
      createAgentSwarmPlatformOptionalDependencyTarget({
        platformScope: "@vrsen",
        os: "darwin",
        arch: "arm64",
      }),
    ).toEqual({
      target: "agentswarm-cli-darwin-arm64",
      name: "@vrsen/agentswarm-cli-darwin-arm64",
    })
  })

  test("keeps Agent Swarm platform package target names for baseline and musl artifacts", () => {
    expect(
      createAgentSwarmPlatformOptionalDependencyTarget({
        platformScope: "@vrsen",
        os: "win32",
        arch: "x64",
        avx2: false,
      }),
    ).toEqual({
      target: "agentswarm-cli-windows-x64-baseline",
      name: "@vrsen/agentswarm-cli-windows-x64-baseline",
    })

    expect(
      createAgentSwarmPlatformOptionalDependencyTarget({
        platformScope: "@vrsen",
        os: "linux",
        arch: "x64",
        abi: "musl",
      }),
    ).toEqual({
      target: "agentswarm-cli-linux-x64-musl",
      name: "@vrsen/agentswarm-cli-linux-x64-musl",
    })
  })

  test("creates release values from the build version", () => {
    expect(createReleaseVersionValues("2.0.0-downstream")).toEqual({
      binaryVersion: "2.0.0-downstream",
      releaseTag: "v2.0.0-downstream",
    })
  })

  test("resolves the downstream release repo before the default GitHub repo", () => {
    expect(
      resolveReleaseRepo({
        AGENTSWARM_PRODUCT_RELEASE_REPO: "example/product-cli",
        GH_REPO: "VRSEN/agentswarm-cli",
      }),
    ).toBe("example/product-cli")
  })

  test("keeps Agent Swarm release repo behavior when no downstream repo is set", () => {
    expect(resolveReleaseRepo({ GH_REPO: "VRSEN/agentswarm-cli" })).toBe("VRSEN/agentswarm-cli")
  })

  test("leaves release repo unresolved when release mode has no repo", () => {
    expect(resolveReleaseRepo({})).toBeUndefined()
  })
})
