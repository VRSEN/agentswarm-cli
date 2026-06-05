import { describe, expect, test } from "bun:test"
import type { Provider, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import {
  agencyConnectServerOptions,
  listRemovableAuthProviders,
} from "../../../src/cli/cmd/tui/component/dialog-provider"

describe("dialog provider auth management", () => {
  test("keeps stored oauth-only providers removable in framework auth mode", () => {
    const providers = [
      {
        id: "github-copilot",
        name: "GitHub Copilot",
        source: "custom",
        env: [],
        options: {
          accessToken: "copilot-token",
        },
        models: {},
      },
    ] satisfies Provider[]
    const methods = {
      "github-copilot": [
        {
          type: "oauth",
          label: "GitHub sign-in",
        },
      ],
    } satisfies Record<string, ProviderAuthMethod[]>

    expect(
      listRemovableAuthProviders({
        all: [{ id: "github-copilot", name: "GitHub Copilot" }],
        providers,
        providerAuth: methods,
        consoleManagedProviders: [],
      }).map((provider) => provider.id),
    ).toEqual(["github-copilot"])
  })

  test("connect server options clear remembered recipients when switching servers", () => {
    expect(
      agencyConnectServerOptions({
        options: {
          baseURL: "http://127.0.0.1:8000",
          agency: "old-agency",
          recipientAgent: "PlannerAgent",
          recipient_agent: "legacy_planner",
          token: "config-token",
        },
        baseURL: "http://127.0.0.1:9000",
        currentBaseURL: "http://127.0.0.1:8000",
        localServers: ["http://127.0.0.1:8000"],
        discoveryTimeoutMs: 12000,
        configToken: "config-token",
      }),
    ).toEqual({
      baseURL: "http://127.0.0.1:9000",
      agency: null,
      recipientAgent: null,
      recipient_agent: null,
      token: "config-token",
      localServers: ["http://127.0.0.1:8000", "http://127.0.0.1:9000"],
      discoveryTimeoutMs: 12000,
    })
  })

  test("connect server options preserve same-server recipients", () => {
    expect(
      agencyConnectServerOptions({
        options: {
          baseURL: "http://127.0.0.1:8000",
          agency: "current-agency",
          recipient_agent: "legacy_planner",
        },
        baseURL: "http://127.0.0.1:8000",
        currentBaseURL: "http://127.0.0.1:8000",
        localServers: [],
        discoveryTimeoutMs: 12000,
      }),
    ).toEqual({
      baseURL: "http://127.0.0.1:8000",
      agency: "current-agency",
      recipientAgent: "legacy_planner",
      recipient_agent: "legacy_planner",
      token: null,
      localServers: ["http://127.0.0.1:8000"],
      discoveryTimeoutMs: 12000,
    })
  })
})
