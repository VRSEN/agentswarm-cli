import { describe, expect, test } from "bun:test"
import {
  buildAgencyTargetOptions,
  resolveAgencyHandoffRecipientFromMessages,
  resolveAgencyTargetFromPicker,
  shouldAdoptAgencyHandoffRecipient,
} from "../../../src/cli/cmd/tui/util/agency-target"

describe("agency target options", () => {
  test("clears stale snake_case recipient state when /agents switches recipients", () => {
    const options = buildAgencyTargetOptions({
      providerOptions: {
        baseURL: "http://127.0.0.1:18080",
        token: undefined,
        configToken: undefined,
        agency: "my-agency",
        recipientAgent: "ExampleAgent",
        discoveryTimeoutMs: 5000,
        rawOptions: {
          baseURL: "http://127.0.0.1:18080",
          agency: "my-agency",
          recipient_agent: "ExampleAgent",
          recipient_agent_selected_at: 1,
        },
      },
      agency: "my-agency",
      recipientAgent: "ExampleAgent2",
    })

    expect(typeof options.recipientAgentSelectedAt).toBe("number")
    expect(options).toEqual({
      baseURL: "http://127.0.0.1:18080",
      agency: "my-agency",
      discoveryTimeoutMs: 5000,
      recipientAgent: "ExampleAgent2",
      recipientAgentSelectedAt: options.recipientAgentSelectedAt,
      recipient_agent: null,
      recipient_agent_selected_at: null,
    })
  })

  test("adopts handoff agent as soon as the assistant message reports a new agent", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent2",
        handoffEvidence: true,
      }),
    ).toBe(true)
  })

  test("does not adopt a new assistant agent without handoff evidence", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: undefined,
        assistantAgent: "ExampleAgent2",
        handoffEvidence: false,
      }),
    ).toBe(false)
  })

  test("does not restore SendMessage recipient_agent output as a handoff", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "UserSupportAgent",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "MathAgent",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "tool",
              tool: "SendMessage",
              state: {
                status: "completed",
                output: '{"recipient_agent":"MathAgent","response":"Delegation completed without transfer."}',
                metadata: {
                  item_type: "function_call_output",
                },
              },
            },
          ],
        },
      }),
    ).toBeUndefined()
  })

  test("restores agent_updated_stream_event-only handoff metadata", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "UserSupportAgent",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "MathAgent",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "text",
              metadata: {
                agency_handoff_event: "agent_updated_stream_event",
                assistant: "MathAgent",
              },
            },
          ],
        },
      }),
    ).toEqual({
      sessionID: "session_1",
      messageID: "message_1",
      agent: "MathAgent",
      selectedAt: 1,
    })
  })

  test("does not restore nested forwarded handoff metadata", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "UserSupportAgent",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "MathAgent",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "text",
              metadata: {
                agency_handoff_event: "agent_updated_stream_event",
                assistant: "MathAgent",
                callerAgent: "UserSupportAgent",
                parent_run_id: "run_parent",
              },
            },
            {
              type: "tool",
              tool: "SendMessage",
              state: {
                status: "completed",
                metadata: {
                  item_type: "handoff_output_item",
                  assistant: "MathAgent",
                  callerAgent: "UserSupportAgent",
                  parentRunID: "run_parent",
                },
              },
            },
          ],
        },
      }),
    ).toBeUndefined()
  })

  test("restores top-level handoff over later nested forwarded metadata", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "UserSupportAgent",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "MathAgent",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "tool",
              tool: "transfer_to_SupportAgent",
              state: {
                status: "completed",
              },
            },
            {
              type: "text",
              metadata: {
                agency_handoff_event: "agent_updated_stream_event",
                assistant: "MathAgent",
                callerAgent: "SupportAgent",
                parent_run_id: "run_parent",
              },
            },
            {
              type: "tool",
              tool: "SendMessage",
              state: {
                status: "completed",
                output: '{"assistant":"MathAgent"}',
                metadata: {
                  item_type: "handoff_output_item",
                  assistant: "MathAgent",
                  callerAgent: "SupportAgent",
                  parentRunID: "run_parent",
                },
              },
            },
          ],
        },
      }),
    ).toEqual({
      sessionID: "session_1",
      messageID: "message_1",
      agent: "SupportAgent",
      selectedAt: 1,
    })
  })

  test("restores handed off recipient from synced session messages", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "Agent1",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "Agent2",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "tool",
              tool: "transfer_to_Agent2",
              state: {
                status: "completed",
              },
            },
          ],
        },
      }),
    ).toEqual({
      sessionID: "session_1",
      messageID: "message_1",
      agent: "Agent2",
      selectedAt: 1,
    })
  })

  test("restores handed off recipient from handoff output item metadata", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "Agent1",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "Agent2",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "tool",
              tool: "tool",
              state: {
                status: "completed",
                metadata: {
                  item_type: "handoff_output_item",
                  assistant: "Agent2",
                },
              },
            },
          ],
        },
      }),
    ).toEqual({
      sessionID: "session_1",
      messageID: "message_1",
      agent: "Agent2",
      selectedAt: 1,
    })
  })

  test("does not restore a normal assistant response as a handoff", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: undefined,
        currentRecipientSelectedAt: undefined,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "Agent1",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "text",
            },
          ],
        },
      }),
    ).toBeUndefined()
  })

  test("keeps later manual recipient selection over restored handoff", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "Agent1",
        currentRecipientSelectedAt: 3,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "Agent2",
            time: {
              completed: 2,
            },
          },
        ],
      }),
    ).toBeUndefined()
  })

  test("restores handed off recipient from transfer tool parts when assistant agent is stale", () => {
    expect(
      resolveAgencyHandoffRecipientFromMessages({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "Agent1",
        currentRecipientSelectedAt: 1,
        sessionID: "session_1",
        messages: [
          {
            id: "message_1",
            role: "assistant",
            providerID: "agency-swarm",
            agent: "Agent1",
            time: {
              completed: 2,
            },
          },
        ],
        partsByMessage: {
          message_1: [
            {
              type: "tool",
              tool: "transfer_to_Agent2",
              state: {
                status: "completed",
                output: '{"assistant":"Agent2"}',
              },
            },
          ],
        },
      }),
    ).toEqual({
      sessionID: "session_1",
      messageID: "message_1",
      agent: "Agent2",
      selectedAt: 1,
    })
  })

  test("agency picker rows resolve to the live agency name without forcing an agent", () => {
    const selected = resolveAgencyTargetFromPicker({
      agencies: [
        {
          id: "local-agency",
          name: "Default Agency",
          description: "Local project agency",
          metadata: {},
          agents: [
            {
              id: "orchestrator",
              name: "Orchestrator",
              description: "Entry point",
              isEntryPoint: true,
            },
          ],
        },
      ],
      selectedAgency: "local-agency",
    })

    expect(selected).toEqual({
      agency: "local-agency",
      agencyLabel: "Default Agency",
      recipientAgent: undefined,
      label: "Default Agency",
    })
  })

  test("swarm row selection clears stale agent state with a fresh timestamp", () => {
    const options = buildAgencyTargetOptions({
      providerOptions: {
        baseURL: "http://127.0.0.1:18080",
        token: undefined,
        configToken: undefined,
        agency: "my-agency",
        recipientAgent: "ExampleAgent",
        discoveryTimeoutMs: 5000,
        rawOptions: {
          baseURL: "http://127.0.0.1:18080",
          agency: "my-agency",
          recipientAgent: "ExampleAgent",
          recipientAgentSelectedAt: 1,
        },
      },
      agency: "my-agency",
      recipientAgent: null,
    })

    expect(options.recipientAgent).toBeNull()
    expect(typeof options.recipientAgentSelectedAt).toBe("number")
  })

  test("does not re-adopt when agent is unchanged or matches build", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent",
        handoffEvidence: true,
      }),
    ).toBe(false)
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "build",
        handoffEvidence: true,
      }),
    ).toBe(false)
  })

  test("requires framework mode, agency context, and an assistant agent", () => {
    const base = {
      agency: "my-agency",
      currentRecipient: "ExampleAgent",
      assistantAgent: "ExampleAgent2",
      handoffEvidence: true,
    }
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: false, ...base })).toBe(false)
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: true, ...base, agency: undefined })).toBe(false)
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: true, ...base, assistantAgent: undefined })).toBe(false)
  })
})
