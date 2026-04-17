import { describe, expect, test } from "bun:test"
import { isUsableModel, selectCurrentModel, shouldSyncAgentModel } from "../../../src/cli/cmd/tui/context/local"

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

  test("does not keep agency-swarm usable when disabled_providers filters it out", () => {
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
        disabledProviders: ["agency-swarm"],
      }),
    ).toBe(false)
  })

  test("does not keep agency-swarm usable when enabled_providers excludes it", () => {
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
        enabledProviders: ["openai"],
      }),
    ).toBe(false)
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

  test("prefers configured agency-swarm model over stale agent model before user override", () => {
    expect(
      selectCurrentModel({
        agentModel: {
          providerID: "openai",
          modelID: "gpt-5",
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
    ).toEqual({
      providerID: "agency-swarm",
      modelID: "default",
    })
  })

  test("keeps explicit stored model overrides over configured agency-swarm", () => {
    expect(
      selectCurrentModel({
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
        },
        agentModel: {
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
          {
            id: "anthropic",
            models: {
              "claude-sonnet-4": {},
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
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("keeps explicit stored model overrides over launcher agency-swarm args", () => {
    expect(
      selectCurrentModel({
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
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
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("keeps explicit args.model overrides away from agency-swarm", () => {
    expect(
      selectCurrentModel({
        storedModel: {
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
        argModel: "openai/gpt-5",
        configModel: "agency-swarm/default",
        configuredProviders: {
          "agency-swarm": {
            name: "Agency Swarm",
            options: {},
          },
        },
      }),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("does not sync stale agent models into startup state for agency-swarm launcher mode", () => {
    expect(
      shouldSyncAgentModel({
        argModel: "agency-swarm/default",
      }),
    ).toBe(false)
  })

  test("does not sync agent models over explicit stored overrides", () => {
    expect(
      shouldSyncAgentModel({
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
        },
        configModel: "agency-swarm/default",
      }),
    ).toBe(false)
  })

  test("still syncs agent models in normal startup mode with no override", () => {
    expect(
      shouldSyncAgentModel({
        configModel: "openai/gpt-5",
      }),
    ).toBe(true)
  })
})
