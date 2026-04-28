import { describe, expect, test } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationDistribution } from "../../src/installation/distribution"
import { InstallationChannel } from "@opencode-ai/core/installation/version"

const encoder = new TextEncoder()

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

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function testLayer(
  httpHandler: (request: HttpClientRequest.HttpClientRequest) => Response,
  spawnHandler?: (cmd: string, args: readonly string[]) => string,
) {
  return Installation.layer.pipe(Layer.provide(mockHttpClient(httpHandler)), Layer.provide(mockSpawner(spawnHandler)))
}

describe("installation", () => {
  describe("latest", () => {
    test("reads release version from GitHub releases", async () => {
      const urls: string[] = []
      const layer = testLayer((request) => {
        urls.push(request.url)
        return jsonResponse({ tag_name: "v1.2.3" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.2.3")
      expect(urls).toEqual([`https://api.github.com/repos/${InstallationDistribution.releaseRepo}/releases/latest`])
    })

    test("strips v prefix from GitHub release tag", async () => {
      const layer = testLayer(() => jsonResponse({ tag_name: "v4.0.0-beta.1" }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("curl")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("4.0.0-beta.1")
    })

    test("reads npm versions via npm view", async () => {
      const calls: string[][] = []
      const layer = testLayer(
        () => {
          throw new Error("unexpected http request")
        },
        (cmd, args) => {
          calls.push([cmd, ...args])
          if (cmd === "npm" && args[0] === "view") return '"1.5.0"\n'
          return ""
        },
      )

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

    test("reads npm versions via bun pm view", async () => {
      const calls: string[][] = []
      const layer = testLayer(
        () => {
          throw new Error("unexpected http request")
        },
        (cmd, args) => {
          calls.push([cmd, ...args])
          if (cmd === "bun" && args[0] === "pm") return '"1.6.0"\n'
          return ""
        },
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("bun")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.6.0")
      expect(calls).toContainEqual([
        "bun",
        "pm",
        "view",
        `${InstallationDistribution.packageName}@${InstallationChannel}`,
        "version",
        "--json",
      ])
    })

    test("reads npm versions via pnpm view", async () => {
      const calls: string[][] = []
      const layer = testLayer(
        () => {
          throw new Error("unexpected http request")
        },
        (cmd, args) => {
          calls.push([cmd, ...args])
          if (cmd === "pnpm" && args[0] === "view") return '"1.7.0"\n'
          return ""
        },
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("pnpm")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.7.0")
      expect(calls).toContainEqual([
        "pnpm",
        "view",
        `${InstallationDistribution.packageName}@${InstallationChannel}`,
        "version",
        "--json",
      ])
    })

    test("does not read unsupported package-manager release feeds", async () => {
      const urls: string[] = []
      const layer = testLayer((request) => {
        urls.push(request.url)
        return jsonResponse({})
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
      expect(urls).toEqual([])
    })
  })

  describe("upgrade", () => {
    test("installs the fork npm package", async () => {
      const calls: string[][] = []
      const layer = testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          calls.push([cmd, ...args])
          return ""
        },
      )

      await Effect.runPromise(
        Installation.Service.use((svc) => svc.upgrade("npm", "1.2.3")).pipe(Effect.provide(layer)),
      )
      expect(calls).toContainEqual(["npm", "install", "-g", `${InstallationDistribution.packageName}@1.2.3`])
    })
  })
})
