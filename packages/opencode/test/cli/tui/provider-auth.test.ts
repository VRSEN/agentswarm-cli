import { expect, test } from "bun:test"
import {
  getStoredProviderAuthMethod,
  getVisibleProviderAuthMethods,
  hasStoredProviderCredential,
  OAUTH_DUMMY_KEY,
} from "../../../src/cli/cmd/tui/util/provider-auth"

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

test("keeps only API auth methods for non-openai providers in agency-swarm framework mode", () => {
  expect(
    getVisibleProviderAuthMethods(
      "github-copilot",
      [
        { type: "oauth", label: "GitHub sign-in" },
        { type: "api", label: "API key" },
      ],
      { frameworkMode: true },
    ),
  ).toEqual([{ type: "api", label: "API key" }])
})

test("getStoredProviderAuthMethod returns 'api' for stored API key", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "api",
      env: [],
      options: {},
      models: {},
    }),
  ).toBe("api")
})

test("getStoredProviderAuthMethod returns 'env' for env-backed providers", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "env",
      env: ["OPENAI_API_KEY"],
      options: {},
      models: {},
    }),
  ).toBe("env")
})

test("getStoredProviderAuthMethod returns 'config' for config-backed providers", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "config",
      env: [],
      options: { apiKey: "sk-config" },
      models: {},
    }),
  ).toBe("config")
})

test("getStoredProviderAuthMethod ignores config-only provider options without an API key", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "config",
      env: [],
      options: { whitelist: ["gpt-4.1"] },
      models: {},
    }),
  ).toBeUndefined()
})

test("getStoredProviderAuthMethod returns 'oauth' for OAUTH_DUMMY_KEY-marked custom providers", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "custom",
      env: [],
      options: { apiKey: OAUTH_DUMMY_KEY },
      models: {},
    }),
  ).toBe("oauth")
})

test("getStoredProviderAuthMethod returns undefined for opencode public mode", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "opencode",
      name: "OpenCode",
      source: "custom",
      env: [],
      options: { apiKey: "public" },
      models: {},
    }),
  ).toBeUndefined()
})

test("getStoredProviderAuthMethod returns undefined for empty custom options", () => {
  expect(
    getStoredProviderAuthMethod({
      id: "openai",
      name: "OpenAI",
      source: "custom",
      env: [],
      options: {},
      models: {},
    }),
  ).toBeUndefined()
})
