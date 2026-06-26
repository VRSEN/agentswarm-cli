import { describe, expect, test } from "bun:test"
import {
  inferProductMode,
  isUsableModel,
  readAgencySwarmBridge,
  readSessionAgencySwarmBridge,
  selectCurrentModel,
  shouldSyncAgentModel,
} from "../../../src/cli/cmd/tui/context/local"

describe("tui local model selection", () => {
  test("infers reopened Build and Plan sessions before launcher Run config", () => {
    const agentModel = {
      providerID: "openai",
      modelID: "gpt-5",
    }

    expect(
      inferProductMode({
        agentName: "plan",
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        agentModel,
      }),
    ).toBe("plan")
    expect(
      inferProductMode({
        agentName: "build",
        storedMode: "build",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("build")
    expect(
      inferProductMode({
        agentName: "build",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        storedBridge: true,
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "build",
        storedMode: "run",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        storedBridge: false,
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "plan",
        storedMode: "build",
        storedBridge: false,
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("build")
    expect(
      inferProductMode({
        agentName: "plan",
        storedBridge: true,
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "plan",
        storedBridge: false,
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("plan")
    expect(
      inferProductMode({
        agentName: "ExampleAgent",
        storedMode: "plan",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("build")
    expect(
      inferProductMode({
        agentName: "ExampleAgent",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "build",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        argModel: "openai/gpt-5",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "build",
        argModel: "agency-swarm/default",
        currentProviderID: "openai",
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "build",
        currentProviderID: "agency-swarm",
        hasAgencySwarmProvider: true,
        agentModel,
      }),
    ).toBe("run")
    expect(
      inferProductMode({
        agentName: "build",
        currentProviderID: "agency-swarm",
        hasAgencySwarmProvider: true,
        disabledProviders: ["agency-swarm"],
        agentModel,
      }),
    ).toBe("build")
    expect(
      inferProductMode({
        agentName: "build",
        currentProviderID: "agency-swarm",
        hasAgencySwarmProvider: true,
        enabledProviders: ["openai"],
        agentModel,
      }),
    ).toBe("build")
  })

  test("reads saved Agency Swarm bridge metadata from text, subtask, and compaction parts", () => {
    expect(
      readAgencySwarmBridge([
        {
          id: "prt_1",
          sessionID: "ses_1",
          messageID: "msg_1",
          type: "text",
          text: "hello",
          metadata: {
            agencySwarmBridge: true,
          },
        },
      ]),
    ).toBe(true)
    expect(
      readAgencySwarmBridge([
        {
          id: "prt_2",
          sessionID: "ses_1",
          messageID: "msg_1",
          type: "subtask",
          prompt: "hello",
          description: "hello",
          agent: "build",
          metadata: {
            agencySwarmBridge: false,
          },
        },
      ]),
    ).toBe(false)
    expect(
      readAgencySwarmBridge([
        {
          id: "prt_3",
          sessionID: "ses_1",
          messageID: "msg_1",
          type: "compaction",
          auto: false,
          metadata: {
            agencySwarmBridge: true,
          },
        },
      ]),
    ).toBe(true)
  })

  test("infers legacy bridge mode from assistant children", () => {
    const messages: Parameters<typeof readSessionAgencySwarmBridge>[0]["messages"] = [
      {
        id: "msg_1",
        role: "user",
      },
      {
        id: "msg_2",
        role: "assistant",
        parentID: "msg_1",
        providerID: "agency-swarm",
      },
    ]

    expect(
      readSessionAgencySwarmBridge({
        messages,
        parts: {},
      }),
    ).toBe(true)
    expect(
      readSessionAgencySwarmBridge({
        messages,
        parts: {
          msg_1: [
            {
              id: "prt_1",
              sessionID: "ses_1",
              messageID: "msg_1",
              type: "text",
              text: "hello",
              metadata: {
                agencySwarmBridge: false,
              },
            },
          ],
        },
      }),
    ).toBe(false)
    expect(
      readSessionAgencySwarmBridge({
        messages: [
          {
            id: "msg_3",
            role: "user",
          },
          {
            id: "msg_4",
            role: "assistant",
            parentID: "msg_3",
            providerID: "openai",
          },
        ],
        parts: {},
      }),
    ).toBe(false)
    expect(
      readSessionAgencySwarmBridge({
        messages: [
          {
            id: "msg_5",
            role: "user",
          },
          {
            id: "msg_6",
            role: "assistant",
            parentID: "msg_5",
            providerID: "agency-swarm",
          },
          {
            id: "msg_7",
            role: "user",
          },
          {
            id: "msg_8",
            role: "assistant",
            parentID: "msg_7",
            providerID: "openai",
          },
        ],
        parts: {},
      }),
    ).toBe(false)
    expect(
      readSessionAgencySwarmBridge({
        messages: [
          {
            id: "msg_9",
            role: "user",
          },
        ],
        parts: {},
      }),
    ).toBeUndefined()
  })

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

  test("keeps Run mode agency-swarm model usable without global config", () => {
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
        productMode: "run",
      }),
    ).toBe(true)
  })

  test("keeps Agency-supported provider models usable in Run mode", () => {
    expect(
      isUsableModel({
        model: {
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
        productMode: "run",
      }),
    ).toBe(true)
  })

  test("rejects Build-only provider models in Run mode", () => {
    const input = {
      model: {
        providerID: "github-copilot",
        modelID: "gpt-5",
      },
      providers: [
        {
          id: "github-copilot",
          models: {
            "gpt-5": {},
          },
        },
      ],
    }

    expect(isUsableModel({ ...input, productMode: "build" })).toBe(true)
    expect(isUsableModel({ ...input, productMode: "run" })).toBe(false)
  })

  test("rejects agency-swarm models in Build and Plan even when provider metadata is loaded", () => {
    const input = {
      model: {
        providerID: "agency-swarm",
        modelID: "default",
      },
      providers: [
        {
          id: "agency-swarm",
          models: {
            default: {},
          },
        },
        {
          id: "openai",
          models: {
            "gpt-5": {},
          },
        },
      ],
      configModel: "agency-swarm/default",
    }

    expect(isUsableModel({ ...input, productMode: "build" })).toBe(false)
    expect(isUsableModel({ ...input, productMode: "plan" })).toBe(false)
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

  test("does not keep Run mode agency-swarm usable when disabled_providers filters it out", () => {
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
        productMode: "run",
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

  test("keeps local Run mode model state without global config", () => {
    expect(
      selectCurrentModel({
        storedModel: {
          providerID: "agency-swarm",
          modelID: "default",
          explicit: true,
        },
        providers: [
          {
            id: "openai",
            models: {
              "gpt-5": {},
            },
          },
        ],
        productMode: "run",
      }),
    ).toEqual({
      providerID: "agency-swarm",
      modelID: "default",
    })
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

  test("keeps Build and Plan agent models ahead of agency-swarm launcher fallback", () => {
    const input = {
      agentModel: {
        providerID: "openai",
        modelID: "gpt-5",
      },
      recentModels: [
        {
          providerID: "anthropic",
          modelID: "claude-sonnet-4",
        },
      ],
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
    }

    expect(selectCurrentModel({ ...input, productMode: "build" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
    expect(selectCurrentModel({ ...input, productMode: "plan" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("uses inferred Build and Plan modes when selecting the current model", () => {
    const input = {
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
      hasAgencySwarmProvider: true,
      storedBridge: false,
    }

    expect(selectCurrentModel({ ...input, agentName: "build" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
    expect(selectCurrentModel({ ...input, agentName: "plan" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("falls back when configured agency-swarm is filtered out", () => {
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
        enabledProviders: ["openai"],
      }),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
  })

  test("skips filtered and unusable provider-list fallbacks", () => {
    expect(
      selectCurrentModel({
        providers: [
          {
            id: "agency-swarm",
            models: {
              default: {},
            },
          },
          {
            id: "openai",
            models: {
              "gpt-disabled": { id: "gpt-disabled" },
            },
          },
          {
            id: "anthropic",
            models: {},
          },
          {
            id: "openrouter",
            models: {
              "openrouter-default": { id: "openrouter-default" },
            },
          },
        ],
        providerDefaults: {
          anthropic: "missing-default",
          openrouter: "openrouter-default",
        },
        productMode: "build",
        enabledProviders: ["anthropic", "openrouter"],
        disabledProviders: ["openai"],
      }),
    ).toEqual({
      providerID: "openrouter",
      modelID: "openrouter-default",
    })
  })

  test("prefers configured agency-swarm over stale stored model state", () => {
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
      providerID: "agency-swarm",
      modelID: "default",
    })
  })

  test("prefers launcher agency-swarm args over stale stored model state", () => {
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
      providerID: "agency-swarm",
      modelID: "default",
    })
  })

  test("keeps explicit current user model overrides over launcher agency-swarm args", () => {
    expect(
      selectCurrentModel({
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
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

  test("keeps explicit saved Run-mode session model over configured agency-swarm", () => {
    expect(
      selectCurrentModel({
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
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
