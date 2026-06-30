/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createStore } from "solid-js/store"
import * as ArgsContext from "../../../src/cli/cmd/tui/context/args"
import * as EventContext from "../../../src/cli/cmd/tui/context/event"
import { inferProductMode, LocalProvider, useLocal } from "../../../src/cli/cmd/tui/context/local"
import * as RouteContext from "../../../src/cli/cmd/tui/context/route"
import * as SDKContext from "../../../src/cli/cmd/tui/context/sdk"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ThemeContext from "../../../src/cli/cmd/tui/context/theme"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import { Filesystem } from "../../../src/util/filesystem"

function flushEffects() {
  return Promise.resolve().then(() => Promise.resolve())
}

describe("tui local context product mode inference", () => {
  test("keeps Run mode when Agency Swarm is configured over stale explicit provider state", () => {
    expect(
      inferProductMode({
        agentName: "build",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
      }),
    ).toBe("run")
  })

  test("preserves explicit Build and Plan mode selections", () => {
    expect(
      inferProductMode({
        storedMode: "build",
        agentName: "build",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
      }),
    ).toBe("build")

    expect(
      inferProductMode({
        storedMode: "plan",
        agentName: "plan",
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
      }),
    ).toBe("plan")
  })

  test("keeps stored native bridge sessions out of Run mode", () => {
    expect(
      inferProductMode({
        agentName: "build",
        storedBridge: false,
        storedModel: {
          providerID: "openai",
          modelID: "gpt-5",
          explicit: true,
        },
        currentProviderID: "openai",
        configuredModel: "agency-swarm/default",
        hasAgencySwarmProvider: true,
      }),
    ).toBe("build")
  })
})

