import { describe, expect, test } from "bun:test"
import {
  hasClientConfigCredential,
  hasExplicitOpenAIApiKey,
  hasExplicitOpenAIClientConfig,
  sanitizeClientConfigForTransport,
  sanitizeHeaderLikeString,
} from "../../src/agency-swarm/client-config"

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
