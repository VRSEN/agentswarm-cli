import { describe, expect, test } from "bun:test"
import { isAgencyAutocompleteActive } from "../../../src/cli/cmd/tui/component/prompt/autocomplete-state"

describe("agency autocomplete activation", () => {
  test("stays inactive during startup when no mention menu is open", () => {
    expect(
      isAgencyAutocompleteActive({
        agencySwarmEnabled: true,
        visible: false,
      }),
    ).toBe(false)
  })

  test("activates only for agency @-mention autocomplete", () => {
    expect(
      isAgencyAutocompleteActive({
        agencySwarmEnabled: true,
        visible: "@",
      }),
    ).toBe(true)

    expect(
      isAgencyAutocompleteActive({
        agencySwarmEnabled: true,
        visible: "/",
      }),
    ).toBe(false)
  })
})