describe("tui local context model sync", () => {
  afterEach(() => {
    mock.restore()
  })

  test("keeps following agent model changes without creating a local override", async () => {
    const [syncData, setSyncData] = createStore<any>({
      agent: [
        {
          name: "writer",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "gpt-5",
          },
        },
      ],
      provider: [
        {
          id: "openai",
          name: "OpenAI",
          models: {
            "gpt-5": { id: "gpt-5", name: "GPT-5" },
            "gpt-5.1": { id: "gpt-5.1", name: "GPT-5.1" },
          },
        },
      ],
      provider_default: {
        openai: "gpt-5",
      },
      session: [],
      config: {
        model: undefined,
        provider: {},
      },
      mcp: {},
    })

    spyOn(SyncContext, "useSync").mockReturnValue({ data: syncData } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(RouteContext, "useRoute").mockReturnValue({
      data: {
        type: "home",
      },
      navigate: () => {},
    } as any)
    spyOn(EventContext, "useEvent").mockReturnValue({
      on: () => () => {},
      subscribe: () => () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        mcp: {
          disconnect: async () => {},
          connect: async () => {},
        },
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        secondary: {},
        accent: {},
        success: {},
        warning: {},
        primary: {},
        error: {},
        info: {},
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)
    spyOn(Filesystem, "readJson").mockResolvedValue({})
    spyOn(Filesystem, "writeJson").mockResolvedValue(undefined)

    let local!: ReturnType<typeof useLocal>

    const Capture = () => {
      local = useLocal()
      return <box />
    }

    await testRender(() => (
      <LocalProvider>
        <Capture />
      </LocalProvider>
    ))

    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })
    expect(local.model.override("writer")).toBeUndefined()

    setSyncData("agent", 0, "model", {
      providerID: "openai",
      modelID: "gpt-5.1",
    })
    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5.1",
    })
    expect(local.model.override("writer")).toBeUndefined()
  })

  test("skips Run-only recent models when cycling in Build mode", async () => {
    const [syncData] = createStore<any>({
      agent: [
        {
          name: "build",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "gpt-5",
          },
        },
      ],
      provider: [
        {
          id: "openai",
          name: "OpenAI",
          models: {
            "gpt-5": { id: "gpt-5", name: "GPT-5" },
            "gpt-5.1": { id: "gpt-5.1", name: "GPT-5.1" },
          },
        },
        {
          id: "agency-swarm",
          name: "Agency Swarm",
          models: {
            default: { id: "default", name: "Swarm Default" },
          },
        },
      ],
      provider_default: {
        openai: "gpt-5",
      },
      session: [],
      config: {
        model: "agency-swarm/default",
        provider: {
          "agency-swarm": {
            options: {},
          },
        },
      },
      mcp: {},
    })

    spyOn(SyncContext, "useSync").mockReturnValue({ data: syncData } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(RouteContext, "useRoute").mockReturnValue({
      data: {
        type: "home",
      },
      navigate: () => {},
    } as any)
    spyOn(EventContext, "useEvent").mockReturnValue({
      on: () => () => {},
      subscribe: () => () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        mcp: {
          disconnect: async () => {},
          connect: async () => {},
        },
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        secondary: {},
        accent: {},
        success: {},
        warning: {},
        primary: {},
        error: {},
        info: {},
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)
    spyOn(Filesystem, "readJson").mockResolvedValue({
      recent: [
        {
          providerID: "openai",
          modelID: "gpt-5",
        },
        {
          providerID: "agency-swarm",
          modelID: "default",
        },
        {
          providerID: "openai",
          modelID: "gpt-5.1",
        },
      ],
      favorite: [],
      variant: {},
    })
    spyOn(Filesystem, "writeJson").mockResolvedValue(undefined)

    let local!: ReturnType<typeof useLocal>

    const Capture = () => {
      local = useLocal()
      return <box />
    }

    await testRender(() => (
      <LocalProvider>
        <Capture />
      </LocalProvider>
    ))

    await flushEffects()
    await local.product.set("build")
    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
    })

    local.model.cycle(1)
    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5.1",
    })
  })

  test("skips Run-only favorite models when cycling in reopened Build mode", async () => {
    const [syncData] = createStore<any>({
      agent: [
        {
          name: "build",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "gpt-5",
          },
        },
      ],
      provider: [
        {
          id: "openai",
          name: "OpenAI",
          models: {
            "gpt-5": { id: "gpt-5", name: "GPT-5" },
            "gpt-5.1": { id: "gpt-5.1", name: "GPT-5.1" },
          },
        },
        {
          id: "agency-swarm",
          name: "Agency Swarm",
          models: {
            default: { id: "default", name: "Swarm Default" },
          },
        },
      ],
      provider_default: {
        openai: "gpt-5",
      },
      session: [],
      message: {
        ses_reopened_build: [
          {
            id: "msg_build",
            role: "user",
            agent: "build",
          },
        ],
      },
      part: {
        msg_build: [
          {
            id: "prt_build",
            type: "text",
            text: "continue build",
            metadata: {
              agencySwarmBridge: false,
            },
          },
        ],
      },
      config: {
        model: "agency-swarm/default",
        provider: {
          "agency-swarm": {
            options: {},
          },
        },
      },
      mcp: {},
    })

    spyOn(SyncContext, "useSync").mockReturnValue({ data: syncData } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(RouteContext, "useRoute").mockReturnValue({
      data: {
        type: "session",
        sessionID: "ses_reopened_build",
      },
      navigate: () => {},
    } as any)
    spyOn(EventContext, "useEvent").mockReturnValue({
      on: () => () => {},
      subscribe: () => () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        mcp: {
          disconnect: async () => {},
          connect: async () => {},
        },
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        secondary: {},
        accent: {},
        success: {},
        warning: {},
        primary: {},
        error: {},
        info: {},
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)
    spyOn(Filesystem, "readJson").mockResolvedValue({
      recent: [],
      favorite: [
        {
          providerID: "agency-swarm",
          modelID: "default",
        },
        {
          providerID: "openai",
          modelID: "gpt-5.1",
        },
      ],
      variant: {},
    })
    spyOn(Filesystem, "writeJson").mockResolvedValue(undefined)

    let local!: ReturnType<typeof useLocal>

    const Capture = () => {
      local = useLocal()
      return <box />
    }

    await testRender(() => (
      <LocalProvider>
        <Capture />
      </LocalProvider>
    ))

    await flushEffects()

    expect(local.product.current()).toBe("build")
    local.model.cycleFavorite(1)
    await flushEffects()

    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "gpt-5.1",
    })
  })

  test("uses reopened session agent model instead of current local agent model", async () => {
    const [syncData] = createStore<any>({
      agent: [
        {
          name: "build",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "build-model",
          },
        },
        {
          name: "plan",
          mode: "primary",
          hidden: false,
          model: {
            providerID: "openai",
            modelID: "plan-model",
          },
        },
      ],
      provider: [
        {
          id: "openai",
          name: "OpenAI",
          models: {
            "build-model": { id: "build-model", name: "Build Model" },
            "plan-model": { id: "plan-model", name: "Plan Model" },
          },
        },
        {
          id: "agency-swarm",
          name: "Agency Swarm",
          models: {
            default: { id: "default", name: "Swarm Default" },
          },
        },
      ],
      provider_default: {
        openai: "build-model",
      },
      session: [],
      message: {
        ses_reopened_plan: [
          {
            id: "msg_plan",
            role: "user",
            agent: "plan",
          },
        ],
      },
      part: {
        msg_plan: [
          {
            id: "prt_plan",
            type: "text",
            text: "continue plan",
            metadata: {
              agencySwarmBridge: false,
            },
          },
        ],
      },
      config: {
        model: "agency-swarm/default",
        provider: {
          "agency-swarm": {
            options: {},
          },
        },
      },
      mcp: {},
    })

    spyOn(SyncContext, "useSync").mockReturnValue({ data: syncData } as any)
    spyOn(ArgsContext, "useArgs").mockReturnValue({} as any)
    spyOn(RouteContext, "useRoute").mockReturnValue({
      data: {
        type: "session",
        sessionID: "ses_reopened_plan",
      },
      navigate: () => {},
    } as any)
    spyOn(EventContext, "useEvent").mockReturnValue({
      on: () => () => {},
      subscribe: () => () => {},
    } as any)
    spyOn(SDKContext, "useSDK").mockReturnValue({
      client: {
        mcp: {
          disconnect: async () => {},
          connect: async () => {},
        },
      },
    } as any)
    spyOn(ThemeContext, "useTheme").mockReturnValue({
      theme: {
        secondary: {},
        accent: {},
        success: {},
        warning: {},
        primary: {},
        error: {},
        info: {},
      },
    } as any)
    spyOn(ToastModule, "useToast").mockReturnValue({
      show: () => {},
      error: () => {},
      currentToast: null,
    } as any)
    spyOn(Filesystem, "readJson").mockResolvedValue({})
    spyOn(Filesystem, "writeJson").mockResolvedValue(undefined)

    let local!: ReturnType<typeof useLocal>

    const Capture = () => {
      local = useLocal()
      return <box />
    }

    await testRender(() => (
      <LocalProvider>
        <Capture />
      </LocalProvider>
    ))

    await flushEffects()

    expect(local.agent.current()?.name).toBe("build")
    expect(local.product.current()).toBe("plan")
    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "plan-model",
    })

    await local.product.set("build")
    await flushEffects()

    expect(local.product.current()).toBe("build")
    expect(local.model.current()).toEqual({
      providerID: "openai",
      modelID: "build-model",
    })

    await local.product.set("plan")
    await flushEffects()

    expect(local.agent.current()?.name).toBe("plan")
    await local.product.set("run")
    await flushEffects()

    expect(local.product.current()).toBe("run")
    expect(local.agent.current()?.name).toBe("build")
    expect(local.model.override("build")).toEqual({
      providerID: "agency-swarm",
      modelID: "default",
      explicit: true,
    })
    expect(local.model.override("plan")).toBeUndefined()
  })
})
