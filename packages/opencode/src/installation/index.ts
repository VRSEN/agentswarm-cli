import { Effect, Layer, Schema, Context, Stream } from "effect"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import path from "path"
import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Log } from "../util"

import semver from "semver"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { InstallationDistribution } from "./distribution"

const log = Log.create({ service: "installation" })

export type Method = "curl" | "npm" | "yarn" | "pnpm" | "bun" | "brew" | "scoop" | "choco" | "unknown"

export type ReleaseType = "patch" | "minor" | "major"

export const Event = {
  Updated: BusEvent.define(
    "installation.updated",
    Schema.Struct({
      version: Schema.String,
    }),
  ),
  UpdateAvailable: BusEvent.define(
    "installation.update-available",
    Schema.Struct({
      version: Schema.String,
    }),
  ),
}

export function getReleaseType(current: string, latest: string): ReleaseType {
  const currMajor = semver.major(current)
  const currMinor = semver.minor(current)
  const newMajor = semver.major(latest)
  const newMinor = semver.minor(latest)

  if (newMajor > currMajor) return "major"
  if (newMinor > currMinor) return "minor"
  return "patch"
}

export const Info = z
  .object({
    version: z.string(),
    latest: z.string(),
  })
  .meta({
    ref: "InstallationInfo",
  })
export type Info = z.infer<typeof Info>

export const USER_AGENT = `${InstallationDistribution.packageName}/${InstallationChannel}/${InstallationVersion}/${Flag.OPENCODE_CLIENT}`

export function isPreview() {
  return InstallationChannel !== "latest"
}

export function isLocal() {
  return InstallationChannel === "local"
}

export class UpgradeFailedError extends Schema.TaggedErrorClass<UpgradeFailedError>()("UpgradeFailedError", {
  stderr: Schema.String,
}) {}

function unsupportedUpgradeMethod(method: Method) {
  return `${InstallationDistribution.packageName} does not support ${method} upgrades. Use npm instead.`
}

export interface Interface {
  readonly info: () => Effect.Effect<Info>
  readonly method: () => Effect.Effect<Method>
  readonly latest: (method?: Method) => Effect.Effect<string>
  readonly upgrade: (method: Method, target: string) => Effect.Effect<void, UpgradeFailedError>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Installation") {}

export const layer: Layer.Layer<Service, never, ChildProcessSpawner.ChildProcessSpawner> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

