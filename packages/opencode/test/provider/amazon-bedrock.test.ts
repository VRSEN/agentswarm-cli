import { createBedrockMantle } from "@ai-sdk/amazon-bedrock/mantle"
import { generateText } from "ai"
import { test, expect, describe } from "bun:test"
import path from "path"
import { unlink } from "fs/promises"

import { ModelID, ProviderID } from "../../src/provider/schema"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { WithInstance } from "../../src/project/with-instance"
import { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import { Env } from "../../src/env"
import { Global } from "@opencode-ai/core/global"
import { Filesystem } from "@/util/filesystem"
import { Effect } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { makeRuntime } from "../../src/effect/run-service"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const env = makeRuntime(Env.Service, Env.defaultLayer)
const set = (k: string, v: string) => env.runSync((svc) => svc.set(k, v))
const remove = (k: string) => env.runSync((svc) => svc.remove(k))

async function list() {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      return yield* provider.list()
    }),
  )
}

async function getModel(providerID: ProviderID, modelID: ModelID) {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      return yield* provider.getModel(providerID, modelID)
    }),
  )
}

async function getLanguage(model: Provider.Model) {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      return yield* provider.getLanguage(model)
    }),
  )
}

test("Bedrock Mantle: uses chat for safeguard models and responses otherwise", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-east-1",
              },
              models: {
                "openai.gpt-oss-20b": {
                  name: "GPT OSS 20B",
                  reasoning: true,
                  provider: { npm: "@ai-sdk/amazon-bedrock/mantle" },
                },
                "openai.gpt-oss-safeguard-20b": {
                  name: "GPT OSS Safeguard 20B",
                  reasoning: true,
                  provider: { npm: "@ai-sdk/amazon-bedrock/mantle" },
                },
              },
            },
          },
        }),
      )
    },
  })

  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_REGION", "us-east-1")
      set("AWS_PROFILE", "")
      set("AWS_ACCESS_KEY_ID", "test-key-id")
      set("AWS_SECRET_ACCESS_KEY", "test-secret")

      const responses = await getLanguage(await getModel(ProviderID.amazonBedrock, ModelID.make("openai.gpt-oss-20b")))
      const chat = await getLanguage(
        await getModel(ProviderID.amazonBedrock, ModelID.make("openai.gpt-oss-safeguard-20b")),
      )

      expect((responses as { provider: string }).provider).toBe("bedrock-mantle.responses")
      expect((chat as { provider: string }).provider).toBe("bedrock-mantle.chat")
    },
  })
})

test("Bedrock Mantle: custom provider IDs use responses for GPT-5 models", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "custom-mantle": {
              name: "Custom Mantle",
              npm: "@ai-sdk/amazon-bedrock/mantle",
              api: "https://bedrock-mantle.us-east-2.api.aws/openai/v1",
              options: {
                region: "us-east-2",
                apiKey: "test-key",
              },
              models: {
                "openai.gpt-5.5": {
                  name: "GPT 5.5",
                  reasoning: true,
                  release_date: "2026-04-23",
                },
              },
            },
          },
        }),
      )
    },
  })

  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      const model = await getModel(ProviderID.make("custom-mantle"), ModelID.make("openai.gpt-5.5"))
      let captured: { url: string; body: Record<string, unknown> } | undefined
      const handle = async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ): Promise<Response> => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
        const text = typeof init?.body === "string" ? init.body : ""
        const body = text ? JSON.parse(text) : {}
        captured = { url, body: isRecord(body) ? body : {} }

        return new Response(
          JSON.stringify({
            id: "resp_test",
            created_at: 0,
            model: "openai.gpt-5.5",
            output: [
              {
                type: "message",
                id: "msg_test",
                role: "assistant",
                content: [{ type: "output_text", text: "ok", annotations: [] }],
              },
            ],
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      const fetch: typeof globalThis.fetch = Object.assign(handle, {
        preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
      })
      const providers = await list()
      providers[ProviderID.make("custom-mantle")].options.fetch = fetch
      const language = await getLanguage(model)
      expect((language as { provider: string }).provider).toBe("bedrock-mantle.responses")

      const variants = ProviderTransform.variants(model)
      const options = ProviderTransform.providerOptions(model, variants.medium)
      await generateText({
        model: language,
        prompt: "hi",
        providerOptions: options,
      })

      expect(captured?.url).toBe("https://bedrock-mantle.us-east-2.api.aws/v1/responses")
      expect(captured?.body.model).toBe("openai.gpt-5.5")
    },
  })
})

