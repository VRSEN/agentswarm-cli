import { expect, test } from "bun:test"
import { Provider } from "../../src/provider/provider"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { tmpdir } from "../fixture/fixture"

test("Agency Swarm provider boots with the default model", async () => {
  await using tmp = await tmpdir({
    config: {
      enabled_providers: ["agency-swarm"],
      provider: {
        "agency-swarm": {},
      },
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const providers = await Provider.list()
      const provider = providers[ProviderID.make("agency-swarm")]
      expect(provider).toBeDefined()
      const model = provider?.models[ModelID.make("default")]
      expect(model).toBeDefined()
      expect(String(model?.id)).toBe("default")
    },
  })
})
