import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

describe("cli bin launcher", () => {
  const binPath = fileURLToPath(new URL("../../bin/agency", import.meta.url))
  const postinstallPath = fileURLToPath(new URL("../../script/postinstall.mjs", import.meta.url))

  test("runs under node when AGENCY_BIN_PATH is set", () => {
    const result = spawnSync(process.execPath, [binPath, "--version"], {
      env: {
        ...process.env,
        AGENCY_BIN_PATH: process.execPath,
      },
    })

    expect(result.status).toBe(0)
    expect(result.error).toBeUndefined()
  })

  test("does not retain opencode launcher coupling", () => {
    const bin = fs.readFileSync(binPath, "utf8")
    const postinstall = fs.readFileSync(postinstallPath, "utf8")

    expect(bin.includes("OPENCODE_BIN_PATH")).toBe(false)
    expect(bin.includes('".agentswarm"')).toBe(true)
    expect(postinstall.includes('".agentswarm"')).toBe(true)
    expect(postinstall.includes('".opencode"')).toBe(false)
  })
})
