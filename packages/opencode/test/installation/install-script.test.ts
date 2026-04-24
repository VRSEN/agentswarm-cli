import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { AgencyDistribution } from "../../src/agency-swarm/distribution"

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

test("install script expects the release archive binary name", () => {
  const binName = Object.keys(packageJson.bin)[0]
  expect(readInstallVar("CMD")).toBe(binName)
  expect(readInstallVar("BIN")).toBe("$CMD")
})

test("install script and installation package source point at the fork package and repo", () => {
  expect(readInstallVar("APP")).toBe(AgencyDistribution.packageName)
  expect(packageJson.name).toBe(AgencyDistribution.packageName)
  expect(readInstallVar("REPO")).toBe(AgencyDistribution.releaseRepo)
  expect(readResolvedInstallVar("INSTALL_URL")).toBe(AgencyDistribution.installURL)
  expect(readResolvedInstallVar("RELEASES_URL")).toBe(AgencyDistribution.releasesURL)
  expect(readResolvedInstallVar("DOCS_URL")).toBe(AgencyDistribution.docsURL)
  expect(packageJson.repository.url).toContain(`${AgencyDistribution.releaseRepo}.git`)
})
