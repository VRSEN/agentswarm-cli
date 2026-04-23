import { describe, expect, test } from "bun:test"
import { buildAgencyTargetOptions } from "../../../src/cli/cmd/tui/util/agency-target"

describe("agency target options", () => {
  test("clears stale snake_case recipient state when /agents switches recipients", () => {
    expect(
      buildAgencyTargetOptions({
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
          },
        },
        agency: "my-agency",
        recipientAgent: "ExampleAgent2",
      }),
    ).toEqual({
      baseURL: "http://127.0.0.1:18080",
      agency: "my-agency",
      discoveryTimeoutMs: 5000,
      recipientAgent: "ExampleAgent2",
      recipient_agent: null,
    })
  })
})
