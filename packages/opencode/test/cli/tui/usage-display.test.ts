import { describe, expect, test } from "bun:test"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import { formatUsageDisplay } from "../../../src/cli/cmd/tui/util/usage-display"

function message(tokens: AssistantMessage["tokens"]): Pick<AssistantMessage, "tokens"> {
  return { tokens }
}

const tokens: AssistantMessage["tokens"] = {
  total: 1_500,
  input: 1_200,
  output: 0,
  reasoning: 0,
  cache: {
    read: 0,
    write: 0,
  },
}

describe("usage display", () => {
  test("does not show a false zero percent for placeholder Agency Swarm context limits", () => {
    const display = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: Number.MAX_SAFE_INTEGER } },
      cost: 0.42,
    })

    expect(display).toEqual({
      context: "1.5K",
      cost: "$0.42",
    })
  })

  test("shows percent when the model has a real context limit", () => {
    const display = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: 3_000 } },
      cost: 0.42,
    })

    expect(display).toEqual({
      context: "1.5K (50%)",
      cost: "$0.42",
    })
  })

  test("shows positive sub-cent cost as less than one cent", () => {
    const display = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: 3_000 } },
      cost: 0.006,
    })

    expect(display?.context).toBe("1.5K (50%)")
    expect(display?.cost).toBe("<$0.01")
  })

  test("shows one-cent cost as normal currency", () => {
    const display = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: 3_000 } },
      cost: 0.01,
    })

    expect(display?.context).toBe("1.5K (50%)")
    expect(display?.cost).toBe("$0.01")
  })

  test("hides absent and zero cost", () => {
    const absent = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: 3_000 } },
    })
    const zero = formatUsageDisplay({
      message: message(tokens),
      model: { limit: { context: 3_000 } },
      cost: 0,
    })

    expect(absent?.context).toBe("1.5K (50%)")
    expect(absent?.cost).toBeUndefined()
    expect(zero?.context).toBe("1.5K (50%)")
    expect(zero?.cost).toBeUndefined()
  })
})
