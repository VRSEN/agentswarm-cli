import { describe, expect, test } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { AgencyDistribution } from "../../src/agency-swarm/distribution"
import { Installation } from "../../src/installation"

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
  describe("method", () => {
    test("detects curl installs from the installer directory", async () => {
      const originalExecPath = process.execPath
      Object.defineProperty(process, "execPath", {
        value: `/Users/test/${AgencyDistribution.installDir}/bin/agentswarm`,
        configurable: true,
      })

      try {
        const layer = testLayer(() => jsonResponse({}))
        const result = await Effect.runPromise(
          Installation.Service.use((svc) => svc.method()).pipe(Effect.provide(layer)),
        )
        expect(result).toBe("curl")
      } finally {
        Object.defineProperty(process, "execPath", {
          value: originalExecPath,
          configurable: true,
        })
      }
    })
  })

  describe("latest", () => {
    test("reads release version from GitHub releases", async () => {
      let requestURL = ""
      const layer = testLayer((request) => {
        requestURL = request.url
        return jsonResponse({ tag_name: "v1.2.3" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.2.3")
      expect(requestURL).toBe(`https://api.github.com/repos/${AgencyDistribution.releaseRepo}/releases/latest`)
    })

    test("strips v prefix from GitHub release tag", async () => {
      const layer = testLayer(() => jsonResponse({ tag_name: "v4.0.0-beta.1" }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("curl")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("4.0.0-beta.1")
    })

    test("reads npm registry versions", async () => {
      let requestURL = ""
      const layer = testLayer(
        (request) => {
          requestURL = request.url
          return jsonResponse({ version: "1.5.0" })
        },
        (cmd, args) => {
          if (cmd === "npm" && args.includes("registry")) return "https://registry.npmjs.org\n"
          return ""
        },
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("npm")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.5.0")
      expect(requestURL).toBe(`https://registry.npmjs.org/${AgencyDistribution.packageName}/${Installation.CHANNEL}`)
    })

    test("reads npm registry versions for bun method", async () => {
      const layer = testLayer(
        () => jsonResponse({ version: "1.6.0" }),
        () => "",
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("bun")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.6.0")
    })
  })
})
