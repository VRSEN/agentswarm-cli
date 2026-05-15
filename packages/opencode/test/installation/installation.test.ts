import { describe, expect, test } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationDistribution } from "../../src/installation/distribution"
import { InstallationChannel } from "@opencode-ai/core/installation/version"

const encoder = new TextEncoder()

function mockSpawner(handler: (cmd: string, args: readonly string[]) => string = () => "") {
  const spawner = ChildProcessSpawner.make((command) => {
    const std = ChildProcess.isStandardCommand(command) ? command : undefined
    const output = handler(std?.command ?? "", std?.args ?? [])
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(0),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: { [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") } as any,
        stdout: output ? Stream.make(encoder.encode(output)) : Stream.empty,
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => ({ [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") }) as any,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void),
      }),
    )
  })
  return Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)
}

function testLayer(spawnHandler?: (cmd: string, args: readonly string[]) => string) {
  return Installation.layer.pipe(Layer.provide(mockSpawner(spawnHandler)))
}

describe("installation", () => {
  test("uses agentswarm-cli as the default standalone package", () => {
    expect(InstallationDistribution.packageName).toBe("agentswarm-cli")
  })

  describe("method", () => {
    test("detects existing direct agentswarm-cli npm installs", async () => {
      const layer = testLayer((cmd, args) => {
        if (cmd === "npm" && args[0] === "list") return "/usr/local/lib\n└── agentswarm-cli@1.2.3\n"
        return ""
      })

      const method = await Effect.runPromise(
        Installation.Service.use((svc) => svc.method()).pipe(Effect.provide(layer)),
      )

      expect(method).toBe("npm")
    })
  })

  describe("latest", () => {
    test("rejects unknown latest lookup", async () => {
      const layer = testLayer()

      await expect(
        Effect.runPromise(Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer))),
      ).rejects.toMatchObject({
        stderr: `${InstallationDistribution.packageName} does not support unknown upgrades. Use npm instead.`,
      })
    })

    test("rejects curl latest lookup", async () => {
      const layer = testLayer()

      await expect(
        Effect.runPromise(Installation.Service.use((svc) => svc.latest("curl")).pipe(Effect.provide(layer))),
      ).rejects.toMatchObject({
        stderr: `${InstallationDistribution.packageName} does not support curl upgrades. Use npm instead.`,
      })
    })

    test("reads npm versions via npm view", async () => {
      const calls: string[][] = []
      const layer = testLayer((cmd, args) => {
        calls.push([cmd, ...args])
        if (cmd === "npm" && args[0] === "view") return '"1.5.0"\n'
        return ""
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("npm")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.5.0")
      expect(calls).toContainEqual([
        "npm",
        "view",
        `${InstallationDistribution.packageName}@${InstallationChannel}`,
        "version",
        "--json",
      ])
    })

    test("does not probe unsupported package-manager release feeds", async () => {
      const calls: string[][] = []
      const layer = testLayer((cmd, args) => {
        calls.push([cmd, ...args])
        return ""
      })

      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("scoop")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("choco")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("brew")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("yarn")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("pnpm")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("bun")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      await Effect.runPromise(Installation.Service.use((svc) => svc.latest("curl")).pipe(Effect.provide(layer))).catch(
        () => {},
      )
      expect(calls).toEqual([])
    })
  })

  describe("upgrade", () => {
    test("installs the fork npm package", async () => {
      const calls: string[][] = []
      const layer = testLayer((cmd, args) => {
        calls.push([cmd, ...args])
        return ""
      })

      await Effect.runPromise(
        Installation.Service.use((svc) => svc.upgrade("npm", "1.2.3")).pipe(Effect.provide(layer)),
      )
      expect(calls).toContainEqual(["npm", "install", "-g", `${InstallationDistribution.packageName}@1.2.3`])
    })

    test("rejects unsupported upgrade methods", async () => {
      const layer = testLayer()
      const methods: Installation.Method[] = ["yarn", "pnpm", "bun", "curl", "brew", "choco", "scoop"]

      for (const method of methods) {
        await expect(
          Effect.runPromise(
            Installation.Service.use((svc) => svc.upgrade(method, "1.2.3")).pipe(Effect.provide(layer)),
          ),
        ).rejects.toMatchObject({
          stderr: `${InstallationDistribution.packageName} does not support ${method} upgrades. Use npm instead.`,
        })
      }
    })
  })
})