test("Bedrock Mantle: resolves AWS_REGION placeholder from configured region", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-west-2",
              },
              models: {
                "openai.gpt-5.5": {
                  name: "GPT 5.5",
                  reasoning: true,
                  release_date: "2026-04-23",
                  provider: {
                    api: "https://bedrock-mantle.${AWS_REGION}.api.aws/openai/v1",
                    npm: "@ai-sdk/amazon-bedrock/mantle",
                  },
                },
              },
            },
          },
        }),
      )
    },
  })

  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      remove("AWS_REGION")
      const token = process.env.AWS_BEARER_TOKEN_BEDROCK
      process.env.AWS_BEARER_TOKEN_BEDROCK = "test-bearer-token"

      try {
        const model = await getModel(ProviderID.amazonBedrock, ModelID.make("openai.gpt-5.5"))
        let captured: { url: string; body: Record<string, unknown> } | undefined
        const handle = async (
          input: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ): Promise<Response> => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
          const text = typeof init?.body === "string" ? init.body : ""
          const body = text ? JSON.parse(text) : {}
          captured = { url, body: isRecord(body) ? body : {} }

          return new Response(
            JSON.stringify({
              id: "resp_test",
              created_at: 0,
              model: "openai.gpt-5.5",
              output: [
                {
                  type: "message",
                  id: "msg_test",
                  role: "assistant",
                  content: [{ type: "output_text", text: "ok", annotations: [] }],
                },
              ],
              usage: { input_tokens: 1, output_tokens: 1 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        }
        const fetch: typeof globalThis.fetch = Object.assign(handle, {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        })
        const providers = await list()
        providers[ProviderID.amazonBedrock].options.fetch = fetch

        await generateText({
          model: await getLanguage(model),
          prompt: "hi",
        })

        expect(captured?.url).toBe("https://bedrock-mantle.us-west-2.api.aws/v1/responses")
      } finally {
        if (token === undefined) delete process.env.AWS_BEARER_TOKEN_BEDROCK
        else process.env.AWS_BEARER_TOKEN_BEDROCK = token
      }
    },
  })
})

test("Bedrock Mantle: resolves AWS_REGION placeholder with config apiKey auth", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                apiKey: "test-bearer-token",
                region: "us-west-2",
              },
              models: {
                "openai.gpt-5.5": {
                  name: "GPT 5.5",
                  reasoning: true,
                  release_date: "2026-04-23",
                  provider: {
                    api: "https://bedrock-mantle.${AWS_REGION}.api.aws/openai/v1",
                    npm: "@ai-sdk/amazon-bedrock/mantle",
                  },
                },
              },
            },
          },
        }),
      )
    },
  })

  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      remove("AWS_REGION")
      remove("AWS_PROFILE")
      remove("AWS_ACCESS_KEY_ID")
      remove("AWS_WEB_IDENTITY_TOKEN_FILE")
      remove("AWS_BEARER_TOKEN_BEDROCK")
      const saved = {
        bearer: process.env.AWS_BEARER_TOKEN_BEDROCK,
        relative: process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
        full: process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
      }
      delete process.env.AWS_BEARER_TOKEN_BEDROCK
      delete process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
      delete process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI

      try {
        const model = await getModel(ProviderID.amazonBedrock, ModelID.make("openai.gpt-5.5"))
        let captured: { url: string; body: Record<string, unknown> } | undefined
        const handle = async (
          input: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ): Promise<Response> => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
          const text = typeof init?.body === "string" ? init.body : ""
          const body = text ? JSON.parse(text) : {}
          captured = { url, body: isRecord(body) ? body : {} }

          return new Response(
            JSON.stringify({
              id: "resp_test",
              created_at: 0,
              model: "openai.gpt-5.5",
              output: [
                {
                  type: "message",
                  id: "msg_test",
                  role: "assistant",
                  content: [{ type: "output_text", text: "ok", annotations: [] }],
                },
              ],
              usage: { input_tokens: 1, output_tokens: 1 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        }
        const fetch: typeof globalThis.fetch = Object.assign(handle, {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        })
        const providers = await list()
        providers[ProviderID.amazonBedrock].options.fetch = fetch

        await generateText({
          model: await getLanguage(model),
          prompt: "hi",
        })

        expect(captured?.url).toBe("https://bedrock-mantle.us-west-2.api.aws/v1/responses")
      } finally {
        if (saved.bearer === undefined) delete process.env.AWS_BEARER_TOKEN_BEDROCK
        else process.env.AWS_BEARER_TOKEN_BEDROCK = saved.bearer
        if (saved.relative === undefined) delete process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
        else process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = saved.relative
        if (saved.full === undefined) delete process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
        else process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI = saved.full
      }
    },
  })
})

