import { afterEach, describe, expect, test } from "bun:test"
import { startTui, type TuiProcess } from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: Awaited<ReturnType<typeof startMetadataOutageAgencyServer>> | undefined
const tuiReadyTimeoutMs = process.env.CI ? 120_000 : 30_000
const tuiInteractionTimeoutMs = process.env.CI ? 60_000 : 45_000

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
})

describe("Agent Swarm metadata outage recipient e2e", () => {
  test("post-handoff prompt keeps recipient when metadata is unavailable", async () => {
    currentServer = await startMetadataOutageAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "metadata-outage-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Swarm Default", tuiReadyTimeoutMs)
    await currentTui.waitFor(
      () => currentTui!.screen().includes("UserSupportAgent"),
      "configured recipient",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("please live handoff this calculation\r")
    await currentTui.waitForText("Live agent update moved control to MathAgent.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentTui!.screen().includes("MathAgent · Swarm Default"),
      "live handoff routed prompt",
      tuiInteractionTimeoutMs,
    )
    currentServer.setMetadataAvailable(false)

    currentTui.write("continue after metadata outage\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-handoff metadata outage request",
      tuiInteractionTimeoutMs,
    )

    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after metadata outage")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
  })
})

async function startMetadataOutageAgencyServer() {
  const requests: Array<{ path: string; body: Record<string, unknown> }> = []
  let metadataAvailable = true
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === "/openapi.json") {
        return Response.json({
          openapi: "3.1.0",
          paths: {
            "/metadata-outage-agency/get_metadata": { get: {} },
            "/metadata-outage-agency/get_response_stream": { post: {} },
            "/metadata-outage-agency/cancel_response_stream": { post: {} },
          },
        })
      }
      if (url.pathname === "/metadata-outage-agency/get_metadata") {
        if (!metadataAvailable) return new Response("metadata unavailable", { status: 503 })
        return Response.json(metadata)
      }
      if (url.pathname === "/metadata-outage-agency/get_response_stream") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        requests.push({ path: url.pathname, body })
        return new Response(stream(body, requests.length), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        })
      }
      if (url.pathname === "/metadata-outage-agency/cancel_response_stream") {
        return Response.json({ cancelled: true })
      }
      return new Response("not found", { status: 404 })
    },
  })

  return {
    baseURL: `http://${server.hostname}:${server.port}`,
    requests,
    setMetadataAvailable(available: boolean) {
      metadataAvailable = available
    },
    stop() {
      server.stop(true)
    },
  }
}

const metadata = {
  agency_swarm_version: "1.9.6",
  metadata: {
    agencyName: "MetadataOutageAgency",
    agents: ["UserSupportAgent", "MathAgent"],
    entryPoints: ["UserSupportAgent"],
  },
  nodes: [
    agentNode("UserSupportAgent", true),
    agentNode("MathAgent", false),
  ],
}

function agentNode(id: string, isEntryPoint: boolean) {
  return {
    id,
    type: "agent",
    data: {
      label: id,
      description: `${id} test agent`,
      isEntryPoint,
      model: "gpt-5.4-mini",
    },
  }
}

function stream(body: Record<string, unknown>, count: number) {
  const message = typeof body.message === "string" ? body.message.toLowerCase() : ""
  if (message.includes("live handoff")) {
    return sse([
      ["meta", { run_id: `run_metadata_outage_${count}` }],
      [
        "data",
        {
          type: "agent_updated_stream_event",
          agent: "MathAgent",
          new_agent: {
            id: "MathAgent",
            name: "MathAgent",
          },
        },
      ],
      [
        "messages",
        {
          new_messages: [
            {
              id: `msg_live_handoff_${count}`,
              type: "message",
              role: "assistant",
              agent: "MathAgent",
              content: [{ type: "output_text", text: "Live agent update moved control to MathAgent." }],
            },
          ],
        },
      ],
      ["end", {}],
    ])
  }

  return sse([
    ["meta", { run_id: `run_metadata_outage_${count}` }],
    [
      "messages",
      {
        new_messages: [
          {
            id: `msg_metadata_outage_${count}`,
            type: "message",
            role: "assistant",
            agent: body.recipient_agent || "UserSupportAgent",
            content: [{ type: "output_text", text: "Metadata outage response complete." }],
          },
        ],
      },
    ],
    ["end", {}],
  ])
}

function sse(events: Array<[event: string, data: Record<string, unknown>]>) {
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("")
}
