import { expect, test } from "bun:test"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import { textLogo } from "../../../src/cli/cmd/tui/component/logo"

test("keeps the glyph logo for the default Agent Swarm profile", () => {
  expect(textLogo(AgencyProduct.resolve({}))).toBeUndefined()
})

test("uses text branding for downstream product profiles", () => {
  const profile = AgencyProduct.resolve({
    AGENTSWARM_PRODUCT_DISPLAY_NAME: "Example Product",
  })

  expect(textLogo(profile)).toBe("Example Product")
})

test("keeps the glyph logo when only the downstream command is customized", () => {
  const profile = AgencyProduct.resolve({
    AGENTSWARM_PRODUCT_COMMAND: "example",
  })

  expect(textLogo(profile)).toBeUndefined()
})