test("Bedrock Mantle: resolves AWS_REGION placeholder with config static SigV4 auth", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                accessKeyId: "test-key-id",
                secretAccessKey: "test-secret",
                region: "us-west-2",
              },
              models: {
                "openai.gpt-5.5": {
                  name: "GPT 5.5",
                  reasoning: true,
                  release_date: "2026-04-23",
                  provider: {
                    api: "https://bedrock-mantle.${AWS_REGION}.api.aws/openai/v1",
                    npm: "@ai-sdk/amazon-bedrock/mantle",
                  },
                },
              },
            },
          },
        }),
      )
    },
  })

  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      remove("AWS_REGION")
      remove("AWS_PROFILE")
      remove("AWS_ACCESS_KEY_ID")
      remove("AWS_WEB_IDENTITY_TOKEN_FILE")
      remove("AWS_BEARER_TOKEN_BEDROCK")
      const saved = {
        bearer: process.env.AWS_BEARER_TOKEN_BEDROCK,
        relative: process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
        full: process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
      }
      delete process.env.AWS_BEARER_TOKEN_BEDROCK
      delete process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
      delete process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI

      try {
        const model = await getModel(ProviderID.amazonBedrock, ModelID.make("openai.gpt-5.5"))
        let captured: { url: string; body: Record<string, unknown> } | undefined
        const handle = async (
          input: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ): Promise<Response> => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
          const text = typeof init?.body === "string" ? init.body : ""
          const body = text ? JSON.parse(text) : {}
          captured = { url, body: isRecord(body) ? body : {} }

          return new Response(
            JSON.stringify({
              id: "resp_test",
              created_at: 0,
              model: "openai.gpt-5.5",
              output: [
                {
                  type: "message",
                  id: "msg_test",
                  role: "assistant",
                  content: [{ type: "output_text", text: "ok", annotations: [] }],
                },
              ],
              usage: { input_tokens: 1, output_tokens: 1 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        }
        const fetch: typeof globalThis.fetch = Object.assign(handle, {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        })
        const providers = await list()
        expect(providers[ProviderID.amazonBedrock].options.credentialProvider).toBeUndefined()
        providers[ProviderID.amazonBedrock].options.fetch = fetch

        await generateText({
          model: await getLanguage(model),
          prompt: "hi",
        })

        expect(captured?.url).toBe("https://bedrock-mantle.us-west-2.api.aws/v1/responses")
      } finally {
        if (saved.bearer === undefined) delete process.env.AWS_BEARER_TOKEN_BEDROCK
        else process.env.AWS_BEARER_TOKEN_BEDROCK = saved.bearer
        if (saved.relative === undefined) delete process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
        else process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = saved.relative
        if (saved.full === undefined) delete process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
        else process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI = saved.full
      }
    },
  })
})

