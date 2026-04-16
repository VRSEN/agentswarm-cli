import { describe, expect, test } from "bun:test"
import {
  hasUsableProvider,
  shouldOpenAgencyConnectDialog,
  shouldOpenStartupAuthDialog,
} from "../../../src/cli/cmd/tui/session-error"

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

  test("framework mode opens auth when only agency-swarm is configured", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("framework mode skips auth when explicit client_config exists", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {
              clientConfig: {
                api_key: "manual-openai",
              },
            },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode skips auth when explicit client_config has LiteLLM keys", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {
              clientConfig: {
                litellm_keys: {
                  anthropic: "manual-ant",
                },
              },
            },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode opens auth when explicit client_config has no credentials", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {
              clientConfig: {
                base_url: "https://proxy.example.com/v1",
                default_headers: {
                  "x-proxy": "1",
                },
              },
            },
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("framework mode skips auth when another provider is available", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "env",
            env: ["OPENAI_API_KEY"],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode skips auth when a configured provider carries an env key", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "config",
            env: ["OPENAI_API_KEY"],
            key: "env-openai",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode opens auth when another provider has no credential", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "config",
            env: ["OPENAI_API_KEY"],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("framework mode skips auth when stored oauth credentials are available", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "custom",
            env: [],
            options: {
              apiKey: "oauth-dummy",
            },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode skips auth when stored api credentials are available", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: {},
            models: {},
          },
          {
            id: "openai",
            name: "OpenAI",
            source: "api",
            env: ["OPENAI_API_KEY"],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })
})
