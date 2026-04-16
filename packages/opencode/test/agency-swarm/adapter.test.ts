import { afterEach, describe, expect, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"

describe("agency-swarm.adapter", () => {
  const originalFetch = globalThis.fetch
  const asFetch = (value: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): typeof fetch =>
    value as unknown as typeof fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test("joinURL preserves reverse-proxy path prefixes", () => {
    const url = AgencySwarmAdapter.joinURL("https://example.com/proxy", "/builder/get_metadata")
    expect(url).toBe("https://example.com/proxy/builder/get_metadata")
  })

  test("parseAgencyIDsFromOpenAPI extracts static agency ids", () => {
    const result = AgencySwarmAdapter.parseAgencyIDsFromOpenAPI({
      paths: {
        "/builder/get_metadata": {},
        "/research/get_metadata": {},
        "/{agency}/get_metadata": {},
        "/builder/get_response_stream": {},
      },
    })

    expect(result).toEqual(["builder", "research"])
  })

  test("discover reads openapi and validates metadata endpoints", async () => {
    const calls: string[] = []

    globalThis.fetch = asFetch(async (input: RequestInfo | URL) => {
      const url = input.toString()
      calls.push(url)

      if (url.endsWith("/proxy/openapi.json")) {
        return new Response(
          JSON.stringify({
            paths: {
              "/builder/get_metadata": {},
            },
          }),
          { status: 200 },
        )
      }

      if (url.endsWith("/proxy/builder/get_metadata")) {
        return new Response(
          JSON.stringify({
            metadata: {
              agencyName: "Builder",
              agents: ["PM", "Researcher"],
              entryPoints: ["PM"],
            },
            nodes: [
              {
                id: "PM",
                type: "agent",
                data: {
                  label: "Project Manager",
                  description: "Planning agent",
                  isEntryPoint: true,
                },
              },
              {
                id: "Researcher",
                type: "agent",
                data: {
                  description: "Research support",
                },
              },
            ],
          }),
          { status: 200 },
        )
      }

      return new Response("not found", { status: 404 })
    })

    const result = await AgencySwarmAdapter.discover({
      baseURL: "https://example.com/proxy",
    })

    expect(result.agencies).toHaveLength(1)
    expect(result.agencies[0].id).toBe("builder")
    expect(result.agencies[0].name).toBe("Builder")
    expect(result.agencies[0].description).toBe("Planning agent")
    expect(result.agencies[0].agents).toEqual([
      {
        id: "PM",
        name: "Project Manager",
        description: "Planning agent",
        isEntryPoint: true,
      },
      {
        id: "Researcher",
        name: "Researcher",
        description: "Research support",
        isEntryPoint: false,
      },
    ])
    expect(calls).toEqual(["https://example.com/proxy/openapi.json", "https://example.com/proxy/builder/get_metadata"])
  })

  test("streamRun parses meta data messages and end frames", async () => {
    globalThis.fetch = asFetch(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder()
          const payload = [
            'event: meta\ndata: {"run_id":"run_123"}\n\n',
            'data: {"data":{"type":"raw_response_event","data":{"type":"response.output_text.delta","delta":"hi"}}}\n\n',
            'event: messages\ndata: {"new_messages":[{"type":"message"}],"run_id":"run_123"}\n\n',
            "event: end\ndata: [DONE]\n\n",
          ]
          for (const chunk of payload) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        },
      })
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      })
    })

    const frames: AgencySwarmAdapter.StreamFrame[] = []
    for await (const frame of AgencySwarmAdapter.streamRun({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      message: "hello",
      chatHistory: [],
    })) {
      frames.push(frame)
    }

    expect(frames.map((frame) => frame.type)).toEqual(["meta", "data", "messages", "end"])
    expect(frames[0]).toEqual({ type: "meta", runID: "run_123" })
  })

  test("streamRun maps supported request payload fields", async () => {
    let requestBody: Record<string, unknown> | undefined
    globalThis.fetch = asFetch(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const rawBody = typeof init?.body === "string" ? init.body : "{}"
      requestBody = JSON.parse(rawBody) as Record<string, unknown>

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode("event: end\ndata: [DONE]\n\n"))
          controller.close()
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      })
    })

    for await (const _frame of AgencySwarmAdapter.streamRun({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      message: "hello",
      chatHistory: [{ type: "message" }],
      recipientAgent: "PM",
      additionalInstructions: "keep it brief",
      userContext: {
        tenant: "acme",
      },
      fileIDs: ["file_1"],
      fileURLs: {
        "readme.md": "https://example.com/readme.md",
      },
      generateChatName: true,
      clientConfig: {
        baseURL: "https://proxy.example.com/v1",
        apiKey: "secret",
        defaultHeaders: {
          "ChatGPT-Account-Id": "acct_123",
        },
        litellmKeys: {
          anthropic: "ant-secret",
        },
      },
    })) {
      // consume stream
    }

    expect(requestBody).toEqual({
      message: "hello",
      chat_history: [{ type: "message" }],
      recipient_agent: "PM",
      additional_instructions: "keep it brief",
      user_context: {
        tenant: "acme",
      },
      file_ids: ["file_1"],
      file_urls: {
        "readme.md": "https://example.com/readme.md",
      },
      generate_chat_name: true,
      client_config: {
        base_url: "https://proxy.example.com/v1",
        api_key: "secret",
        default_headers: {
          "ChatGPT-Account-Id": "acct_123",
        },
        litellm_keys: {
          anthropic: "ant-secret",
        },
      },
    })
  })

  test("streamRun surfaces error-only stream payloads", async () => {
    globalThis.fetch = asFetch(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode('data: {"error":"boom"}\n\n'))
          controller.enqueue(encoder.encode("event: end\ndata: [DONE]\n\n"))
          controller.close()
        },
      })
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      })
    })

    const frames: AgencySwarmAdapter.StreamFrame[] = []
    for await (const frame of AgencySwarmAdapter.streamRun({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      message: "hello",
      chatHistory: [],
    })) {
      frames.push(frame)
    }

    expect(frames.map((frame) => frame.type)).toEqual(["error", "end"])
    expect(frames[0]).toEqual({ type: "error", error: "boom" })
  })

  test("streamRun surfaces connection failures as stream error frames", async () => {
    globalThis.fetch = asFetch(async () => {
      throw new TypeError("Unable to connect. Is the computer able to access the url?")
    })

    const frames: AgencySwarmAdapter.StreamFrame[] = []
    for await (const frame of AgencySwarmAdapter.streamRun({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      message: "hello",
      chatHistory: [],
    })) {
      frames.push(frame)
    }

    expect(frames.map((frame) => frame.type)).toEqual(["error", "end"])
    const first = frames[0]
    expect(first?.type).toBe("error")
    if (first?.type === "error") {
      expect(first.error).toContain("cannot reach agency-swarm backend")
      expect(first.error).toContain("http://127.0.0.1:8000/builder/get_response_stream")
    }
  })

  test("cancel treats 404 responses as successful terminal state", async () => {
    globalThis.fetch = asFetch(async () => new Response(JSON.stringify({ detail: "not found" }), { status: 404 }))

    const result = await AgencySwarmAdapter.cancel({
      baseURL: "http://127.0.0.1:8000",
      agency: "builder",
      runID: "run_404",
    })

    expect(result.ok).toBeTrue()
    expect(result.cancelled).toBeTrue()
    expect(result.notFound).toBeTrue()
  })
})
