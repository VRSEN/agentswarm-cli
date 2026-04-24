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

  test("adopts completed handoff agent as selected run target", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent2",
        completed: true,
      }),
    ).toBe(true)
  })

  test("does not adopt incomplete or unchanged handoff agent", () => {
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent2",
        completed: false,
      }),
    ).toBe(false)
    expect(
      shouldAdoptAgencyHandoffRecipient({
        frameworkMode: true,
        agency: "my-agency",
        currentRecipient: "ExampleAgent",
        assistantAgent: "ExampleAgent",
        completed: true,
      }),
    ).toBe(false)
  })
})
