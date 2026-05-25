import { afterEach, describe, expect, mock, test } from "bun:test"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { AgencySwarmHistory } from "../../src/agency-swarm/history"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"

describe("session.agency-swarm recipient recovery", () => {
  const originalGetMetadata = AgencySwarmAdapter.getMetadata
  const originalStreamRun = AgencySwarmAdapter.streamRun
  const originalLoad = AgencySwarmHistory.load
  const originalAppendMessages = AgencySwarmHistory.appendMessages
  const originalSetLastRunID = AgencySwarmHistory.setLastRunID

  afterEach(() => {
    mock.restore()
    AgencySwarmAdapter.getMetadata = originalGetMetadata
    AgencySwarmAdapter.streamRun = originalStreamRun
    AgencySwarmHistory.load = originalLoad
    AgencySwarmHistory.appendMessages = originalAppendMessages
    AgencySwarmHistory.setLastRunID = originalSetLastRunID
  })

  test("stream preserves prompt recipient when metadata refresh is unavailable", async () => {
    mockHistory()
    let sentRecipient: string | undefined
    AgencySwarmAdapter.getMetadata = (async () => {
      throw new Error("The operation timed out.")
    }) as typeof AgencySwarmAdapter.getMetadata
    AgencySwarmAdapter.streamRun = async function* (args) {
      sentRecipient = args.recipientAgent ?? undefined
      yield { type: "end" }
    } as typeof AgencySwarmAdapter.streamRun

    const input = helper()
    input.recipientAgent = "Slides Agent"
    const stream = await SessionAgencySwarm.stream(input)
    for await (const _ of stream.fullStream) {
    }

    expect(sentRecipient).toBe("Slides Agent")
  })

  const helper = () =>
    ({
      sessionID: "session_1",
      assistantMessage: {
        id: "message_assistant_1",
        parentID: "message_user_1",
        role: "assistant",
        mode: "Default",
        agent: "Default",
        path: {
          cwd: "/",
          root: "/",
        },
        cost: 0,
        tokens: {
          total: 0,
          input: 0,
          output: 0,
          reasoning: 0,
          cache: { read: 0, write: 0 },
        },
        modelID: "default",
        providerID: "agency-swarm",
        time: {
          created: Date.now(),
        },
        sessionID: "session_1",
      },
      userMessage: {
        info: {
          id: "message_user_1",
          role: "user",
        },
        parts: [
          {
            type: "text",
            text: "hello",
            ignored: false,
          },
        ],
      },
      options: {
        baseURL: "http://127.0.0.1:8000",
        agency: "builder",
        discoveryTimeoutMs: 5000,
      },
      abort: new AbortController().signal,
    }) as Parameters<typeof SessionAgencySwarm.stream>[0]

  function mockHistory() {
    AgencySwarmHistory.load = (async () => ({
      scope: "http://127.0.0.1:8000|builder|session_1",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.load
    AgencySwarmHistory.appendMessages = (async () => ({
      scope: "scope",
      chat_history: [],
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.appendMessages
    AgencySwarmHistory.setLastRunID = (async (_scope, runID) => ({
      scope: "scope",
      chat_history: [],
      last_run_id: runID,
      updated_at: Date.now(),
    })) as typeof AgencySwarmHistory.setLastRunID
  }
})
