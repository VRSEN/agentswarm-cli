import { describe, expect, test } from "bun:test"
import {
  buildAgencyTargetOptions,
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
      }),
    ).toBe(true)
  })

  test("does not re-adopt when agent is unchanged or matches build", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent",
      }),
    ).toBe(false)
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "build",
      }),
    ).toBe(false)
  })

  test("requires framework mode, agency context, and an assistant agent", () => {
    const base = {
      agency: "my-agency",
      currentRecipient: "ExampleAgent",
      assistantAgent: "ExampleAgent2",
    }
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: false, ...base })).toBe(false)
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: true, ...base, agency: undefined })).toBe(false)
    expect(shouldAdoptAgencyHandoffRecipient({ frameworkMode: true, ...base, assistantAgent: undefined })).toBe(false)
  })
})
