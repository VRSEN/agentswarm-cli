import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import { readEnvKey, writeEnvKey, writeEnvKeys } from "../../../src/cli/cmd/tui/util/env-file"

async function tempdir() {
  return mkdtemp(path.join(os.tmpdir(), "agentswarm-env-file-"))
}

describe("env-file", () => {
  test("defaults to the caller cwd when no product state root is set", async () => {
    const dir = await tempdir()
    const cwd = process.cwd()
    const root = process.env.AGENTSWARM_PRODUCT_STATE_ROOT
    try {
      delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      process.chdir(dir)

      writeEnvKey("SEARCH_API_KEY", "search-key")

      expect(await readFile(path.join(dir, ".env"), "utf8")).toContain("SEARCH_API_KEY=")
      expect(readEnvKey("SEARCH_API_KEY")).toBe("search-key")
    } finally {
      process.chdir(cwd)
      if (root === undefined) delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      else process.env.AGENTSWARM_PRODUCT_STATE_ROOT = root
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("uses product state root for default env reads and writes", async () => {
    const caller = await tempdir()
    const root = await tempdir()
    const cwd = process.cwd()
    const previous = process.env.AGENTSWARM_PRODUCT_STATE_ROOT
    try {
      process.env.AGENTSWARM_PRODUCT_STATE_ROOT = root
      process.chdir(caller)

      writeEnvKey("SEARCH_API_KEY", "search-key")

      expect(readEnvKey("SEARCH_API_KEY")).toBe("search-key")
      expect(await readFile(path.join(root, ".env"), "utf8")).toContain("SEARCH_API_KEY=")
      await expect(readFile(path.join(caller, ".env"), "utf8")).rejects.toThrow()
    } finally {
      process.chdir(cwd)
      if (previous === undefined) delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      else process.env.AGENTSWARM_PRODUCT_STATE_ROOT = previous
      await rm(caller, { recursive: true, force: true })
      await rm(root, { recursive: true, force: true })
    }
  })

  test("keeps a relative product state root stable after cwd changes", async () => {
    const caller = await tempdir()
    const cwd = process.cwd()
    const previous = process.env.AGENTSWARM_PRODUCT_STATE_ROOT
    try {
      process.env.AGENTSWARM_PRODUCT_STATE_ROOT = "state"
      process.chdir(caller)
      const root = path.resolve("state")
      const project = path.join(root, "project")

      writeEnvKey("SEARCH_API_KEY", "search-key")
      await mkdir(project, { recursive: true })
      process.chdir(project)
      writeEnvKey("COMPOSIO_API_KEY", "composio-key")

      expect(process.env.AGENTSWARM_PRODUCT_STATE_ROOT).toBe(root)
      expect(readEnvKey("SEARCH_API_KEY")).toBe("search-key")
      expect(readEnvKey("COMPOSIO_API_KEY")).toBe("composio-key")
      expect(await readFile(path.join(root, ".env"), "utf8")).toContain("COMPOSIO_API_KEY=")
      await expect(readFile(path.join(project, "state", ".env"), "utf8")).rejects.toThrow()
    } finally {
      process.chdir(cwd)
      if (previous === undefined) delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      else process.env.AGENTSWARM_PRODUCT_STATE_ROOT = previous
      await rm(caller, { recursive: true, force: true })
    }
  })

  test("uses compiled product state root when the env var is absent", async () => {
    const caller = await tempdir()
    const root = await tempdir()
    const cwd = process.cwd()
    const previousEnv = process.env.AGENTSWARM_PRODUCT_STATE_ROOT
    const product = AgencyProduct as unknown as { stateRoot: string | undefined }
    const previousRoot = product.stateRoot
    try {
      delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      product.stateRoot = root
      process.chdir(caller)

      writeEnvKey("SEARCH_API_KEY", "search-key")

      expect(readEnvKey("SEARCH_API_KEY")).toBe("search-key")
      expect(await readFile(path.join(root, ".env"), "utf8")).toContain("SEARCH_API_KEY=")
      await expect(readFile(path.join(caller, ".env"), "utf8")).rejects.toThrow()
    } finally {
      process.chdir(cwd)
      product.stateRoot = previousRoot
      if (previousEnv === undefined) delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      else process.env.AGENTSWARM_PRODUCT_STATE_ROOT = previousEnv
      await rm(caller, { recursive: true, force: true })
      await rm(root, { recursive: true, force: true })
    }
  })

  test("uses compiled product state root when the env var is blank", async () => {
    const caller = await tempdir()
    const root = await tempdir()
    const cwd = process.cwd()
    const previousEnv = process.env.AGENTSWARM_PRODUCT_STATE_ROOT
    const product = AgencyProduct as unknown as { stateRoot: string | undefined }
    const previousRoot = product.stateRoot
    try {
      process.env.AGENTSWARM_PRODUCT_STATE_ROOT = "   "
      product.stateRoot = root
      process.chdir(caller)

      writeEnvKey("SEARCH_API_KEY", "search-key")

      expect(readEnvKey("SEARCH_API_KEY")).toBe("search-key")
      expect(await readFile(path.join(root, ".env"), "utf8")).toContain("SEARCH_API_KEY=")
      await expect(readFile(path.join(caller, ".env"), "utf8")).rejects.toThrow()
    } finally {
      process.chdir(cwd)
      product.stateRoot = previousRoot
      if (previousEnv === undefined) delete process.env.AGENTSWARM_PRODUCT_STATE_ROOT
      else process.env.AGENTSWARM_PRODUCT_STATE_ROOT = previousEnv
      await rm(caller, { recursive: true, force: true })
      await rm(root, { recursive: true, force: true })
    }
  })

  test("writes a new project .env file", async () => {
    const dir = await tempdir()
    try {
      writeEnvKey("SEARCH_API_KEY", "search-key", dir)

      const file = path.join(dir, ".env")
      expect(await readFile(file, "utf8")).toContain("SEARCH_API_KEY=")
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("search-key")
      if (process.platform !== "win32") {
        expect((await stat(file)).mode & 0o777).toBe(0o600)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("updates existing key and preserves unrelated entries", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "A=1\nexport SEARCH_API_KEY=old\nB=2\n")

      writeEnvKey("SEARCH_API_KEY", "new", dir)

      const content = await readFile(path.join(dir, ".env"), "utf8")
      expect(content).toContain("A=1\n")
      expect(content).toContain('export SEARCH_API_KEY="new"\n')
      expect(content).toContain("B=2\n")
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("new")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("updates values containing replacement tokens", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "SEARCH_API_KEY=old\n")

      writeEnvKey("SEARCH_API_KEY", "foo$&bar$$baz", dir)

      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("foo$&bar$$baz")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("appends a missing key", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "A=1")

      writeEnvKey("UNSPLASH_ACCESS_KEY", "photo-key", dir)

      expect(readEnvKey("UNSPLASH_ACCESS_KEY", dir)).toBe("photo-key")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("round trips quoted values with escapes", async () => {
    const dir = await tempdir()
    try {
      const value = 'quote" slash\\ newline\nend'

      writeEnvKey("SEARCH_API_KEY", value, dir)

      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe(value)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("writes multiple keys together", async () => {
    const dir = await tempdir()
    try {
      writeEnvKeys(
        [
          ["SEARCH_API_KEY", "search"],
          ["COMPOSIO_API_KEY", "composio"],
        ],
        dir,
      )

      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("search")
      expect(readEnvKey("COMPOSIO_API_KEY", dir)).toBe("composio")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("deduplicates keys before writing", async () => {
    const dir = await tempdir()
    try {
      writeEnvKeys(
        [
          ["SEARCH_API_KEY", "old"],
          ["COMPOSIO_API_KEY", "composio"],
          ["SEARCH_API_KEY", "new"],
        ],
        dir,
      )

      const content = await readFile(path.join(dir, ".env"), "utf8")
      expect(content.match(/SEARCH_API_KEY/g)?.length).toBe(1)
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("new")
      expect(readEnvKey("COMPOSIO_API_KEY", dir)).toBe("composio")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("preserves CRLF line endings", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "A=1\r\nSEARCH_API_KEY=old\r\nB=2\r\n")

      writeEnvKey("SEARCH_API_KEY", "new", dir)

      expect(await readFile(path.join(dir, ".env"), "utf8")).toBe('A=1\r\nSEARCH_API_KEY="new"\r\nB=2\r\n')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test("does not write secrets to a tracked .env file", async () => {
    const dir = await tempdir()
    try {
      await writeFile(path.join(dir, ".env"), "SEARCH_API_KEY=old\n")
      spawnSync("git", ["init"], { cwd: dir, stdio: "ignore" })
      spawnSync("git", ["add", ".env"], { cwd: dir, stdio: "ignore" })

      expect(() => writeEnvKey("SEARCH_API_KEY", "new", dir)).toThrow("git-tracked .env")
      expect(readEnvKey("SEARCH_API_KEY", dir)).toBe("old")
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
