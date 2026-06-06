import { describe, expect, test } from "bun:test"
import { openaiHelper } from "../src/routes/zen/util/provider/openai"
import { oaCompatHelper } from "../src/routes/zen/util/provider/openai-compatible"

describe("openaiHelper.normalizeUsage", () => {
  test("keeps output tokens net of separately billed reasoning tokens", () => {
    const helper = openaiHelper({ reqModel: "gpt-5", providerModel: "gpt-5" })

    expect(
      helper.normalizeUsage({
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 25 },
        output_tokens: 40,
        output_tokens_details: { reasoning_tokens: 15 },
      }),
    ).toEqual({
      inputTokens: 75,
      outputTokens: 25,
      reasoningTokens: 15,
      cacheReadTokens: 25,
      cacheWrite5mTokens: undefined,
      cacheWrite1hTokens: undefined,
    })
  })
})

describe("oaCompatHelper.normalizeUsage", () => {
  test("keeps output tokens net of separately billed reasoning tokens", () => {
    const helper = oaCompatHelper({ reqModel: "gpt-5", providerModel: "gpt-5" })

    expect(
      helper.normalizeUsage({
        prompt_tokens: 100,
        prompt_tokens_details: { cached_tokens: 25 },
        completion_tokens: 40,
        completion_tokens_details: { reasoning_tokens: 15 },
      }),
    ).toEqual({
      inputTokens: 75,
      outputTokens: 25,
      reasoningTokens: 15,
      cacheReadTokens: 25,
      cacheWrite5mTokens: undefined,
      cacheWrite1hTokens: undefined,
    })
  })
})
