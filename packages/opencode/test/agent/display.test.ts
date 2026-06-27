import { expect, test } from "bun:test"
import { displayAgentName } from "../../src/agent/display"

test("displayAgentName titlecases other agent names", () => {
  expect(displayAgentName("build")).toBe("Build")
  expect(displayAgentName("plan")).toBe("Plan")
  expect(displayAgentName("general")).toBe("General")
})
