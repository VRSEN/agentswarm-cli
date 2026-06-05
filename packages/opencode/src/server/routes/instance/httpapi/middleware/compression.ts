import { deflateSync, gzipSync } from "node:zlib"
import { Effect } from "effect"
import { HttpBody, HttpEffect, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

// Keep the server's compressible content-type set stable across HTTP backend changes.
const COMPRESSIBLE_CONTENT_TYPE_REGEX =
  /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i

const NO_TRANSFORM_REGEX = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i

const STREAMING_PATHS = new Set(["/event", "/global/event"])
const STREAMING_POST_REGEX = /^\/session\/[^/]+\/(?:message|prompt_async)$/

const THRESHOLD_BYTES = 1024

type Encoding = "gzip" | "deflate"

function pickEncoding(acceptEncoding: string | undefined): Encoding | undefined {
  if (!acceptEncoding) return undefined
  const explicit = new Map<string, number>()
  let wildcard: number | undefined

  for (const entry of acceptEncoding.split(",")) {
    const [rawEncoding, ...params] = entry.split(";")
    const encoding = rawEncoding?.trim().toLowerCase()
    if (!encoding) continue
    const q = params
      .map((param) => param.trim().toLowerCase())
      .find((param) => param.startsWith("q="))
      ?.slice(2)
    const weight = q === undefined ? 1 : Number(q)
    if (!Number.isFinite(weight) || weight <= 0) {
      explicit.set(encoding, 0)
      continue
    }
    if (encoding === "*") wildcard = weight
    else explicit.set(encoding, weight)
  }

  const gzip = explicit.has("gzip") ? explicit.get("gzip")! : wildcard
  const deflate = explicit.has("deflate") ? explicit.get("deflate")! : wildcard
  if ((gzip ?? 0) <= 0 && (deflate ?? 0) <= 0) return undefined
  if ((gzip ?? 0) >= (deflate ?? 0)) return "gzip"
  return "deflate"
}

function setVaryAcceptEncoding(response: HttpServerResponse.HttpServerResponse) {
  const vary = response.headers.vary
  if (!vary) return HttpServerResponse.setHeader(response, "vary", "Accept-Encoding")
  const values = vary.split(",").map((value) => value.trim().toLowerCase())
  if (values.includes("*") || values.includes("accept-encoding")) return response
  return HttpServerResponse.setHeader(response, "vary", `${vary}, Accept-Encoding`)
}

function pathOf(url: string): string {
  const queryIndex = url.indexOf("?")
  return queryIndex === -1 ? url : url.slice(0, queryIndex)
}

export const compressionLayer = HttpRouter.middleware<{ handles: unknown }>()((effect) =>
  Effect.gen(function* () {
    const response = yield* effect
    const request = yield* HttpServerRequest.HttpServerRequest

    if (request.method === "HEAD") return response
    if (response.headers["content-encoding"]) return response
    if (response.headers["transfer-encoding"]) return response

    const body = response.body
    if (body._tag !== "Uint8Array") return response
    if (body.body.byteLength < THRESHOLD_BYTES) return response

    const cacheControl = response.headers["cache-control"]
    if (cacheControl && NO_TRANSFORM_REGEX.test(cacheControl)) return response

    const path = pathOf(request.url)
    if (STREAMING_PATHS.has(path)) return response
    if (request.method === "POST" && STREAMING_POST_REGEX.test(path)) return response

    const contentType = body.contentType
    if (!COMPRESSIBLE_CONTENT_TYPE_REGEX.test(contentType)) return response

    const encoding = pickEncoding(request.headers["accept-encoding"])
    if (!encoding) return response

    const compressed = encoding === "gzip" ? gzipSync(body.body) : deflateSync(body.body)
    const encoded = HttpServerResponse.setHeader(
      HttpServerResponse.setBody(response, HttpBody.uint8Array(compressed, contentType)),
      "content-encoding",
      encoding,
    )
    yield* HttpEffect.appendPreResponseHandler((_request, response) =>
      Effect.succeed(response.headers["content-encoding"] ? setVaryAcceptEncoding(response) : response),
    )
    return setVaryAcceptEncoding(encoded)
  }),
).layer
