import { expect, test } from "bun:test"
import path from "node:path"
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

test("Agency Swarm default model resolves when it is the active model without provider metadata", async () => {
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
      const model = await Provider.getModel(ProviderID.make("agency-swarm"), ModelID.make("default"))

      expect(model).toBeDefined()
      expect(String(model.providerID)).toBe("agency-swarm")
      expect(String(model.id)).toBe("default")
    },
  })
})
