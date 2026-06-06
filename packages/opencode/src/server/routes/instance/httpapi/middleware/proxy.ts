import { ProxyUtil } from "@/server/proxy-util"
import { Effect, Stream } from "effect"
import { HttpBody, HttpClient, HttpClientRequest, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import * as Socket from "effect/unstable/socket/Socket"
import { WebSocketTracker } from "../websocket-tracker"

function webSource(request: HttpServerRequest.HttpServerRequest): Request | undefined {
  return request.source instanceof Request ? request.source : undefined
}

function requestBody(request: HttpServerRequest.HttpServerRequest) {
  if (request.method === "GET" || request.method === "HEAD") return HttpBody.empty
  const len = request.headers["content-length"]
  return HttpBody.raw(webSource(request)?.body ?? null, {
    contentType: request.headers["content-type"],
    contentLength: len ? Number(len) : undefined,
  })
}

type BunWebSocketConstructor = new (url: string, init?: { headers?: Record<string, string> }) => globalThis.WebSocket

function outboundWebSocket(request: HttpServerRequest.HttpServerRequest, target: string | URL, extra?: HeadersInit) {
  const url = ProxyUtil.websocketTargetURL(target)
  if (!extra) {
    return Socket.makeWebSocket(url, {
      protocols: ProxyUtil.websocketProtocols(request.headers),
    })
  }
  const headers = Object.fromEntries(ProxyUtil.headers(request.headers as HeadersInit, extra).entries())
  const Ctor = globalThis.WebSocket as unknown as BunWebSocketConstructor
  return Socket.fromWebSocket(
    Effect.acquireRelease(
      Effect.sync(() => new Ctor(url, { headers })),
      (ws) => Effect.sync(() => ws.close(1000)),
    ),
  )
}

export function websocket(
  request: HttpServerRequest.HttpServerRequest,
  target: string | URL,
  extra?: HeadersInit,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Socket.WebSocketConstructor> {
  return Effect.scoped(
    Effect.gen(function* () {
      const inbound = yield* Effect.orDie(request.upgrade)
      const outbound = yield* outboundWebSocket(request, target, extra)
      const writeInbound = yield* inbound.writer
      const writeOutbound = yield* outbound.writer
      const closeSocket = (socket: Socket.Socket, write: (event: Socket.CloseEvent) => Effect.Effect<void, unknown>) =>
        socket
          .runRaw(() => Effect.void, {
            onOpen: write(WebSocketTracker.SERVER_CLOSING_EVENT()).pipe(Effect.catch(() => Effect.void)),
          })
          .pipe(
            Effect.timeout("1 second"),
            Effect.catchReason("SocketError", "SocketCloseError", () => Effect.void),
            Effect.catch(() => Effect.void),
          )
      const closeAccepted = Effect.all([closeSocket(inbound, writeInbound), closeSocket(outbound, writeOutbound)], {
        concurrency: "unbounded",
        discard: true,
      })
      const registered = yield* WebSocketTracker.register(
        Effect.all(
          [
            writeInbound(WebSocketTracker.SERVER_CLOSING_EVENT()),
            writeOutbound(WebSocketTracker.SERVER_CLOSING_EVENT()),
          ],
          { concurrency: "unbounded", discard: true },
        ),
      )
      if (!registered) {
        yield* closeAccepted
        return HttpServerResponse.empty()
      }

      yield* outbound
        .runRaw((message) => writeInbound(message))
        .pipe(
          Effect.catchReason("SocketError", "SocketCloseError", (reason) =>
            writeInbound(new Socket.CloseEvent(reason.code, reason.closeReason)).pipe(Effect.catch(() => Effect.void)),
          ),
          Effect.catch(() =>
            writeInbound(new Socket.CloseEvent(1011, "proxy error")).pipe(Effect.catch(() => Effect.void)),
          ),
          Effect.forkScoped,
        )

      yield* inbound
        .runRaw((message) => {
          return writeOutbound(typeof message === "string" ? message : message.slice())
        })
        .pipe(
          Effect.catch(() => Effect.void),
          Effect.ensuring(writeOutbound(new Socket.CloseEvent()).pipe(Effect.catch(() => Effect.void))),
        )
      return HttpServerResponse.empty()
    }).pipe(Effect.orDie),
  )
}

function statusText(response: unknown) {
  return (response as { source?: Response }).source?.statusText
}

export function http(
  client: HttpClient.HttpClient,
  url: string | URL,
  extra: HeadersInit | undefined,
  request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<HttpServerResponse.HttpServerResponse> {
  return Effect.gen(function* () {
    const response = yield* client.execute(
      HttpClientRequest.make(request.method as never)(url, {
        headers: ProxyUtil.headers(request.headers as HeadersInit, extra),
        body: requestBody(request),
      }),
    )
    const headers = new Headers(response.headers as HeadersInit)
    headers.delete("content-encoding")
    headers.delete("content-length")

    return HttpServerResponse.stream(response.stream.pipe(Stream.catchCause(() => Stream.empty)), {
      status: response.status,
      statusText: statusText(response),
      headers,
    })
  }).pipe(Effect.catch(() => Effect.succeed(HttpServerResponse.empty({ status: 500 }))))
}

export * as HttpApiProxy from "./proxy"
