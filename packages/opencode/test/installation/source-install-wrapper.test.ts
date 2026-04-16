import { expect, test } from "bun:test"
import * as fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "../fixture/fixture"

const wrapperPath = fileURLToPath(new URL("../../bin/agentswarm", import.meta.url))

function platformName() {
  return (
    {
      darwin: "darwin",
      linux: "linux",
      win32: "windows",
    }[process.platform] ?? process.platform
  )
}

function archName() {
  return (
    {
      x64: "x64",
      arm64: "arm64",
      arm: "arm",
    }[process.arch] ?? process.arch
  )
}

function possibleDistTargets() {
  const platform = platformName()
  const arch = archName()
  const base = `agentswarm-cli-${platform}-${arch}`

  const names = new Set([base])
  if (arch === "x64") {
    names.add(`${base}-baseline`)
    if (platform === "linux") {
      names.add(`${base}-musl`)
      names.add(`${base}-baseline-musl`)
    }
  } else if (platform === "linux") {
    names.add(`${base}-musl`)
  }
  return [...names]
}

test("agentswarm wrapper falls back to a local dist binary for source installs", async () => {
  if (process.platform === "win32") return

  await using tmp = await tmpdir()
  const packageRoot = path.join(tmp.path, "agentswarm-cli")
  const binDir = path.join(packageRoot, "bin")
  const binaryName = "agentswarm"

  await fs.mkdir(binDir, { recursive: true })
  await fs.copyFile(wrapperPath, path.join(binDir, binaryName))
  await fs.chmod(path.join(binDir, binaryName), 0o755)
  await fs.writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify({
      name: "agentswarm-cli",
      platformScope: "@vrsen",
    }),
  )

  for (const target of possibleDistTargets()) {
    const binaryPath = path.join(packageRoot, "dist", target, "bin", binaryName)
    await fs.mkdir(path.dirname(binaryPath), { recursive: true })
    await fs.writeFile(binaryPath, "#!/usr/bin/env node\nprocess.stdout.write('dist-fallback-ok')\n")
    await fs.chmod(binaryPath, 0o755)
  }

  const result = Bun.spawnSync({
    cmd: [process.execPath, path.join(binDir, binaryName), "--version"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(result.exitCode).toBe(0)
  expect(result.stderr.toString().trim()).toBe("")
  expect(result.stdout.toString().trim()).toBe("dist-fallback-ok")
})
