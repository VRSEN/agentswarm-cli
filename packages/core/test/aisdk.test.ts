import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AISDK } from "@opencode-ai/core/aisdk"
import { ModelV2 } from "@opencode-ai/core/model"
import { PluginV2 } from "@opencode-ai/core/plugin"
import { testEffect } from "./lib/effect"
import { model } from "./plugin/provider-helper"

const it = testEffect(AISDK.layer.pipe(Layer.provideMerge(PluginV2.defaultLayer)))

describe("AISDK", () => {
  it.effect("separates cached languages by resolved provider options", () =>
    Effect.gen(function* () {
      const plugin = yield* PluginV2.Service
      const aisdk = yield* AISDK.Service
      yield* plugin.add(
        PluginV2.define({
          id: PluginV2.ID.make("cache-test"),
          effect: Effect.succeed({
            "aisdk.sdk": Effect.fn(function* (evt) {
              evt.sdk = {
                languageModel: (id: string) =>
                  ({
                    id,
                    apiKey: evt.options.apiKey,
                    specificationVersion: "v3",
                  }) as unknown,
              }
            }),
          }),
        }),
      )

      const first = yield* aisdk.language(
        model("cached", "model", {
          apiID: ModelV2.ID.make("api-model"),
          options: {
            headers: {},
            body: {},
            aisdk: {
              provider: { apiKey: "first" },
              request: {},
            },
          },
        }),
      )
      const second = yield* aisdk.language(
        model("cached", "model", {
          apiID: ModelV2.ID.make("api-model"),
          options: {
            headers: {},
            body: {},
            aisdk: {
              provider: { apiKey: "second" },
              request: {},
            },
          },
        }),
      )

      expect(first).toMatchObject({ apiKey: "first" })
      expect(second).toMatchObject({ apiKey: "second" })
    }),
  )
})
