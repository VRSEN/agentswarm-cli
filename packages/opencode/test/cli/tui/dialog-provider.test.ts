import { describe, expect, test } from "bun:test"
import type { Provider, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import { listRemovableAuthProviders } from "../../../src/cli/cmd/tui/component/dialog-provider"

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
})
