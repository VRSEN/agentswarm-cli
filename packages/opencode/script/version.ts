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

export function createReleaseVersionValues(buildVersion: string) {
  return {
    binaryVersion: buildVersion,
    releaseTag: `v${buildVersion}`,
  }
}