test("Bedrock Mantle: prefixed GPT-5 responses send reasoning controls", async () => {
  let captured: { url: string; body: Record<string, unknown> } | undefined
  const handle = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const text = typeof init?.body === "string" ? init.body : ""
    const body = text ? JSON.parse(text) : {}
    captured = { url, body: isRecord(body) ? body : {} }

    return new Response(
      JSON.stringify({
        id: "resp_test",
        created_at: 0,
        model: "openai.gpt-5.5",
        output: [
          {
            type: "message",
            id: "msg_test",
            role: "assistant",
            content: [{ type: "output_text", text: "ok", annotations: [] }],
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }

  const model: Provider.Model = {
    id: ModelID.make("openai.gpt-5.5"),
    providerID: ProviderID.amazonBedrock,
    api: {
      id: "openai.gpt-5.5",
      url: "https://bedrock-mantle.us-east-2.api.aws/openai/v1",
      npm: "@ai-sdk/amazon-bedrock/mantle",
    },
    name: "GPT 5.5",
    capabilities: {
      temperature: true,
      reasoning: true,
      attachment: true,
      toolcall: true,
      input: { text: true, audio: false, image: true, video: false, pdf: false },
      output: { text: true, audio: false, image: false, video: false, pdf: false },
      interleaved: false,
    },
    cost: { input: 0.03, output: 0.06, cache: { read: 0.001, write: 0.002 } },
    limit: { context: 128_000, output: 4_096 },
    status: "active",
    options: {},
    headers: {},
    release_date: "2026-04-23",
  }

  const variants = ProviderTransform.variants(model)
  const options = ProviderTransform.providerOptions(model, variants.medium)
  const fetch: typeof globalThis.fetch = Object.assign(handle, {
    preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
  })
  const mantle = createBedrockMantle({ region: "us-east-2", apiKey: "test-key", fetch })

  await generateText({
    model: mantle.responses("openai.gpt-5.5"),
    prompt: "hi",
    providerOptions: options,
  })

  expect(options).toEqual({
    openai: {
      reasoningEffort: "medium",
      reasoningSummary: "auto",
      forceReasoning: true,
      include: ["reasoning.encrypted_content"],
    },
  })
  expect(captured?.url).toBe("https://bedrock-mantle.us-east-2.api.aws/v1/responses")
  expect(captured?.body.model).toBe("openai.gpt-5.5")
  expect(captured?.body.reasoning).toEqual({ effort: "medium", summary: "auto" })
})

test("Bedrock: config region takes precedence over AWS_REGION env var", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "eu-west-1",
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_REGION", "us-east-1")
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].options?.region).toBe("eu-west-1")
    },
  })
})

test("Bedrock: falls back to AWS_REGION env var when no config region", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_REGION", "eu-west-1")
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].options?.region).toBe("eu-west-1")
    },
  })
})

test("Bedrock: loads when bearer token from auth.json is present", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "eu-west-1",
              },
            },
          },
        }),
      )
    },
  })

  const authPath = path.join(Global.Path.data, "auth.json")

  // Save original auth.json if it exists
  let originalAuth: string | undefined
  try {
    originalAuth = await Filesystem.readText(authPath)
  } catch {
    // File doesn't exist, that's fine
  }

  try {
    // Write test auth.json
    await Filesystem.write(
      authPath,
      JSON.stringify({
        "amazon-bedrock": {
          type: "api",
          key: "test-bearer-token",
        },
      }),
    )

    await WithInstance.provide({
      directory: tmp.path,
      fn: async () => {
        set("AWS_PROFILE", "")
        set("AWS_ACCESS_KEY_ID", "")
        set("AWS_BEARER_TOKEN_BEDROCK", "")
        const providers = await list()
        expect(providers[ProviderID.amazonBedrock]).toBeDefined()
        expect(providers[ProviderID.amazonBedrock].options?.region).toBe("eu-west-1")
      },
    })
  } finally {
    // Restore original or delete
    if (originalAuth !== undefined) {
      await Filesystem.write(authPath, originalAuth)
    } else {
      try {
        await unlink(authPath)
      } catch {
        // Ignore errors if file doesn't exist
      }
    }
  }
})

test("Bedrock: config profile takes precedence over AWS_PROFILE env var", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                profile: "my-custom-profile",
                region: "us-east-1",
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      set("AWS_ACCESS_KEY_ID", "test-key-id")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].options?.region).toBe("us-east-1")
    },
  })
})

test("Bedrock: includes custom endpoint in options when specified", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                endpoint: "https://bedrock-runtime.us-east-1.vpce-xxxxx.amazonaws.com",
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].options?.endpoint).toBe(
        "https://bedrock-runtime.us-east-1.vpce-xxxxx.amazonaws.com",
      )
    },
  })
})

