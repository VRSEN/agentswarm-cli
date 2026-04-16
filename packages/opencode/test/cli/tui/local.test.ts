import { describe, expect, test } from "bun:test"
import { isUsableModel } from "../../../src/cli/cmd/tui/context/local"

describe("tui local model selection", () => {
  test("keeps agency-swarm launcher model usable before provider metadata loads", () => {
    expect(
      isUsableModel({
        model: {
          providerID: "agency-swarm",
          modelID: "default",
        },
        providers: [
          {
            id: "openai",
            models: {
              "gpt-5": {},
            },
          },
        ],
        configModel: "agency-swarm/default",
        configuredProviders: {
          "agency-swarm": {
            name: "Agency Swarm",
            options: {},
          },
        },
      }),
    ).toBe(true)
  })

  test("keeps explicit agency-swarm args.model usable before provider metadata loads", () => {
    expect(
      isUsableModel({
        model: {
          providerID: "agency-swarm",
          modelID: "default",
        },
        providers: [
          {
            id: "openai",
            models: {
              "gpt-5": {},
            },
          },
        ],
        argModel: "agency-swarm/default",
        configuredProviders: {
          "agency-swarm": {
            name: "Agency Swarm",
            options: {},
          },
        },
      }),
    ).toBe(true)
  })

  test("keeps explicit agency-swarm args.model usable before provider config loads", () => {
    expect(
      isUsableModel({
        model: {
          providerID: "agency-swarm",
          modelID: "default",
        },
        providers: [
          {
            id: "openai",
            models: {
              "gpt-5": {},
            },
          },
        ],
        argModel: "agency-swarm/default",
      }),
    ).toBe(true)
  })

  test("does not treat unrelated missing models as usable", () => {
    expect(
      isUsableModel({
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4",
        },
        providers: [
          {
            id: "openai",
            models: {
              "gpt-5": {},
            },
          },
        ],
        configModel: "agency-swarm/default",
        configuredProviders: {
          "agency-swarm": {
            name: "Agency Swarm",
            options: {},
          },
        },
      }),
    ).toBe(false)
  })
})
