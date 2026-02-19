import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

describe("cli bin launcher", () => {
  test("runs under node when AGENCY_BIN_PATH is set", () => {
    const binPath = fileURLToPath(new URL("../../bin/agency", import.meta.url))

    const result = spawnSync(process.execPath, [binPath, "--version"], {
      env: {
        ...process.env,
        AGENCY_BIN_PATH: process.execPath,
      },
    })

    expect(result.status).toBe(0)
    expect(result.error).toBeUndefined()
  })
})
