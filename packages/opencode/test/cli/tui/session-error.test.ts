import { describe, expect, test } from "bun:test"
import type { Provider } from "@opencode-ai/sdk/v2"
import {
  shouldBlockAgencyPromptSubmit,
  shouldBlockAgencyPromptSend,
  shouldOpenAgencyAuthDialog,
  hasUsableProvider,
  isSupportedAgencyAuthProvider,
  isAgencySwarmFrameworkMode,
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

  test("framework mode skips local provider auth for remote agency-swarm backends", () => {
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
              baseURL: "https://agency.example.com",
            },
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
    ).toBe(false)
  })

  test("framework mode also skips local provider auth for remote agency-swarm backends using base_url", () => {
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
              base_url: "https://agency.example.com",
            },
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
    ).toBe(false)
  })

  test("framework mode follows the current provider override away from agency-swarm", () => {
    expect(
      isAgencySwarmFrameworkMode({
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
      }),
    ).toBe(false)
  })

  test("framework mode falls back to the configured agency-swarm model when no current provider is selected", () => {
    expect(
      isAgencySwarmFrameworkMode({
        configuredModel: "agency-swarm/default",
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

  test("framework mode skips auth when agency-swarm already has a token", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            key: "server-token",
            options: {},
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

  test("framework mode skips auth when explicit client_config authenticates through headers", () => {
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
                  Authorization: "Bearer proxy-token",
                },
              },
            },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode opens auth when auth-like headers are empty", () => {
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
                  Authorization: "",
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
            key: "env-openai",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode opens auth when env-backed provider only has non-secret config", () => {
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
            id: "azure",
            name: "Azure OpenAI",
            source: "env",
            env: ["AZURE_RESOURCE_NAME", "AZURE_API_KEY"],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
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
              apiKey: "codex-dummy",
            },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode still opens auth when only oauth methods are available", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providerAuth: {
          openai: [
            {
              type: "oauth",
              label: "ChatGPT",
            },
          ],
        },
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
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
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
            key: "sk-openai",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode still opens auth when an unsupported provider is credentialed", () => {
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
            id: "unsupported-provider",
            name: "Unsupported Provider",
            source: "api",
            env: ["UNSUPPORTED_API_KEY"],
            key: "unsupported-key",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("framework mode still opens auth when only a non-primary provider is credentialed", () => {
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
            id: "google",
            name: "Google",
            source: "api",
            env: ["GOOGLE_API_KEY"],
            key: "google-key",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("framework auth only supports openai and anthropic", () => {
    expect(isSupportedAgencyAuthProvider("openai")).toBe(true)
    expect(isSupportedAgencyAuthProvider("anthropic")).toBe(true)
    expect(isSupportedAgencyAuthProvider("google")).toBe(false)
    expect(isSupportedAgencyAuthProvider("github-copilot")).toBe(false)
  })

  test("framework mode still opens auth when a LiteLLM provider only has oauth methods", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        providerAuth: {
          "github-copilot": [
            {
              type: "oauth",
              label: "GitHub sign-in",
            },
          ],
        },
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
            id: "github-copilot",
            name: "GitHub Copilot",
            source: "custom",
            env: [],
            options: {
              fetch: () => Promise.resolve(new Response()),
            },
            models: {},
          },
        ],
      }),
    ).toBe(true)
  })

  test("blocks the first agency prompt when supported auth is missing", () => {
    expect(
      shouldBlockAgencyPromptSend({
        currentProviderID: "agency-swarm",
        configuredModel: "agency-swarm/default",
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

  test("does not block the first agency prompt when supported auth exists", () => {
    expect(
      shouldBlockAgencyPromptSend({
        currentProviderID: "agency-swarm",
        configuredModel: "agency-swarm/default",
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
            id: "anthropic",
            name: "Anthropic",
            source: "api",
            env: ["ANTHROPIC_API_KEY"],
            key: "sk-ant",
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("does not block shell mode or slash commands during agency auth gating", () => {
    const input = {
      currentProviderID: "agency-swarm",
      configuredModel: "agency-swarm/default",
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
      ] satisfies Provider[],
    }

    expect(
      shouldBlockAgencyPromptSubmit({
        ...input,
        mode: "shell",
        isSlashCommand: false,
      }),
    ).toBe(false)

    expect(
      shouldBlockAgencyPromptSubmit({
        ...input,
        mode: "normal",
        isSlashCommand: true,
      }),
    ).toBe(false)
  })

  test("opens auth dialog for agency auth failures", () => {
    expect(
      shouldOpenAgencyAuthDialog({
        providerID: "agency-swarm",
        message: "Streaming request failed (401): Missing provider credentials in client_config",
      }),
    ).toBe(true)

    expect(
      shouldOpenAgencyAuthDialog({
        providerID: "agency-swarm",
        message: "cannot reach agency-swarm backend at http://127.0.0.1:8000/openapi.json",
      }),
    ).toBe(false)
  })

  test("opens connect instead of auth for agency server authorization failures", () => {
    expect(
      shouldOpenAgencyConnectDialog({
        providerID: "agency-swarm",
        message: "Streaming request failed (401): Unauthorized",
      }),
    ).toBe(true)

    expect(
      shouldOpenAgencyAuthDialog({
        providerID: "agency-swarm",
        message: "Streaming request failed (401): Unauthorized",
      }),
    ).toBe(false)
  })

  test("keeps provider credential rejection routed to auth", () => {
    expect(
      shouldOpenAgencyConnectDialog({
        providerID: "agency-swarm",
        message: "Streaming request failed (403): Invalid API key for OpenAI",
      }),
    ).toBe(false)

    expect(
      shouldOpenAgencyAuthDialog({
        providerID: "agency-swarm",
        message: "Streaming request failed (403): Invalid API key for OpenAI",
      }),
    ).toBe(true)
  })
})
