import { describe, expect, test } from "bun:test"
import { isUsableModel, selectCurrentModel } from "../../../src/cli/cmd/tui/context/local"

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

  test("prefers configured agency-swarm model over stale stored model state", () => {
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
})
