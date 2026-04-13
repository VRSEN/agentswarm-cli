import { describe, expect, test } from "bun:test"
import { hasUsableProvider, shouldOpenAgencyConnectDialog } from "../../../src/cli/cmd/tui/session-error"

describe("agency session errors", () => {
  test("opens connect dialog for unreachable agency backend errors", () => {
    expect(
      shouldOpenAgencyConnectDialog({
        providerID: "agency-swarm",
        message: "Failed to stream responses: cannot reach agency-swarm backend at http://127.0.0.1:8080/openapi.json.",
      }),
    ).toBe(true)
  })

  test("ignores unrelated providers and errors", () => {
    expect(
      shouldOpenAgencyConnectDialog({
        providerID: "openai",
        message: "Failed to stream responses: cannot reach agency-swarm backend at http://127.0.0.1:8080/openapi.json.",
      }),
    ).toBe(false)

    expect(
      shouldOpenAgencyConnectDialog({
        providerID: "agency-swarm",
        message: "Rate limit exceeded",
      }),
    ).toBe(false)
  })

  test("treats openai as a usable provider", () => {
    expect(
      hasUsableProvider([
        {
          id: "openai",
          name: "OpenAI",
          source: "config",
          env: [],
          options: {},
          models: {},
        },
      ]),
    ).toBe(true)
  })

  test("treats free-only opencode as not usable for startup auth gating", () => {
    expect(
      hasUsableProvider([
        {
          id: "opencode",
          name: "OpenCode",
          source: "config",
          env: [],
          options: {},
          models: {
            "gpt-5-nano": {
              id: "gpt-5-nano",
              providerID: "opencode",
              api: {
                id: "gpt-5-nano",
                url: "https://example.test",
                npm: "@ai-sdk/openai",
              },
              name: "GPT-5 Nano",
              release_date: "2026-01-01",
              capabilities: {
                temperature: false,
                reasoning: false,
                attachment: false,
                toolcall: false,
                interleaved: false,
                input: {
                  text: true,
                  audio: false,
                  image: false,
                  video: false,
                  pdf: false,
                },
                output: {
                  text: true,
                  audio: false,
                  image: false,
                  video: false,
                  pdf: false,
                },
              },
              cost: {
                input: 0,
                output: 0,
                cache: {
                  read: 0,
                  write: 0,
                },
              },
              limit: {
                context: 128000,
                output: 4096,
              },
              status: "active",
              options: {},
              headers: {},
            },
          },
        },
      ]),
    ).toBe(false)
  })
})
