import { describe, expect, test } from "bun:test"
import { Session } from "@/session/session"
import type { Provider } from "@/provider/provider"

function createModel(): Provider.Model {
  return {
    id: "default",
    providerID: "agency-swarm",
    name: "Swarm Default",
    limit: {
      context: Number.MAX_SAFE_INTEGER,
      input: Number.MAX_SAFE_INTEGER,
      output: Number.MAX_SAFE_INTEGER,
    },
    cost: {
      input: 12,
      output: 24,
      cache: {
        read: 3,
        write: 6,
      },
    },
    capabilities: {
      toolcall: true,
      attachment: true,
      reasoning: false,
      temperature: false,
      input: { text: true, image: true, audio: false, video: false },
      output: { text: true, image: false, audio: false, video: false },
      interleaved: false,
    },
    api: {
      id: "default",
      npm: "@ai-sdk/openai-compatible",
      url: "http://127.0.0.1:8000",
    },
    options: {},
  } as Provider.Model
}

describe("Session.getUsage", () => {
  test("uses Agency Swarm payload cost from provider metadata", () => {
    const result = Session.getUsage({
      model: createModel(),
      usage: {
        inputTokens: 1_000,
        outputTokens: 500,
        totalTokens: 1_500,
        inputTokenDetails: {
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
          noCacheTokens: undefined,
        },
        outputTokenDetails: {
          reasoningTokens: undefined,
          textTokens: undefined,
        },
      },
      metadata: {
        agency_swarm: {
          totalCost: 0.42,
        },
      },
    })

    expect(result.tokens.total).toBe(1_500)
    expect(result.tokens.input).toBe(1_000)
    expect(result.tokens.output).toBe(500)
    expect(result.cost).toBe(0.42)
  })

  test("falls back to model pricing when Agency Swarm metadata omits cost", () => {
    const result = Session.getUsage({
      model: createModel(),
      usage: {
        inputTokens: 1_000,
        outputTokens: 500,
        totalTokens: 1_500,
        inputTokenDetails: {
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
          noCacheTokens: undefined,
        },
        outputTokenDetails: {
          reasoningTokens: undefined,
          textTokens: undefined,
        },
      },
      metadata: {
        agency_swarm: {},
      },
    })

    expect(result.cost).toBe(0.024)
  })

  test("preserves explicit zero-cost Agency Swarm metadata", () => {
    const result = Session.getUsage({
      model: createModel(),
      usage: {
        inputTokens: 1_000,
        outputTokens: 500,
        totalTokens: 1_500,
        inputTokenDetails: {
          cacheReadTokens: undefined,
          cacheWriteTokens: undefined,
          noCacheTokens: undefined,
        },
        outputTokenDetails: {
          reasoningTokens: undefined,
          textTokens: undefined,
        },
      },
      metadata: {
        agency_swarm: {
          totalCost: 0,
        },
      },
    })

    expect(result.cost).toBe(0)
  })
})
