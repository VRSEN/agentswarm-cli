function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

/** Strip CR/LF and trim — values become HTTP headers; LiteLLM rejects `\\r` / `\\n` as header injection. */
export function sanitizeHeaderLikeString(value: string): string {
  return value.replace(/\r\n?|\n/g, "").trim()
}

/** Sanitize `client_config` strings right before JSON transport to the agency-swarm server. */
export function sanitizeClientConfigForTransport(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...config }

  if (typeof out["api_key"] === "string") {
    const s = sanitizeHeaderLikeString(out["api_key"])
    if (s) out["api_key"] = s
    else delete out["api_key"]
  }

  for (const key of ["base_url", "model"] as const) {
    if (typeof out[key] !== "string") continue
    const s = sanitizeHeaderLikeString(out[key] as string)
    if (s) out[key] = s
    else delete out[key]
  }

  const litellmRaw = asRecord(out["litellm_keys"]) ?? asRecord(out["litellmKeys"])
  if (litellmRaw) {
    const litellm: Record<string, string> = {}
    for (const [k, v] of Object.entries(litellmRaw)) {
      if (typeof v !== "string") continue
      const s = sanitizeHeaderLikeString(v)
      if (s) litellm[k] = s
    }
    if (Object.keys(litellm).length > 0) out["litellm_keys"] = litellm
    else delete out["litellm_keys"]
    delete out["litellmKeys"]
  }

  const headers = readStringRecord(out["default_headers"]) ?? readStringRecord(out["defaultHeaders"])
  if (headers) {
    const cleaned = Object.fromEntries(
      Object.entries(headers)
        .map(([k, v]) => [k, sanitizeHeaderLikeString(v)] as const)
        .filter(([, v]) => v.length > 0),
    )
    if (Object.keys(cleaned).length > 0) out["default_headers"] = cleaned
    else delete out["default_headers"]
    delete out["defaultHeaders"]
  }

  return out
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

export function readCredentialHeaders(config: Record<string, unknown> | undefined) {
  if (!config) return undefined
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

/** True when user set an explicit `api_key` / `apiKey` field (not headers alone). */
export function hasExplicitOpenAIApiKey(config: Record<string, unknown> | undefined) {
  return !!(config && (asString(config["api_key"]) ?? asString(config["apiKey"])))
}
