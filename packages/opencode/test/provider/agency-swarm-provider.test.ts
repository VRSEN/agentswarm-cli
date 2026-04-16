import { expect, test } from "bun:test"
import path from "node:path"
import { AgencySwarmAdapter } from "../../src/agency-swarm/adapter"
import { Provider } from "../../src/provider/provider"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { tmpdir } from "../fixture/fixture"

test("Agency Swarm launch config keeps the default model addressable", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "agentswarm.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          model: "agency-swarm/default",
          enabled_providers: ["agency-swarm"],
          provider: {
            "agency-swarm": {
              options: {
                baseURL: "http://127.0.0.1:8000",
              },
            },
          },
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const selected = await Provider.defaultModel()
      expect(String(selected.providerID)).toBe("agency-swarm")
      expect(String(selected.modelID)).toBe("default")

      const model = await Provider.getModel(selected.providerID, selected.modelID)
      expect(String(model.providerID)).toBe("agency-swarm")
      expect(String(model.id)).toBe("default")
    },
  })
})

test("Agency Swarm selected model bootstraps provider runtime state without explicit provider config", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "agentswarm.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          model: "agency-swarm/default",
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const selected = await Provider.defaultModel()
      expect(String(selected.providerID)).toBe("agency-swarm")
      expect(String(selected.modelID)).toBe("default")

      const model = await Provider.getModel(selected.providerID, selected.modelID)
      const provider = await Provider.getProvider(selected.providerID)
      const language = await Provider.getLanguage(model)

      expect(model).toBeDefined()
      expect(String(model.providerID)).toBe("agency-swarm")
      expect(String(model.id)).toBe("default")
      expect(provider).toBeDefined()
      expect(provider?.options.baseURL).toBe(AgencySwarmAdapter.DEFAULT_BASE_URL)
      expect(language).toBeDefined()
    },
  })
})

test("Agency Swarm default model fails cleanly when provider filters exclude it", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "agentswarm.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          model: "agency-swarm/default",
          disabled_providers: ["agency-swarm"],
        }),
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const selected = await Provider.defaultModel()

      expect(String(selected.providerID)).toBe("agency-swarm")
      expect(String(selected.modelID)).toBe("default")

      try {
        await Provider.getModel(selected.providerID, selected.modelID)
        expect.unreachable("expected Provider.getModel() to reject when agency-swarm is filtered out")
      } catch (error: any) {
        expect(error?.name).toBe("ProviderModelNotFoundError")
        expect(error?.data?.providerID).toBe("agency-swarm")
        expect(error?.data?.modelID).toBe("default")
      }
    },
  })
})
