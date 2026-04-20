import { describe, expect, test } from "bun:test"
import {
  hasClientConfigCredential,
  hasExplicitOpenAIApiKey,
  hasExplicitOpenAIClientConfig,
  sanitizeClientConfigForTransport,
  sanitizeHeaderLikeString,
} from "../../src/agency-swarm/client-config"
import {
  buildLitellmModelForClientConfig,
  isOpenAIBasedLitellmModel,
  normalizeExplicitClientConfigModel,
} from "../../src/agency-swarm/litellm-provider"

describe("agency-swarm client config credentials", () => {
  test("treats api_key and LiteLLM keys as credentials", () => {
    expect(hasClientConfigCredential({ api_key: "sk-openai" })).toBe(true)
    expect(
      hasClientConfigCredential({
        litellm_keys: {
          anthropic: "sk-ant",
        },
      }),
    ).toBe(true)
  })

  test("treats Authorization headers as credentials", () => {
    expect(
      hasClientConfigCredential({
        default_headers: {
          Authorization: "Bearer proxy-token",
        },
      }),
    ).toBe(true)
    expect(
      hasExplicitOpenAIClientConfig({
        default_headers: {
          Authorization: "Bearer proxy-token",
        },
      }),
    ).toBe(true)
  })

  test("ignores non-auth headers", () => {
    expect(
      hasClientConfigCredential({
        default_headers: {
          "x-proxy": "1",
        },
      }),
    ).toBe(false)
  })

  test("hasExplicitOpenAIApiKey is false for header-only auth", () => {
    expect(
      hasExplicitOpenAIApiKey({
        default_headers: {
          Authorization: "Bearer proxy-token",
        },
      }),
    ).toBe(false)
    expect(hasExplicitOpenAIApiKey({ api_key: "sk-123" })).toBe(true)
  })

  test("sanitizeHeaderLikeString strips CR/LF for LiteLLM header safety", () => {
    expect(sanitizeHeaderLikeString("sk-ant-api03-secret\r\n")).toBe("sk-ant-api03-secret")
    expect(sanitizeHeaderLikeString("a\nb")).toBe("ab")
  })

  test("sanitizeClientConfigForTransport cleans litellm_keys and default_headers", () => {
    const out = sanitizeClientConfigForTransport({
      litellm_keys: {
        anthropic: "sk-ant-key\r",
      },
      default_headers: {
        "x-api-key": "k\n",
      },
    })
    expect(out).toEqual({
      litellm_keys: { anthropic: "sk-ant-key" },
      default_headers: { "x-api-key": "k" },
    })
  })

  test("ignores empty auth-like headers", () => {
    expect(
      hasClientConfigCredential({
        default_headers: {
          Authorization: "",
        },
      }),
    ).toBe(false)
    expect(
      hasExplicitOpenAIClientConfig({
        default_headers: {
          Authorization: "",
        },
      }),
    ).toBe(false)
  })
})

describe("agency-swarm litellm model routing", () => {
  test("buildLitellmModelForClientConfig keeps the caller provider for OpenRouter-namespaced ids", () => {
    expect(buildLitellmModelForClientConfig("openrouter", "openrouter/openai/gpt-5.2")).toBe(
      "litellm/openrouter/openai/gpt-5.2",
    )
    expect(buildLitellmModelForClientConfig("openrouter", "openai/gpt-5.2")).toBe("litellm/openrouter/openai/gpt-5.2")
  })

  test("buildLitellmModelForClientConfig still strips openai/ prefixes when the provider is openai", () => {
    expect(buildLitellmModelForClientConfig("openai", "openai/gpt-5")).toBe("gpt-5")
    expect(buildLitellmModelForClientConfig("openai", "gpt-5")).toBe("gpt-5")
    expect(buildLitellmModelForClientConfig("openai", "litellm/openai/gpt-5")).toBe("gpt-5")
  })

  test("buildLitellmModelForClientConfig uses litellm/<provider>/<model> for non-OpenAI providers", () => {
    expect(buildLitellmModelForClientConfig("anthropic", "claude-3")).toBe("litellm/anthropic/claude-3")
    expect(buildLitellmModelForClientConfig("anthropic", "anthropic/claude-3")).toBe("litellm/anthropic/claude-3")
  })

  test("normalizeExplicitClientConfigModel preserves non-OpenAI provider namespaces", () => {
    expect(normalizeExplicitClientConfigModel("openrouter/openai/gpt-5.2")).toBe("litellm/openrouter/openai/gpt-5.2")
    expect(normalizeExplicitClientConfigModel("litellm/openrouter/openai/gpt-5.2")).toBe(
      "litellm/openrouter/openai/gpt-5.2",
    )
    expect(normalizeExplicitClientConfigModel("openai/gpt-5")).toBe("gpt-5")
    expect(normalizeExplicitClientConfigModel("litellm/openai/gpt-5")).toBe("gpt-5")
  })

  test("isOpenAIBasedLitellmModel matches agency-swarm _is_openai_based_litellm_provider", () => {
    expect(isOpenAIBasedLitellmModel(undefined)).toBe(true)
    expect(isOpenAIBasedLitellmModel("")).toBe(true)
    expect(isOpenAIBasedLitellmModel("gpt-4o")).toBe(true)
    expect(isOpenAIBasedLitellmModel("litellm/openai/gpt-4o")).toBe(true)
    expect(isOpenAIBasedLitellmModel("litellm/azure/gpt-4o")).toBe(true)
    expect(isOpenAIBasedLitellmModel("litellm/azure_ai/gpt-4o")).toBe(true)
    expect(isOpenAIBasedLitellmModel("litellm/openai_compatible/gpt-4o")).toBe(true)
    expect(isOpenAIBasedLitellmModel("litellm/anthropic/claude-sonnet-4-6")).toBe(false)
    expect(isOpenAIBasedLitellmModel("litellm/gemini/gemini-2.5-pro")).toBe(false)
    expect(isOpenAIBasedLitellmModel("anthropic/claude-sonnet-4-6")).toBe(false)
  })
})
