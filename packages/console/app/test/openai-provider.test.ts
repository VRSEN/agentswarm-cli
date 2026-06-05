import { describe, expect, test } from "bun:test"
import { openaiHelper } from "../src/routes/zen/util/provider/openai"

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
