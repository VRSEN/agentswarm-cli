import { afterEach, describe, expect, test } from "bun:test"
import { cp, mkdtemp, realpath, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { startTui, type AgencyProtocolServer, type TuiProcess } from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: AgencyProtocolServer | undefined
const tempDirs: string[] = []
const timeoutMs = process.env.CI ? 60_000 : 45_000

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("Agent Swarm real project TUI handoff e2e", () => {
  test("direct TUI launch with copied agency.py project keeps SendMessage separate from Handoff", async () => {
    const project = await copyRealAgencyProject()
    currentServer = await startRealProjectAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "real-handoff-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
      args: [project, "--model", "agency-swarm/default"],
      env: {
        AGENTSWARM_LAUNCHER: "0",
      },
    })

    await currentTui.waitForText("Agency Swarm", timeoutMs)
    await currentTui.waitForText("UserSupportAgent", timeoutMs)
    expect(currentTui.history()).not.toContain("Use detected Agency Swarm project")

    const imagePath = path.join(project, "handoff-proof.png")
    await writeFile(
      imagePath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
    )
    const resolvedImagePath = await realpath(imagePath)
    currentTui.write(`\x1b[200~${path.basename(imagePath)}\x1b[201~`)
    await currentTui.waitForText("[Image 1]", timeoutMs)

    currentTui.write("delegate this research with SendMessage\r")
    await currentTui.waitForText("Research delegation finished.", timeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "delegation request", timeoutMs)

    currentTui.write("follow up after delegation\r")
    await currentTui.waitFor(() => currentServer!.requests.length === 2, "post-delegation request", timeoutMs)

    const delegation = currentServer.requests[0]?.body
    expect(messageText(delegation?.message)).toContain("delegate this research with SendMessage")
    expect(delegation).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(delegation?.message).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:image/png;base64,${"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="}`,
            detail: "auto",
          },
          {
            type: "input_text",
            text: "[Image 1] delegate this research with SendMessage",
          },
        ],
      },
    ])
    expect(delegation?.file_urls).toBeUndefined()
    expect(path.basename(resolvedImagePath)).toBe("handoff-proof.png")
    const afterDelegation = currentServer.requests[1]?.body
    expect(messageText(afterDelegation?.message)).toContain("follow up after delegation")
    expect(afterDelegation).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(hasHistoryType(afterDelegation, "function_call_output")).toBeTrue()
    expect(hasHistoryType(afterDelegation, "handoff_output_item")).toBeFalse()

    currentTui.write("please handoff this calculation\r")
    await currentTui.waitForText("MathAgent now has control.", timeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 3, "handoff request", timeoutMs)

    currentTui.write("continue after handoff\r")
    await currentTui.waitFor(() => currentServer!.requests.length === 4, "post-handoff request", timeoutMs)

    const handoff = currentServer.requests[2]?.body
    expect(messageText(handoff?.message)).toContain("please handoff this calculation")
    expect(handoff).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const afterHandoff = currentServer.requests[3]?.body
    expect(messageText(afterHandoff?.message)).toContain("continue after handoff")
    expect(afterHandoff).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(hasHistoryType(afterHandoff, "handoff_output_item")).toBeFalse()
  })
})

async function copyRealAgencyProject() {
  const parent = await mkdtemp(path.join(os.tmpdir(), "agentswarm-real-project-"))
  tempDirs.push(parent)
  const project = path.join(parent, "real-handoff-agency")
  await cp(path.join(import.meta.dir, "fixtures", "real-handoff-agency"), project, { recursive: true })
  return project
}

async function startRealProjectAgencyServer(): Promise<AgencyProtocolServer> {
  const requests: AgencyProtocolServer["requests"] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)
      if (url.pathname === "/openapi.json") {
        return Response.json({
          openapi: "3.1.0",
          paths: {
            "/real-handoff-agency/get_metadata": { get: {} },
            "/real-handoff-agency/get_response_stream": { post: {} },
            "/real-handoff-agency/cancel_response_stream": { post: {} },
          },
        })
      }
      if (url.pathname === "/real-handoff-agency/get_metadata") {
        return Response.json(realProjectMetadata)
      }
      if (url.pathname === "/real-handoff-agency/get_response_stream") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        requests.push({ path: url.pathname, body })
        return new Response(realProjectStream(body, requests.length), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        })
      }
      if (url.pathname === "/real-handoff-agency/cancel_response_stream") {
        return Response.json({ cancelled: true })
      }
      return new Response("not found", { status: 404 })
    },
  })

  return {
    baseURL: `http://${server.hostname}:${server.port}`,
    requests,
    stop() {
      server.stop(true)
    },
  }
}

const realProjectMetadata = {
  agency_swarm_version: "1.9.6",
  metadata: {
    agencyName: "RealHandoffAgency",
    agents: ["UserSupportAgent", "ResearchAgent", "MathAgent"],
    entryPoints: ["UserSupportAgent"],
  },
  nodes: [
    agentNode("UserSupportAgent", "Receives user requests and chooses delegation or handoff.", true),
    agentNode("ResearchAgent", "Handles delegated research and returns the result.", false),
    agentNode("MathAgent", "Handles persistent math handoffs.", false),
  ],
}

function agentNode(id: string, description: string, isEntryPoint: boolean) {
  return {
    id,
    type: "agent",
    data: {
      label: id,
      description,
      isEntryPoint,
      model: "gpt-5.4-mini",
    },
  }
}

function realProjectStream(body: Record<string, unknown>, count: number) {
  const message = messageText(body.message).toLowerCase()
  if (message.includes("delegate")) {
    return sse([
      ["meta", { run_id: `run_real_project_${count}` }],
      ["data", sendMessageCall()],
      [
        "messages",
        {
          new_messages: [
            sendMessageOutput(),
            assistantMessage(count, "ResearchAgent", "Research delegation finished."),
          ],
        },
      ],
      ["end", {}],
    ])
  }
  if (message.includes("handoff")) {
    return sse([
      ["meta", { run_id: `run_real_project_${count}` }],
      ["data", handoffCall()],
      ["messages", { new_messages: [handoffOutput()] }],
      ["data", agentUpdated("MathAgent")],
      ["messages", { new_messages: [assistantMessage(count, "MathAgent", "MathAgent now has control.")] }],
      ["end", {}],
    ])
  }
  return sse([
    ["meta", { run_id: `run_real_project_${count}` }],
    [
      "messages",
      {
        new_messages: [
          assistantMessage(
            count,
            String(body.recipient_agent || "UserSupportAgent"),
            "Real project response complete.",
          ),
        ],
      },
    ],
    ["end", {}],
  ])
}

function messageText(message: unknown): string {
  if (typeof message === "string") return message
  if (!Array.isArray(message)) return ""
  return message
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !Array.isArray((item as { content?: unknown }).content)) return []
      return (item as { content: unknown[] }).content
    })
    .flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const content = item as { type?: unknown; text?: unknown }
      return content.type === "input_text" && typeof content.text === "string" ? [content.text] : []
    })
    .join("\n")
}

