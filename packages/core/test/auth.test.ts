import path from "path"
import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { AuthV2 } from "@opencode-ai/core/auth"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import { tmpdir } from "./fixture/tmpdir"

const authLayer = (data: string) =>
  AuthV2.layer.pipe(Layer.provide(AppFileSystem.defaultLayer), Layer.provide(Global.layerWith({ data })))

describe("AuthV2", () => {
  test("loads auth-v2 before legacy auth", async () => {
    await using tmp = await tmpdir()
    await Bun.write(
      path.join(tmp.path, "auth-v2.json"),
      JSON.stringify({
        version: 2,
        accounts: {
          current: {
            id: "current",
            serviceID: "anthropic",
            description: "current",
            credential: { type: "api", key: "current-key" },
          },
        },
        active: { anthropic: "current" },
      }),
    )
    await Bun.write(path.join(tmp.path, "auth.json"), JSON.stringify({ anthropic: { type: "api", key: "legacy-key" } }))

    const active = await Effect.gen(function* () {
      const auth = yield* AuthV2.Service
      return yield* auth.active(AuthV2.ServiceID.make("anthropic"))
    }).pipe(Effect.provide(authLayer(tmp.path)), Effect.runPromise)

    expect(active?.credential).toMatchObject({ type: "api", key: "current-key" })
  })

  test("migrates legacy well-known auth credentials", async () => {
    await using tmp = await tmpdir()
    await Bun.write(
      path.join(tmp.path, "auth.json"),
      JSON.stringify({
        "https://example.com": {
          type: "wellknown",
          key: "TOKEN",
          token: "well-known-token",
        },
      }),
    )

    const active = await Effect.gen(function* () {
      const auth = yield* AuthV2.Service
      return yield* auth.active(AuthV2.ServiceID.make("https://example.com"))
    }).pipe(Effect.provide(authLayer(tmp.path)), Effect.runPromise)

    expect(active?.credential).toMatchObject({ type: "wellknown", key: "TOKEN", token: "well-known-token" })
  })

  test("keeps env auth content in memory during legacy migration", async () => {
    await using tmp = await tmpdir()
    const previous = process.env.OPENCODE_AUTH_CONTENT
    process.env.OPENCODE_AUTH_CONTENT = JSON.stringify({ anthropic: { type: "api", key: "env-key" } })
    try {
      const active = await Effect.gen(function* () {
        const auth = yield* AuthV2.Service
        return yield* auth.active(AuthV2.ServiceID.make("anthropic"))
      }).pipe(Effect.provide(authLayer(tmp.path)), Effect.runPromise)

      expect(active?.credential).toMatchObject({ type: "api", key: "env-key" })
      expect(await Bun.file(path.join(tmp.path, "auth-v2.json")).exists()).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.OPENCODE_AUTH_CONTENT
      else process.env.OPENCODE_AUTH_CONTENT = previous
    }
  })
})
