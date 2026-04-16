import { describe, expect, test } from "bun:test"
import { hasClientConfigCredential, hasExplicitOpenAIClientConfig } from "../../src/agency-swarm/client-config"

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
})
