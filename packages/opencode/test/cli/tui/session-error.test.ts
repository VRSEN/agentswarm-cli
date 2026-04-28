import { describe, expect, test } from "bun:test"
import type { Provider } from "@opencode-ai/sdk/v2"
import {
  describeAgencyAuthFailure,
  shouldBlockAgencyPromptSubmit,
  shouldBlockAgencyPromptSend,
  shouldOpenAgencyAuthDialog,
  hasUsableProvider,
  isAgencySupportedProvider,
  isSupportedAgencyAuthProvider,
  isAgencySwarmFrameworkMode,
  shouldHideNativeCommandInRunMode,
  shouldOpenAgencyConnectDialog,
  shouldOpenStartupAuthDialog,
  describeStreamAuthError,
} from "../../../src/cli/cmd/tui/session-error"

describe("agency session errors", () => {
  test("hides native build commands in Run mode", () => {
    expect(shouldHideNativeCommandInRunMode({ frameworkMode: true, name: "init", source: "command" })).toBe(true)
    expect(shouldHideNativeCommandInRunMode({ frameworkMode: true, name: "review", source: "command" })).toBe(true)
    expect(shouldHideNativeCommandInRunMode({ frameworkMode: true, name: "rename", source: "command" })).toBe(false)
    expect(shouldHideNativeCommandInRunMode({ frameworkMode: false, name: "review", source: "command" })).toBe(false)
    expect(shouldHideNativeCommandInRunMode({ frameworkMode: true, name: "review", source: "mcp" })).toBe(false)
  })

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

  test("framework mode opens auth for non-loopback base URL when forwardUpstreamCredentials is on", () => {
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
              baseURL: "http://host.docker.internal:8000",
              forwardUpstreamCredentials: true,
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
    ).toBe(true)
  })

  test("framework mode opens auth for remote base URL when forwardUpstreamCredentials override is set", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        forwardUpstreamCredentials: true,
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
    ).toBe(true)
  })

  test("framework mode skips auth when forwarding is active and OPENAI_API_KEY is set in env", () => {
    const input = {
      frameworkMode: true,
      forwardUpstreamCredentials: true,
      env: { OPENAI_API_KEY: "sk-from-env" } as Record<string, string | undefined>,
      providers: [
        {
          id: "agency-swarm",
          name: "Agency Swarm",
          source: "config",
          env: [],
          options: { baseURL: "https://agency.example.com" },
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

    expect(shouldOpenStartupAuthDialog(input)).toBe(false)
    expect(
      shouldBlockAgencyPromptSubmit({
        currentProviderID: "agency-swarm",
        configuredModel: "agency-swarm/default",
        providers: input.providers,
        env: input.env,
        mode: "normal",
        isSlashCommand: false,
      }),
    ).toBe(false)
  })

  test("framework mode skips auth when forwarding is active and ANTHROPIC_API_KEY is set in env", () => {
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        forwardUpstreamCredentials: true,
        env: { ANTHROPIC_API_KEY: "sk-ant-env" },
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: { baseURL: "https://agency.example.com" },
            models: {},
          },
          {
            id: "anthropic",
            name: "Anthropic",
            source: "config",
            env: ["ANTHROPIC_API_KEY"],
            options: {},
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode skips auth from env even when the primary provider is filtered out", () => {
    // Mirrors SessionAgencySwarm.buildAuthClientConfig()'s direct OPENAI_API_KEY read:
    // the bridge can authenticate via env even when openai is not in the enabled provider list.
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        forwardUpstreamCredentials: true,
        env: { OPENAI_API_KEY: "sk-from-env" },
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            options: { baseURL: "https://agency.example.com" },
            models: {},
          },
        ],
      }),
    ).toBe(false)
  })

  test("framework mode opens auth when forwarding is active and only an agency-swarm bridge token is present", () => {
    // A bridge token authenticates the call to the bridge, not the upstream OpenAI/Anthropic request.
    expect(
      shouldOpenStartupAuthDialog({
        frameworkMode: true,
        forwardUpstreamCredentials: true,
        env: {},
        providers: [
          {
            id: "agency-swarm",
            name: "Agency Swarm",
            source: "config",
            env: [],
            key: "bridge-token",
            options: { baseURL: "https://agency.example.com" },
            models: {},
          },
        ],
      }),
    ).toBe(true)
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

  test("framework mode stays true when config default is agency-swarm even if session uses openai upstream", () => {
    expect(
      isAgencySwarmFrameworkMode({
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
      }),
    ).toBe(true)
  })

  test("framework mode is true when agent default is agency-swarm but session model is openai", () => {
    expect(
      isAgencySwarmFrameworkMode({
        currentProviderID: "openai",
        configuredModel: undefined,
        agentModel: { providerID: "agency-swarm", modelID: "default" },
      }),
    ).toBe(true)
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

  test("routes spaced 'Incorrect API key' upstream errors to auth", () => {
    const message = "Streaming request failed (401): Incorrect API key provided: sk-***"
    expect(shouldOpenAgencyConnectDialog({ providerID: "agency-swarm", message })).toBe(false)
    expect(shouldOpenAgencyAuthDialog({ providerID: "agency-swarm", message })).toBe(true)
  })

  test("routes invalid_api_key error code upstream errors to auth", () => {
    const message = 'Streaming request failed (401): {"error":{"code":"invalid_api_key","message":"Incorrect API key"}}'
    expect(shouldOpenAgencyConnectDialog({ providerID: "agency-swarm", message })).toBe(false)
    expect(shouldOpenAgencyAuthDialog({ providerID: "agency-swarm", message })).toBe(true)
  })

  test("routes litellm AuthenticationError upstream errors to auth", () => {
    const message =
      "Streaming request failed (500): litellm.AuthenticationError: AuthenticationError: OpenAIException - Incorrect API key provided"
    expect(shouldOpenAgencyConnectDialog({ providerID: "agency-swarm", message })).toBe(false)
    expect(shouldOpenAgencyAuthDialog({ providerID: "agency-swarm", message })).toBe(true)
  })

  test("routes Missing API key env-var hints to auth", () => {
    const message = "Streaming request failed (401): Please set OPENAI_API_KEY before retrying."
    expect(shouldOpenAgencyConnectDialog({ providerID: "agency-swarm", message })).toBe(false)
    expect(shouldOpenAgencyAuthDialog({ providerID: "agency-swarm", message })).toBe(true)
  })

  test("describes missing agency provider credentials with /auth add guidance", () => {
    expect(
      describeAgencyAuthFailure("Streaming request failed (401): Missing provider credentials in client_config"),
    ).toBe("No provider credential is configured. Run /auth to add it.")
  })

  test("describes rejected agency provider credentials with /auth update guidance", () => {
    expect(describeAgencyAuthFailure("Streaming request failed (403): Invalid API key for OpenAI")).toBe(
      "The current provider credential was rejected. Run /auth to update it.",
    )
  })
})

describe("isAgencySupportedProvider (/models filter)", () => {
  const mixed: Provider[] = [
    { id: "gemini", name: "Gemini", source: "config", env: [], options: {}, models: {} },
    { id: "github-copilot", name: "GitHub Copilot", source: "config", env: [], options: {}, models: {} },
    { id: "openai", name: "OpenAI", source: "config", env: [], options: {}, models: {} },
    { id: "anthropic", name: "Anthropic", source: "config", env: [], options: {}, models: {} },
    { id: "agency-swarm", name: "Agent Swarm", source: "config", env: [], options: {}, models: {} },
  ]

  // Mirrors DialogModel's `enabledProviders` memo: filter in framework mode, passthrough otherwise.
  function filterForDialog(providers: Provider[], frameworkMode: boolean) {
    return frameworkMode ? providers.filter((provider) => isAgencySupportedProvider(provider.id)) : providers
  }

  test("framework mode keeps only openai, anthropic, agency-swarm", () => {
    expect(filterForDialog(mixed, true).map((provider) => provider.id)).toEqual(["openai", "anthropic", "agency-swarm"])
  })

  test("non-framework mode passes the full provider list through", () => {
    expect(filterForDialog(mixed, false).map((provider) => provider.id)).toEqual([
      "gemini",
      "github-copilot",
      "openai",
      "anthropic",
      "agency-swarm",
    ])
  })
})

describe("describeStreamAuthError", () => {
  test("returns null for non-auth errors", () => {
    expect(describeStreamAuthError("Rate limit exceeded")).toBeNull()
    expect(describeStreamAuthError("Connection refused")).toBeNull()
  })

  test("returns null for generic AuthenticationError without a key-specific marker", () => {
    expect(describeStreamAuthError("AuthenticationError: token expired")).toBeNull()
    expect(describeStreamAuthError("AuthenticationError: oauth failed")).toBeNull()
  })

  test("detects missing Anthropic key from LiteLLM message", () => {
    const msg =
      "litellm.AuthenticationError: Missing Anthropic API Key - A call is being made to anthropic but no key is set either in the environment variables or via params. Please set `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` in your environment vars"
    expect(describeStreamAuthError(msg)).toBe("anthropic API key required. Run /auth to add it.")
  })

  test("detects missing OpenAI key", () => {
    const msg = "AuthenticationError: Missing OpenAI API Key"
    expect(describeStreamAuthError(msg)).toBe("openai API key required. Run /auth to add it.")
  })

  test("detects missing provider credential from generic AuthenticationError text", () => {
    const msg = "AuthenticationError: Missing provider OpenAI credential"
    expect(describeStreamAuthError(msg)).toBe("openai API key required. Run /auth to add it.")
  })

  test("detects missing key from env-var hints in error text", () => {
    const msg = "litellm.AuthenticationError: Please set OPENAI_API_KEY before retrying."
    expect(describeStreamAuthError(msg)).toBe("openai API key required. Run /auth to add it.")
  })

  test("detects rejected key via incorrect_api_key code", () => {
    const msg =
      'litellm.AuthenticationError: OpenAIException - {"error":{"message":"Incorrect API key","code":"incorrect_api_key"}}'
    expect(describeStreamAuthError(msg)).toBe("API key rejected. Run /auth to update it.")
  })

  test("detects rejected key via invalid_api_key code", () => {
    const msg = 'AuthenticationError: {"error":{"code":"invalid_api_key"}}'
    expect(describeStreamAuthError(msg)).toBe("API key rejected. Run /auth to update it.")
  })

  test("detects rejected key via Invalid API key for provider", () => {
    const msg = "Error: Invalid API key for Anthropic"
    expect(describeStreamAuthError(msg)).toBe("API key rejected. Run /auth to update it.")
  })

  test("detects rejected key via spaced 'Incorrect API key' phrasing", () => {
    expect(describeStreamAuthError("Streaming request failed (401): Incorrect API key provided: sk-***")).toBe(
      "API key rejected. Run /auth to update it.",
    )
  })

  test("detects rejected key via bare 'Invalid API key' without provider", () => {
    expect(describeStreamAuthError("Error: Invalid API key")).toBe("API key rejected. Run /auth to update it.")
  })

  test("detects rejected key via LiteLLM AuthenticationError marker", () => {
    const msg = "litellm.AuthenticationError: API key rejected by upstream"
    expect(describeStreamAuthError(msg)).toBe("API key rejected. Run /auth to update it.")
  })

  test("falls back to generic missing hint when provider unknown", () => {
    const msg = "no key is set"
    expect(describeStreamAuthError(msg)).toBe("Missing API key. Run /auth to add it.")
  })

  test("falls back to generic missing hint for any LiteLLM auth error shape", () => {
    const msg = "litellm.AuthenticationError: oauth failed"
    expect(describeStreamAuthError(msg)).toBe("Missing API key. Run /auth to add it.")
  })

  test("prioritizes missing over rejected when both patterns appear", () => {
    const msg = 'litellm.AuthenticationError: Missing Anthropic API Key {"error":{"code":"invalid_api_key"}}'
    expect(describeStreamAuthError(msg)).toBe("anthropic API key required. Run /auth to add it.")
  })
})
