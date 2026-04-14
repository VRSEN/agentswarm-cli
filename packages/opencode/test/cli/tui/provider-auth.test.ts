import { expect, test } from "bun:test"
import { hasStoredProviderCredential } from "../../../src/cli/cmd/tui/util/provider-auth"

test("detects stored api credentials", () => {
  expect(
    hasStoredProviderCredential(
      [
        {
          id: "openai",
          name: "OpenAI",
          source: "api",
          env: [],
          options: {},
          models: {},
        },
      ],
      {},
      "openai",
    ),
  ).toBe(true)
})

test("does not treat env-backed providers as stored credentials", () => {
  expect(
    hasStoredProviderCredential(
      [
        {
          id: "openai",
          name: "OpenAI",
          source: "env",
          env: ["OPENAI_API_KEY"],
          options: {},
          models: {},
        },
      ],
      {},
      "openai",
    ),
  ).toBe(false)
})

test("detects stored oauth credentials for custom providers", () => {
  expect(
    hasStoredProviderCredential(
      [
        {
          id: "openai",
          name: "OpenAI",
          source: "custom",
          env: [],
          options: {},
          models: {},
        },
      ],
      {
        openai: [
          {
            type: "oauth",
            label: "ChatGPT",
          },
        ],
      },
      "openai",
    ),
  ).toBe(true)
})

test("does not treat opencode public mode as a stored credential", () => {
  expect(
    hasStoredProviderCredential(
      [
        {
          id: "opencode",
          name: "OpenCode",
          source: "custom",
          env: [],
          options: {
            apiKey: "public",
          },
          models: {},
        },
      ],
      {},
      "opencode",
    ),
  ).toBe(false)
})