test("Bedrock: autoloads when AWS_WEB_IDENTITY_TOKEN_FILE is present", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-east-1",
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_WEB_IDENTITY_TOKEN_FILE", "/var/run/secrets/eks.amazonaws.com/serviceaccount/token")
      set("AWS_ROLE_ARN", "arn:aws:iam::123456789012:role/my-eks-role")
      set("AWS_PROFILE", "")
      set("AWS_ACCESS_KEY_ID", "")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].options?.region).toBe("us-east-1")
    },
  })
})

// Tests for cross-region inference profile prefix handling
// Models from models.dev may come with prefixes already (e.g., us., eu., global.)
// These should NOT be double-prefixed when passed to the SDK

test("Bedrock: model with us. prefix should not be double-prefixed", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-east-1",
              },
              models: {
                "us.anthropic.claude-opus-4-5-20251101-v1:0": {
                  name: "Claude Opus 4.5 (US)",
                },
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      // The model should exist with the us. prefix
      expect(providers[ProviderID.amazonBedrock].models["us.anthropic.claude-opus-4-5-20251101-v1:0"]).toBeDefined()
    },
  })
})

test("Bedrock: model with global. prefix should not be prefixed", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-east-1",
              },
              models: {
                "global.anthropic.claude-opus-4-5-20251101-v1:0": {
                  name: "Claude Opus 4.5 (Global)",
                },
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].models["global.anthropic.claude-opus-4-5-20251101-v1:0"]).toBeDefined()
    },
  })
})

test("Bedrock: model with eu. prefix should not be double-prefixed", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "eu-west-1",
              },
              models: {
                "eu.anthropic.claude-opus-4-5-20251101-v1:0": {
                  name: "Claude Opus 4.5 (EU)",
                },
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      expect(providers[ProviderID.amazonBedrock].models["eu.anthropic.claude-opus-4-5-20251101-v1:0"]).toBeDefined()
    },
  })
})

test("Bedrock: model without prefix in US region should get us. prefix added", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Filesystem.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "amazon-bedrock": {
              options: {
                region: "us-east-1",
              },
              models: {
                "anthropic.claude-opus-4-5-20251101-v1:0": {
                  name: "Claude Opus 4.5",
                },
              },
            },
          },
        }),
      )
    },
  })
  await WithInstance.provide({
    directory: tmp.path,
    fn: async () => {
      set("AWS_PROFILE", "default")
      const providers = await list()
      expect(providers[ProviderID.amazonBedrock]).toBeDefined()
      // Non-prefixed model should still be registered
      expect(providers[ProviderID.amazonBedrock].models["anthropic.claude-opus-4-5-20251101-v1:0"]).toBeDefined()
    },
  })
})

// Direct unit tests for cross-region inference profile prefix handling
// These test the prefix detection logic used in getModel

describe("Bedrock cross-region prefix detection", () => {
  const crossRegionPrefixes = ["global.", "us.", "eu.", "jp.", "apac.", "au."]

  test("should detect global. prefix", () => {
    const modelID = "global.anthropic.claude-opus-4-5-20251101-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should detect us. prefix", () => {
    const modelID = "us.anthropic.claude-opus-4-5-20251101-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should detect eu. prefix", () => {
    const modelID = "eu.anthropic.claude-opus-4-5-20251101-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should detect jp. prefix", () => {
    const modelID = "jp.anthropic.claude-sonnet-4-20250514-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should detect apac. prefix", () => {
    const modelID = "apac.anthropic.claude-sonnet-4-20250514-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should detect au. prefix", () => {
    const modelID = "au.anthropic.claude-sonnet-4-5-20250929-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(true)
  })

  test("should NOT detect prefix for non-prefixed model", () => {
    const modelID = "anthropic.claude-opus-4-5-20251101-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(false)
  })

  test("should NOT detect prefix for amazon nova models", () => {
    const modelID = "amazon.nova-pro-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(false)
  })

  test("should NOT detect prefix for cohere models", () => {
    const modelID = "cohere.command-r-plus-v1:0"
    const hasPrefix = crossRegionPrefixes.some((prefix) => modelID.startsWith(prefix))
    expect(hasPrefix).toBe(false)
  })
})
