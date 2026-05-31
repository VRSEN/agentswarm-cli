import { afterEach, describe, expect } from "bun:test"
import path from "path"
import { Effect, Layer } from "effect"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Global } from "@opencode-ai/core/global"
import { writeFile } from "node:fs/promises"
import { Config } from "../../src/config/config"
import { RuntimeFlags } from "../../src/effect/runtime-flags"
import { Git } from "../../src/git"
import { Reference } from "../../src/reference/reference"
import { disposeAllInstances, provideTmpdirInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { githubBase, githubBaseUrl } from "../lib/github-base"

afterEach(async () => {
  await disposeAllInstances()
})

const referenceLayer = (flags: Partial<RuntimeFlags.Info> = {}) =>
  Reference.layer.pipe(
    Layer.provide(Config.defaultLayer),
    Layer.provide(AppFileSystem.defaultLayer),
    Layer.provide(Git.defaultLayer),
    Layer.provide(RuntimeFlags.layer(flags)),
  )

const it = testEffect(
  Layer.mergeAll(AppFileSystem.defaultLayer, CrossSpawnSpawner.defaultLayer, Git.defaultLayer, referenceLayer()),
)
const scout = testEffect(
  Layer.mergeAll(
    AppFileSystem.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Git.defaultLayer,
    referenceLayer({ experimentalScout: true }),
  ),
)

const git = Effect.fn("ReferenceTest.git")(function* (cwd: string, args: string[]) {
  return yield* Effect.promise(async () => {
    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    if (code !== 0) throw new Error(stderr.trim() || stdout.trim() || `git ${args.join(" ")} failed`)
    return stdout.trim()
  })
})

const waitForContent = (
  fs: AppFileSystem.Interface,
  file: string,
  content: string,
  attempts = 50,
): Effect.Effect<void, AppFileSystem.Error> =>
  Effect.gen(function* () {
    if ((yield* fs.readFileStringSafe(file)) === content) return
    if (attempts <= 0) throw new Error(`timed out waiting for ${file}`)
    yield* Effect.sleep("100 millis")
    yield* waitForContent(fs, file, content, attempts - 1)
  })

describe("reference", () => {
  it.live("resolves local and git references", () =>
    Effect.gen(function* () {
      const root = path.resolve("opencode-reference-root")
      const local = Reference.resolve({
        name: "docs",
        reference: { path: "../docs" },
        directory: path.join(root, "packages", "app"),
        worktree: root,
      })
      const repo = Reference.resolve({
        name: "effect",
        reference: { repository: "Effect-TS/effect", branch: "main" },
        directory: path.join(root, "packages", "app"),
        worktree: root,
      })

      expect(local.kind).toBe("local")
      if (local.kind === "local") expect(local.path).toBe(path.resolve(root, "../docs"))
      expect(repo.kind).toBe("git")
      if (repo.kind === "git") {
        expect(repo.repository).toBe("Effect-TS/effect")
        expect(repo.branch).toBe("main")
        expect(repo.path).toBe(path.join(Global.Path.repos, "github.com", "Effect-TS", "effect"))
      }
    }),
  )

  it.live("resolves Windows absolute string references as local", () =>
    Effect.gen(function* () {
      const resolved = Reference.resolve({
        name: "docs",
        reference: "C:\\docs",
        directory: "C:\\workspace\\repo",
        worktree: "C:\\workspace\\repo",
      })

      expect(resolved.kind).toBe("local")
      if (resolved.kind === "local") expect(resolved.path).toBe("C:\\docs")
    }),
  )

  it.live("marks same-cache references with different branches invalid", () =>
    Effect.gen(function* () {
      const root = path.resolve("opencode-reference-root")
      const references = Reference.resolveAll({
        directory: root,
        worktree: root,
        references: {
          main: { repository: "owner/repo", branch: "main" },
          dev: { repository: "github.com/owner/repo", branch: "dev" },
          alsoMain: { repository: "https://github.com/owner/repo", branch: "main" },
        },
      })

      expect(references.map((reference) => reference.kind)).toEqual(["git", "invalid", "git"])
      expect(references[1]?.kind).toBe("invalid")
      if (references[1]?.kind === "invalid") {
        expect(references[1].message).toContain("conflicts with @main")
        expect(references[1].message).toContain("@dev requests dev")
      }
    }),
  )

  scout.live("materializes configured git references during init", () =>
    provideTmpdirInstance(
      (_dir) =>
        Effect.gen(function* () {
          const fs = yield* AppFileSystem.Service
          const cache = path.join(Global.Path.repos, "github.com", "opencode-reference-test", "repo")
          yield* fs.remove(cache, { recursive: true }).pipe(Effect.ignore)
          yield* Effect.addFinalizer(() => fs.remove(cache, { recursive: true }).pipe(Effect.ignore))

          const source = yield* tmpdirScoped({ git: true })
          const remoteRoot = yield* tmpdirScoped()
          const remoteDir = path.join(remoteRoot, "opencode-reference-test")
          const remoteRepo = path.join(remoteDir, "repo.git")

          yield* Effect.promise(() => writeFile(path.join(source, "README.md"), "configured\n"))
          yield* git(source, ["add", "."])
          yield* git(source, ["commit", "-m", "add readme"])
          yield* fs.makeDirectory(remoteDir, { recursive: true }).pipe(Effect.orDie)
          yield* git(remoteRoot, ["clone", "--bare", source, remoteRepo])

          const reference = yield* Reference.Service
          yield* githubBase(
            githubBaseUrl(remoteRoot),
            Effect.gen(function* () {
              yield* reference.init()
              yield* waitForContent(fs, path.join(cache, "README.md"), "configured\n")
            }),
          )

          expect(yield* fs.existsSafe(path.join(cache, ".git"))).toBe(true)
          expect(yield* fs.readFileString(path.join(cache, "README.md"))).toBe("configured\n")

          const resolved = yield* reference.get("docs")
          expect(resolved?.kind).toBe("git")
          if (resolved?.kind === "git") expect(resolved.path).toBe(cache)
        }),
      {
        config: {
          reference: {
            docs: "opencode-reference-test/repo",
          },
        },
      },
    ),
  )

  scout.live("contains configured local references", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const docs = path.join(path.dirname(dir), "docs")
          const reference = yield* Reference.Service

          expect(yield* reference.contains(path.join(docs, "README.md"))).toBe(true)
          expect(yield* reference.contains(path.join(dir, "README.md"))).toBe(false)
        }),
      {
        config: {
          reference: {
            docs: { path: "../docs" },
          },
        },
      },
    ),
  )

  scout.live("refreshes configured git references on new instance init", () =>
    Effect.gen(function* () {
      const fs = yield* AppFileSystem.Service
      const cache = path.join(Global.Path.repos, "github.com", "opencode-reference-refresh", "repo")
      yield* fs.remove(cache, { recursive: true }).pipe(Effect.ignore)
      yield* Effect.addFinalizer(() => fs.remove(cache, { recursive: true }).pipe(Effect.ignore))

      const source = yield* tmpdirScoped({ git: true })
      const remoteRoot = yield* tmpdirScoped()
      const remoteDir = path.join(remoteRoot, "opencode-reference-refresh")
      const remoteRepo = path.join(remoteDir, "repo.git")

      yield* Effect.promise(() => writeFile(path.join(source, "README.md"), "v1\n"))
      yield* git(source, ["add", "."])
      yield* git(source, ["commit", "-m", "add readme"])
      yield* fs.makeDirectory(remoteDir, { recursive: true }).pipe(Effect.orDie)
      yield* git(remoteRoot, ["clone", "--bare", source, remoteRepo])

      yield* githubBase(
        githubBaseUrl(remoteRoot),
        provideTmpdirInstance(
          (_dir) =>
            Effect.gen(function* () {
              const reference = yield* Reference.Service
              yield* reference.init()
              yield* waitForContent(fs, path.join(cache, "README.md"), "v1\n")
            }),
          {
            config: {
              reference: {
                docs: "opencode-reference-refresh/repo",
              },
            },
          },
        ),
      )

      const branch = yield* git(source, ["branch", "--show-current"])
      yield* git(source, ["remote", "add", "origin", remoteRepo])
      yield* Effect.promise(() => writeFile(path.join(source, "README.md"), "v2\n"))
      yield* git(source, ["add", "."])
      yield* git(source, ["commit", "-m", "update readme"])
      yield* git(source, ["push", "origin", `${branch}:${branch}`])

      yield* githubBase(
        githubBaseUrl(remoteRoot),
        provideTmpdirInstance(
          (_dir) =>
            Effect.gen(function* () {
              const reference = yield* Reference.Service
              yield* reference.init()
              yield* waitForContent(fs, path.join(cache, "README.md"), "v2\n")
            }),
          {
            config: {
              reference: {
                docs: "opencode-reference-refresh/repo",
              },
            },
          },
        ),
      )
    }),
  )
})
