import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { createDevProcess } from "../../script/dev"

test("root dev script uses the dedicated dev wrapper", () => {
  const root = path.resolve(import.meta.dir, "..", "..", "..", "..")
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>
  }

  expect(pkg.scripts?.dev).toBe("bun run packages/opencode/script/dev.ts")
})

test("dev wrapper watches source and disables autoupdate by default", () => {
  const processSpec = createDevProcess([".", "--help"], {})

  expect(processSpec.cmd).toEqual([
    process.execPath,
    "run",
    "--watch",
    "--cwd",
    "packages/opencode",
    "--conditions=browser",
    "src/index.ts",
    ".",
    "--help",
  ])
  expect(processSpec.cwd).toBe(path.resolve(import.meta.dir, "..", "..", "..", ".."))
  expect(processSpec.env.OPENCODE_DISABLE_AUTOUPDATE).toBe("1")
})

test("dev wrapper preserves explicit autoupdate override", () => {
  const processSpec = createDevProcess([], { OPENCODE_DISABLE_AUTOUPDATE: "0" })

  expect(processSpec.env.OPENCODE_DISABLE_AUTOUPDATE).toBe("0")
})
