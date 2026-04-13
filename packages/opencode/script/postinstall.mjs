#!/usr/bin/env node

import fs from "fs"
import path from "path"
import os from "os"
import childProcess from "child_process"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"))
const scope = pkg.platformScope || ""

function detectPlatformAndArch() {
  // Map platform names
  let platform
  switch (os.platform()) {
    case "darwin":
      platform = "darwin"
      break
    case "linux":
      platform = "linux"
      break
    case "win32":
      platform = "windows"
      break
    default:
      platform = os.platform()
      break
  }

  // Map architecture names
  let arch
  switch (os.arch()) {
    case "x64":
      arch = "x64"
      break
    case "arm64":
      arch = "arm64"
      break
    case "arm":
      arch = "arm"
      break
    default:
      arch = os.arch()
      break
  }

  return { platform, arch }
}

function findBinary() {
  const { platform, arch } = detectPlatformAndArch()
  const binaryName = platform === "windows" ? "agentswarm.exe" : "agentswarm"
  const base = `agentswarm-cli-${platform}-${arch}`
  const baseline = arch === "x64" && !supportsAvx2(platform, arch)
  const names = packageNames(platform, arch, base, baseline)

  for (const name of names) {
    try {
      const packageJsonPath = require.resolve(`${name}/package.json`)
      const packageDir = path.dirname(packageJsonPath)
      const binaryPath = path.join(packageDir, "bin", binaryName)
      if (!fs.existsSync(binaryPath)) continue
      return { binaryPath, binaryName }
    } catch {
      continue
    }
  }

  throw new Error(`Could not find package ${names.join(", ")}`)
}

function supportsAvx2(platform, arch) {
  if (arch !== "x64") return false

  if (platform === "linux") {
    try {
      return /(^|\s)avx2(\s|$)/i.test(fs.readFileSync("/proc/cpuinfo", "utf8"))
    } catch {
      return false
    }
  }

  if (platform === "darwin") {
    try {
      const result = childProcess.spawnSync("sysctl", ["-n", "hw.optional.avx2_0"], {
        encoding: "utf8",
        timeout: 1500,
      })
      if (result.status !== 0) return false
      return (result.stdout || "").trim() === "1"
    } catch {
      return false
    }
  }

  if (platform === "windows") {
    const cmd =
      '(Add-Type -MemberDefinition "[DllImport(""kernel32.dll"")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);" -Name Kernel32 -Namespace Win32 -PassThru)::IsProcessorFeaturePresent(40)'

    for (const exe of ["powershell.exe", "pwsh.exe", "pwsh", "powershell"]) {
      try {
        const result = childProcess.spawnSync(exe, ["-NoProfile", "-NonInteractive", "-Command", cmd], {
          encoding: "utf8",
          timeout: 3000,
          windowsHide: true,
        })
        if (result.status !== 0) continue
        const out = (result.stdout || "").trim().toLowerCase()
        if (out === "true" || out === "1") return true
        if (out === "false" || out === "0") return false
      } catch {
        continue
      }
    }
  }

  return false
}

function packageNames(platform, arch, base, baseline) {
  const names = (() => {
    if (platform === "linux") {
      const musl = isMusl()
      if (arch === "x64") {
        if (musl) {
          if (baseline) return [`${base}-baseline-musl`, `${base}-musl`, `${base}-baseline`, base]
          return [`${base}-musl`, `${base}-baseline-musl`, base, `${base}-baseline`]
        }
        if (baseline) return [`${base}-baseline`, base, `${base}-baseline-musl`, `${base}-musl`]
        return [base, `${base}-baseline`, `${base}-musl`, `${base}-baseline-musl`]
      }
      if (musl) return [`${base}-musl`, base]
      return [base, `${base}-musl`]
    }

    if (arch === "x64") {
      if (baseline) return [`${base}-baseline`, base]
      return [base, `${base}-baseline`]
    }

    return [base]
  })()

  if (!scope) return names
  return names.map((name) => `${scope}/${name}`)
}

function isMusl() {
  try {
    if (fs.existsSync("/etc/alpine-release")) return true
  } catch {}

  try {
    const result = childProcess.spawnSync("ldd", ["--version"], { encoding: "utf8" })
    const text = ((result.stdout || "") + (result.stderr || "")).toLowerCase()
    return text.includes("musl")
  } catch {
    return false
  }
}

async function main() {
  try {
    if (os.platform() === "win32") {
      // On Windows, the .exe is already included in the package and bin field points to it
      // No postinstall setup needed
      console.log("Windows detected: binary setup not needed (using packaged .exe)")
      return
    }

    // On non-Windows platforms, just verify the binary package exists
    // Don't replace the wrapper script - it handles binary execution
    const { binaryPath } = findBinary()
    const target = path.join(__dirname, "bin", ".agentswarm")
    if (fs.existsSync(target)) fs.unlinkSync(target)
    try {
      fs.linkSync(binaryPath, target)
    } catch {
      fs.copyFileSync(binaryPath, target)
    }
    fs.chmodSync(target, 0o755)
  } catch (error) {
    console.error("Failed to setup agentswarm binary:", error.message)
    process.exit(1)
  }
}

await main().catch((error) => {
  console.error("Postinstall script error:", error.message)
  process.exit(0)
})
