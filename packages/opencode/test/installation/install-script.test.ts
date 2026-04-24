import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, "../../../..")
const installScript = fs.readFileSync(path.join(repoRoot, "install"), "utf8")
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/opencode/package.json"), "utf8")) as {
  name: string
  bin: Record<string, string>
  repository: { url: string }
}

function readInstallVar(name: string) {
  const match = installScript.match(new RegExp(`^${name}=(.+)$`, "m"))
  expect(match?.[1]).toBeDefined()
  return match![1].replace(/^"/, "").replace(/"$/, "")
}

function readResolvedInstallVar(name: string) {
  return readInstallVar(name).replaceAll("${REPO}", readInstallVar("REPO")).replaceAll("$CMD", readInstallVar("CMD"))
}

const expectedPackageName = "agentswarm-cli"
const expectedReleaseRepo = "VRSEN/agentswarm-cli"
const expectedInstallURL = "https://raw.githubusercontent.com/VRSEN/agentswarm-cli/dev/install"
const expectedReleasesURL = "https://github.com/VRSEN/agentswarm-cli/releases"
const expectedDocsURL = "https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli"

test("install script expects the release archive binary name", () => {
  const binName = Object.keys(packageJson.bin)[0]
  expect(readInstallVar("CMD")).toBe(binName)
  expect(readInstallVar("BIN")).toBe("$CMD")
})

test("install script and installation package source point at the fork package and repo", () => {
  expect(packageJson.name).toBe(expectedPackageName)
  expect(readInstallVar("APP")).toBe(expectedPackageName)
  expect(readInstallVar("REPO")).toBe(expectedReleaseRepo)
  expect(readResolvedInstallVar("INSTALL_URL")).toBe(expectedInstallURL)
  expect(readResolvedInstallVar("RELEASES_URL")).toBe(expectedReleasesURL)
  expect(readResolvedInstallVar("DOCS_URL")).toBe(expectedDocsURL)
  expect(packageJson.repository.url).toContain(`${expectedReleaseRepo}.git`)
})
