import { Effect } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"

// effect-smol's HttpMiddleware.cors builds OPTIONS preflight responses by
// spreading allowOrigin() and allowHeaders() into the same record. Both set
// the `vary` key, so allowHeaders' `Vary: Access-Control-Request-Headers`
// overwrites allowOrigin's `Vary: Origin`. With dynamic origin echoing, the
// missing `Vary: Origin` lets shared caches reuse a preflight cached for one
// origin against a different origin.
//
// TODO: upstream a fix that merges Vary values in headersFromRequestOptions
// (packages/effect/src/unstable/http/HttpMiddleware.ts ~line 332).
export const corsVaryFix = HttpRouter.middleware(
  (effect) =>
    Effect.gen(function* () {
      const response = yield* effect
      const allowOrigin = response.headers["access-control-allow-origin"]
      const required = [
        allowOrigin && allowOrigin !== "*" ? "Origin" : undefined,
        response.headers["content-encoding"] ? "Accept-Encoding" : undefined,
      ].filter((value): value is string => !!value)
      if (required.length === 0) return response

      const vary = response.headers["vary"]
      if (!vary) return HttpServerResponse.setHeader(response, "vary", required.join(", "))

      const tokens = vary.split(",").map((s) => s.trim().toLowerCase())
      if (tokens.includes("*")) return response
      const missing = required.filter((value) => !tokens.includes(value.toLowerCase()))
      if (missing.length === 0) return response

      return HttpServerResponse.setHeader(response, "vary", `${vary}, ${missing.join(", ")}`)
    }),
  { global: true },
)
