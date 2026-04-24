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

test("install script expects the release archive binary name", () => {
  const binName = Object.keys(packageJson.bin)[0]
  expect(readInstallVar("CMD")).toBe(binName)
  expect(readInstallVar("BIN")).toBe("$CMD")
})

test("install script and installation package source point at the fork package and repo", () => {
  expect(readInstallVar("APP")).toBe(packageJson.name)
  expect(readInstallVar("REPO")).toBe("VRSEN/agentswarm-cli")
  expect(packageJson.repository.url).toContain("VRSEN/agentswarm-cli.git")
})
