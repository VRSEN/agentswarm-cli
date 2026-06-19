import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import { Locale } from "@/util/locale"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type ContextModel = { limit?: { context?: number } } | undefined

export function tokenTotal(message: Pick<AssistantMessage, "tokens">) {
  const total = message.tokens.total
  if (typeof total === "number" && total > 0) return total
  return (
    message.tokens.input +
    message.tokens.output +
    message.tokens.reasoning +
    message.tokens.cache.read +
    message.tokens.cache.write
  )
}

export function contextLimit(model: ContextModel) {
  const context = model?.limit?.context
  if (typeof context !== "number" || !Number.isFinite(context) || context <= 0) return undefined
  if (context >= Number.MAX_SAFE_INTEGER) return undefined
  return context
}

export function usagePercent(tokens: number, model: ContextModel) {
  const limit = contextLimit(model)
  if (!limit) return undefined
  return Math.round((tokens / limit) * 100)
}

export function formatUsageDisplay(input: {
  message: Pick<AssistantMessage, "tokens">
  model: ContextModel
  cost?: number
}) {
  const tokens = tokenTotal(input.message)
  if (tokens <= 0) return undefined

  const pct = usagePercent(tokens, input.model)
  const cost = input.cost ?? 0
  return {
    context: pct === undefined ? Locale.number(tokens) : `${Locale.number(tokens)} (${pct}%)`,
    cost: cost > 0 ? money.format(cost) : undefined,
  }
}