function sendMessageCall() {
  return {
    type: "raw_response_event",
    agent: "UserSupportAgent",
    data: {
      type: "response.output_item.added",
      output_index: "1",
      item: {
        type: "function_call",
        id: "fc_send_research",
        call_id: "call_send_research",
        name: "SendMessage",
        arguments: JSON.stringify({
          recipient_agent: "ResearchAgent",
          message: "Please research this and return control.",
        }),
      },
    },
  }
}

function sendMessageOutput() {
  return {
    type: "function_call_output",
    call_id: "call_send_research",
    output: JSON.stringify({
      recipient_agent: "ResearchAgent",
      response: "Research completed without transfer.",
    }),
  }
}

function handoffCall() {
  return {
    type: "raw_response_event",
    agent: "UserSupportAgent",
    data: {
      type: "response.output_item.added",
      output_index: "1",
      item: {
        type: "function_call",
        id: "fc_transfer_math",
        call_id: "call_transfer_math",
        name: "transfer_to_math_agent",
        arguments: "{}",
      },
    },
  }
}

function handoffOutput() {
  return {
    type: "handoff_output_item",
    call_id: "call_transfer_math",
    output: '{"assistant":"MathAgent"}',
  }
}

function agentUpdated(agent: string) {
  return {
    type: "agent_updated_stream_event",
    agent,
    new_agent: {
      id: agent,
      name: agent,
    },
  }
}

function assistantMessage(count: number, agent: string, text: string) {
  return {
    id: `msg_real_project_${agent}_${count}`,
    type: "message",
    role: "assistant",
    agent,
    content: [{ type: "output_text", text }],
  }
}

function hasHistoryType(body: Record<string, unknown> | undefined, type: string) {
  const history = body?.chat_history
  return Array.isArray(history) && history.some((item) => isRecord(item) && item.type === type)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function sse(events: Array<[event: string, data: Record<string, unknown>]>) {
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("")
}
