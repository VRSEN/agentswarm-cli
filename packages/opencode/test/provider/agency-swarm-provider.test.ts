import { expect, test } from "bun:test"
import { Provider } from "../../src/provider/provider"
import { Instance } from "../../src/project/instance"
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
      expect(providers["agency-swarm"]).toBeDefined()
      expect(providers["agency-swarm"].models.default).toBeDefined()
      expect(providers["agency-swarm"].models.default.id).toBe("default")
    },
  })
})
