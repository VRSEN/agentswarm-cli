import { describe, expect, test } from "bun:test"
import { Cause, Effect, Exit, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationDistribution } from "../../src/installation/distribution"
import { InstallationChannel } from "@opencode-ai/core/installation/version"
import { AppProcess } from "@opencode-ai/core/process"
import { testEffect } from "../lib/effect"

const encoder = new TextEncoder()

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function mockHttpClient(handler: (request: HttpClientRequest.HttpClientRequest) => Response) {
  const client = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, handler(request))))
  return Layer.succeed(HttpClient.HttpClient, client)
}

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

function testLayer(
  httpHandler: (request: HttpClientRequest.HttpClientRequest) => Response = () => jsonResponse({ version: "1.0.0" }),
  spawnHandler?: (cmd: string, args: readonly string[]) => string,
) {
  const appProcess = AppProcess.layer.pipe(Layer.provide(mockSpawner(spawnHandler)))
  return Installation.layer.pipe(Layer.provide(mockHttpClient(httpHandler)), Layer.provide(appProcess))
}

describe("installation", () => {
  test("uses agentswarm-cli as the default standalone package", () => {
    expect(InstallationDistribution.packageName).toBe("agentswarm-cli")
  })

  describe("method", () => {
    testEffect(
      testLayer(undefined, (cmd, args) => {
        if (cmd === "npm" && args[0] === "list") return "/usr/local/lib\n└── agentswarm-cli@1.2.3\n"
        return ""
      }),
    ).effect("detects existing direct agentswarm-cli npm installs", () =>
      Effect.gen(function* () {
        const method = yield* Installation.Service.use((svc) => svc.method())
        expect(method).toBe("npm")
      }),
    )
  })

  describe("latest", () => {
    const expectUnsupportedLatest = Effect.fnUntraced(function* (method: Installation.Method) {
      const exit = yield* Installation.Service.use((svc) => svc.latest(method)).pipe(Effect.exit)
      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        expect(Cause.squash(exit.cause)).toMatchObject({
          stderr: `${InstallationDistribution.packageName} does not support ${method} upgrades. Use npm instead.`,
        })
      }
    })

    testEffect(
      testLayer(undefined, (cmd, args) => {
        expect([cmd, ...args]).toEqual([
          "npm",
          "view",
          `${InstallationDistribution.packageName}@${InstallationChannel}`,
          "version",
          "--json",
        ])
        return JSON.stringify("1.5.0")
      }),
    ).effect("uses npm resolver for unknown latest lookup", () =>
      Effect.gen(function* () {
        const result = yield* Installation.Service.use((svc) => svc.latest("unknown"))
        expect(result).toBe("1.5.0")
      }),
    )

    testEffect(testLayer()).effect("rejects curl latest lookup", () =>
      Effect.gen(function* () {
        yield* expectUnsupportedLatest("curl")
      }),
    )

    const npmCalls: string[][] = []
    testEffect(
      testLayer(undefined, (cmd, args) => {
        npmCalls.push([cmd, ...args])
        return JSON.stringify("1.5.0")
      }),
    ).effect("reads npm versions via npm resolver", () =>
      Effect.gen(function* () {
        const result = yield* Installation.Service.use((svc) => svc.latest("npm"))
        expect(result).toBe("1.5.0")
        expect(npmCalls).toContainEqual([
          "npm",
          "view",
          `${InstallationDistribution.packageName}@${InstallationChannel}`,
          "version",
          "--json",
        ])
      }),
    )

    testEffect(
      testLayer((request) => {
        throw new Error(`unexpected request: ${request.url}`)
      }),
    ).effect("does not probe unsupported package-manager release feeds", () =>
      Effect.gen(function* () {
        const methods: Installation.Method[] = ["scoop", "choco", "brew", "yarn", "pnpm", "bun", "curl"]
        for (const method of methods) {
          yield* expectUnsupportedLatest(method)
        }
      }),
    )
  })

  describe("upgrade", () => {
    testEffect(
      testLayer(undefined, (cmd, args) => {
        calls.push([cmd, ...args])
        return ""
      }),
    ).effect("installs the fork npm package", () =>
      Effect.gen(function* () {
        calls.length = 0
        yield* Installation.Service.use((svc) => svc.upgrade("npm", "1.2.3"))
        yield* Installation.Service.use((svc) => svc.upgrade("unknown", "1.2.3"))
        const installs = calls.filter((call) => call[0] === "npm" && call[1] === "install")
        expect(installs).toEqual([
          ["npm", "install", "-g", `${InstallationDistribution.packageName}@1.2.3`],
          ["npm", "install", "-g", `${InstallationDistribution.packageName}@1.2.3`],
        ])
      }),
    )

    const methods: Installation.Method[] = ["yarn", "pnpm", "bun", "curl", "brew", "choco", "scoop"]
    for (const method of methods) {
      testEffect(testLayer()).effect(`rejects ${method} upgrades`, () =>
        Effect.gen(function* () {
          yield* Effect.flip(Installation.Service.use((svc) => svc.upgrade(method, "1.2.3"))).pipe(
            Effect.map((error) => {
              expect(error).toMatchObject({
                stderr: `${InstallationDistribution.packageName} does not support ${method} upgrades. Use npm instead.`,
              })
            }),
          )
        }),
      )
    }
  })
})

const calls: string[][] = []
