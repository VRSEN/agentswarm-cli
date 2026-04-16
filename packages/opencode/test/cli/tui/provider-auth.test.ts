import { expect, test } from "bun:test"
import { getVisibleProviderAuthMethods, hasStoredProviderCredential } from "../../../src/cli/cmd/tui/util/provider-auth"

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
          options: {
            apiKey: "codex-dummy",
          },
          models: {},
        },
      ],
      {},
      "openai",
    ),
  ).toBe(true)
})

test("does not treat auth method catalogs as stored credentials", () => {
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
  ).toBe(false)
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

test("hides openai headless auth in agency-swarm framework mode", () => {
  expect(
    getVisibleProviderAuthMethods(
      "openai",
      [
        { type: "oauth", label: "ChatGPT Pro/Plus (browser)" },
        { type: "oauth", label: "ChatGPT Pro/Plus (headless)" },
        { type: "api", label: "Manually enter API Key" },
      ],
      { frameworkMode: true },
    ),
  ).toEqual([
    { type: "oauth", label: "ChatGPT Pro/Plus (browser)" },
    { type: "api", label: "Manually enter API Key" },
  ])
})

test("keeps openai headless auth outside agency-swarm framework mode", () => {
  expect(
    getVisibleProviderAuthMethods(
      "openai",
      [
        { type: "oauth", label: "ChatGPT Pro/Plus (browser)" },
        { type: "oauth", label: "ChatGPT Pro/Plus (headless)" },
      ],
      { frameworkMode: false },
    ),
  ).toEqual([
    { type: "oauth", label: "ChatGPT Pro/Plus (browser)" },
    { type: "oauth", label: "ChatGPT Pro/Plus (headless)" },
  ])
})
