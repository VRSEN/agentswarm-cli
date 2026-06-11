import { describe, expect, test } from "bun:test"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"
import { MessageID, SessionID } from "../../src/session/schema"

const live = process.env["AGENTSWARM_LIVE_OLLAMA_E2E"] === "1" ? test : test.skip

describe("agency-swarm live Ollama e2e", () => {
  live("streams a selected Ollama model through the Agency Swarm bridge", async () => {
    const sessionID = SessionID.descending()
    const userID = MessageID.ascending()
    const assistantID = MessageID.ascending()
    AgencySwarmHistory.load = async () => ({
      scope: "manual",
      chat_history: [],
      updated_at: Date.now(),
    })
    AgencySwarmHistory.appendMessages = async (_scope, messages) => ({
      scope: "manual",
      chat_history: Array.isArray(messages) ? messages : [],
      updated_at: Date.now(),
    })
    AgencySwarmHistory.setLastRunID = async (_scope, runID) => ({
      scope: "manual",
      chat_history: [],
      last_run_id: runID,
      updated_at: Date.now(),
    })

    const stream = await SessionAgencySwarm.stream({
      sessionID,
      assistantMessage: {
        id: assistantID,
        parentID: userID,
        role: "assistant",
        mode: "Default",
        agent: "Default",
        path: { cwd: process.cwd(), root: process.cwd() },
        cost: 0,
        tokens: {
          total: 0,
          input: 0,
          output: 0,
          reasoning: 0,
          cache: { read: 0, write: 0 },
        },
        modelID: "qwen2.5:0.5b",
        providerID: "ollama",
        time: { created: Date.now() },
        sessionID,
      } as unknown as SessionAgencySwarm.StreamInput["assistantMessage"],
      userMessage: {
        info: { id: userID, role: "user" },
        parts: [
          {
            type: "text",
            text: "Return exactly OK and no other text.",
            ignored: false,
          },
        ],
      } as unknown as SessionAgencySwarm.StreamInput["userMessage"],
      options: {
        baseURL: process.env["AGENTSWARM_LIVE_AGENCY_URL"] ?? "http://127.0.0.1:8765",
        agency: process.env["AGENTSWARM_LIVE_AGENCY_ID"] ?? "local",
        discoveryTimeoutMs: 5000,
      },
      abort: new AbortController().signal,
      sessionModel: { providerID: "ollama", modelID: "qwen2.5:0.5b" },
      loadSessionMessages: async () => [],
      updateSessionMessage: async (message) => message,
    })

    const text: string[] = []
    for await (const event of stream.fullStream) {
      if (event.type === "text-delta") text.push(event.text)
    }

    expect(text.join("").trim()).toBe("OK")
  })
})
