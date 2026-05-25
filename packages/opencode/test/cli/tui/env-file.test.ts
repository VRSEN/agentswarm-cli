import { describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { readEnvKey, writeEnvKey } from "../../../src/cli/cmd/tui/util/env-file"

async function tempdir() {
  return mkdtemp(path.join(os.tmpdir(), "agentswarm-env-file-"))
}

describe("env-file", () => {
  test("writes a new project .env file", async () => {
    const dir = await tempdir()
    try {
      writeEnvKey("SEARCH_API_KEY", "search-key", dir)

      expect(await readFile(path.join(dir, ".env"), "utf8")).toBe('SEARCH_API_KEY="search-key"\n')
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("search-key")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("updates existing key and preserves unrelated entries", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "A=1\nexport SEARCH_API_KEY=old\nB=2\n")

      writeEnvKey("SEARCH_API_KEY", "new", dir)

      expect(await readFile(path.join(dir, ".env"), "utf8")).toBe('A=1\nexport SEARCH_API_KEY="new"\nB=2\n')
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("new")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("appends a missing key", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "A=1")

      writeEnvKey("UNSPLASH_ACCESS_KEY", "photo-key", dir)

      expect(await readFile(path.join(dir, ".env"), "utf8")).toBe('A=1\nUNSPLASH_ACCESS_KEY="photo-key"\n')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
