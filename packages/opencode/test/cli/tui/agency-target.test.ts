import { describe, expect, test } from "bun:test"
import {
  buildAgencyTargetOptions,
  hasAgencyHandoffEvidence,
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

  test("does not adopt a normal swarm/default assistant response as a handoff", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: undefined,
        assistantAgent: "ExampleAgent",
        handoffEvidence: false,
      }),
    ).toBe(false)
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent2",
        handoffEvidence: false,
      }),
    ).toBe(false)
  })

  test("handoff evidence requires transfer tool or handoff output", () => {
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "file_search",
          state: {
            status: "completed",
            metadata: { type: "function_call_output" },
          },
        },
      ]),
    ).toBe(false)
    expect(hasAgencyHandoffEvidence([{ type: "tool", tool: "transfer_to_support_agent" }])).toBe(true)
    expect(
      hasAgencyHandoffEvidence([
        {
          type: "tool",
          tool: "tool",
          state: {
            status: "completed",
            metadata: { type: "handoff_output_item" },
          },
        },
      ]),
    ).toBe(true)
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
