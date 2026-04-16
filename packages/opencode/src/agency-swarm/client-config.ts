function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

const AUTH_HEADER_PATTERN = /(^authorization$|(^|[-_])(api[-_]?key|token|auth[-_]?token)$)/i

export function readStringRecord(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value)
  if (!record) return undefined
  const result = Object.fromEntries(
    Object.entries(record).flatMap(([key, item]) => {
      const text = asString(item)
      return text ? [[key, text]] : []
    }),
  )
  return Object.keys(result).length > 0 ? result : undefined
}

export function readCredentialHeaders(config: Record<string, unknown>) {
  const headers = readStringRecord(config["default_headers"]) ?? readStringRecord(config["defaultHeaders"])
  if (!headers) return undefined
  const result = Object.fromEntries(Object.entries(headers).filter(([key]) => AUTH_HEADER_PATTERN.test(key)))
  return Object.keys(result).length > 0 ? result : undefined
}

export function hasClientConfigCredential(config: Record<string, unknown>) {
  if (asString(config["api_key"]) ?? asString(config["apiKey"])) return true
  const litellmKeys = asRecord(config["litellm_keys"]) ?? asRecord(config["litellmKeys"])
  if (litellmKeys && Object.values(litellmKeys).some((item) => typeof item === "string" && item.length > 0)) {
    return true
  }
  return !!readCredentialHeaders(config)
}

export function hasExplicitOpenAIClientConfig(config: Record<string, unknown> | undefined) {
  return !!(config && (asString(config["api_key"]) ?? asString(config["apiKey"]) ?? readCredentialHeaders(config)))
}