    const text = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const proc = ChildProcess.make(cmd[0], cmd.slice(1), {
          cwd: opts?.cwd,
          env: opts?.env,
          extendEnv: true,
        })
        const handle = yield* spawner.spawn(proc)
        const out = yield* Stream.mkString(Stream.decodeText(handle.stdout))
        yield* handle.exitCode
        return out
      },
      Effect.scoped,
      Effect.catch(() => Effect.succeed("")),
    )

    const run = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const proc = ChildProcess.make(cmd[0], cmd.slice(1), {
          cwd: opts?.cwd,
          env: opts?.env,
          extendEnv: true,
        })
        const handle = yield* spawner.spawn(proc)
        const [stdout, stderr] = yield* Effect.all(
          [Stream.mkString(Stream.decodeText(handle.stdout)), Stream.mkString(Stream.decodeText(handle.stderr))],
          { concurrency: 2 },
        )
        const code = yield* handle.exitCode
        return { code, stdout, stderr }
      },
      Effect.scoped,
      Effect.catch(() => Effect.succeed({ code: ChildProcessSpawner.ExitCode(1), stdout: "", stderr: "" })),
    )

    // Use npm's resolver so registries, mirrors, auth, proxies, and dist-tags match upgrade behavior.
    const viewVersion = Effect.fnUntraced(function* (spec: string) {
      const result = yield* run(["npm", "view", spec, "version", "--json"])
      if (result.code !== 0 || !result.stdout.trim()) {
        return yield* new UpgradeFailedError({
          stderr: result.stderr || result.stdout || `Failed to resolve ${spec}`,
        })
      }
      return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.String))(result.stdout)
    })

    const result: Interface = {
      info: Effect.fn("Installation.info")(function* () {
        return {
          version: InstallationVersion,
          latest: yield* result.latest(),
        }
      }),
      method: Effect.fn("Installation.method")(function* () {
        if (process.execPath.includes(path.join(InstallationDistribution.installDir, "bin"))) return "curl" as Method
        if (process.execPath.includes(path.join(".local", "bin"))) return "curl" as Method
        const exec = process.execPath.toLowerCase()

        const checks: Array<{ name: Method; command: () => Effect.Effect<string> }> = [
          { name: "npm", command: () => text(["npm", "list", "-g", "--depth=0"]) },
          { name: "yarn", command: () => text(["yarn", "global", "list"]) },
          { name: "pnpm", command: () => text(["pnpm", "list", "-g", "--depth=0"]) },
          { name: "bun", command: () => text(["bun", "pm", "ls", "-g"]) },
          { name: "brew", command: () => text(["brew", "list", "--formula", "opencode"]) },
          { name: "scoop", command: () => text(["scoop", "list", "opencode"]) },
          { name: "choco", command: () => text(["choco", "list", "--limit-output", "opencode"]) },
        ]

        checks.sort((a, b) => {
          const aMatches = exec.includes(a.name)
          const bMatches = exec.includes(b.name)
          if (aMatches && !bMatches) return -1
          if (!aMatches && bMatches) return 1
          return 0
        })

        for (const check of checks) {
          const output = yield* check.command()
          if (output.includes(InstallationDistribution.packageName)) {
            return check.name
          }
        }

        return "unknown" as Method
      }),
      latest: Effect.fn("Installation.latest")(function* (installMethod?: Method) {
        const detectedMethod = installMethod || (yield* result.method())

        if (detectedMethod !== "npm") {
          return yield* new UpgradeFailedError({
            stderr: unsupportedUpgradeMethod(detectedMethod),
          })
        }

        return yield* viewVersion(`${InstallationDistribution.packageName}@${InstallationChannel}`)
      }, Effect.orDie),
      upgrade: Effect.fn("Installation.upgrade")(function* (m: Method, target: string) {
        let upgradeResult: { code: ChildProcessSpawner.ExitCode; stdout: string; stderr: string } | undefined
        switch (m) {
          case "curl":
            return yield* new UpgradeFailedError({
              stderr: unsupportedUpgradeMethod("curl"),
            })
          case "npm":
            upgradeResult = yield* run(["npm", "install", "-g", `${InstallationDistribution.packageName}@${target}`])
            break
          case "pnpm":
          case "bun":
          case "yarn":
            return yield* new UpgradeFailedError({
              stderr: unsupportedUpgradeMethod(m),
            })
          case "brew":
            return yield* new UpgradeFailedError({
              stderr: unsupportedUpgradeMethod("brew"),
            })
            break
          case "choco":
            return yield* new UpgradeFailedError({
              stderr: unsupportedUpgradeMethod("choco"),
            })
            break
          case "scoop":
            return yield* new UpgradeFailedError({
              stderr: unsupportedUpgradeMethod("scoop"),
            })
            break
          case "unknown":
            upgradeResult = yield* run(["npm", "install", "-g", `${InstallationDistribution.packageName}@${target}`])
            break
          default:
            return yield* new UpgradeFailedError({ stderr: `Unknown method: ${m}` })
        }
        if (!upgradeResult || upgradeResult.code !== 0) {
          const stderr = upgradeResult?.stderr || ""
          return yield* new UpgradeFailedError({ stderr })
        }
        log.info("upgraded", {
          method: m,
          target,
          stdout: upgradeResult.stdout,
          stderr: upgradeResult.stderr,
        })
        yield* text([process.execPath, "--version"])
      }),
    }

    return Service.of(result)
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(CrossSpawnSpawner.defaultLayer))

export * as Installation from "."
