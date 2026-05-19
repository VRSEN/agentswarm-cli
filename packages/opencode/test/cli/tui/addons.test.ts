import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { requestProductAddonsSetup } from "../../../src/cli/cmd/tui/util/addons"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import { tmpdir } from "../../fixture/fixture"

test("requestProductAddonsSetup touches the downstream setup flag", async () => {
  await using tmp = await tmpdir()
  const flag = path.join(tmp.path, "setup", "addons.flag")
  const profile = AgencyProduct.resolve({
    AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV: "EXAMPLE_ADDONS_FLAG",
  })

  await requestProductAddonsSetup({ EXAMPLE_ADDONS_FLAG: flag }, profile)

  const stat = await fs.stat(flag)
  expect(stat.isFile()).toBe(true)
})

test("requestProductAddonsSetup rejects products without a runtime flag path", async () => {
  const profile = AgencyProduct.resolve({
    AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV: "EXAMPLE_ADDONS_FLAG",
  })

  await expect(requestProductAddonsSetup({}, profile)).rejects.toThrow("Add-ons setup is not configured")
})
