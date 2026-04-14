import { expect, test } from "bun:test"
import { displayAgentName } from "../../src/agent/display"

test("displayAgentName brands build as Agent Builder", () => {
  expect(displayAgentName("build")).toBe("Agent Builder")
})

test("displayAgentName titlecases other agent names", () => {
  expect(displayAgentName("plan")).toBe("Plan")
  expect(displayAgentName("general")).toBe("General")
})
