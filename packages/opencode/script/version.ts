export function resolveBuildVersion(
  env: NodeJS.ProcessEnv | { AGENTSWARM_PRODUCT_VERSION?: string; OPENCODE_VERSION?: string },
  fallback: string,
) {
  return env.AGENTSWARM_PRODUCT_VERSION || env.OPENCODE_VERSION || fallback
}

export function createPlatformPackageMetadata(input: { name: string; buildVersion: string; os: string; arch: string }) {
  return {
    name: input.name,
    version: input.buildVersion,
    os: [input.os],
    cpu: [input.arch],
  }
}

const AGENTSWARM_PLATFORM_OPTIONAL_DEPENDENCY_NAME = "agentswarm-cli"

export function createAgentSwarmPlatformOptionalDependencyTarget(input: {
  platformScope?: string
  os: string
  arch: string
  abi?: string
  avx2?: false
}) {
  // Keep this independent from AGENTSWARM_PRODUCT_PACKAGE_NAME. The bin wrapper
  // and postinstall script resolve platform optional dependencies with this base.
  const target = [
    AGENTSWARM_PLATFORM_OPTIONAL_DEPENDENCY_NAME,
    input.os === "win32" ? "windows" : input.os,
    input.arch,
    input.avx2 === false ? "baseline" : undefined,
    input.abi,
  ]
    .filter(Boolean)
    .join("-")
  return {
    target,
    name: input.platformScope ? `${input.platformScope}/${target}` : target,
  }
}

export function createReleaseVersionValues(buildVersion: string) {
  return {
    binaryVersion: buildVersion,
    releaseTag: `v${buildVersion}`,
  }
}

export function resolveReleaseRepo(
  env: NodeJS.ProcessEnv | { AGENTSWARM_PRODUCT_RELEASE_REPO?: string; GH_REPO?: string },
) {
  return env.AGENTSWARM_PRODUCT_RELEASE_REPO || env.GH_REPO
}
