import { expect, test } from "bun:test"
import { agentPlannerInstructions } from "../../src/session/agent-planner"

test("agentPlannerInstructions applies only to local plan turns with native plan artifacts", () => {
  const local = agentPlannerInstructions("plan", "openai")
  expect(local).toHaveLength(1)
  expect(local[0]).toContain("Agent Swarm Planner Instructions")
  expect(local[0]).toContain("Stay on the native session plan file.")
  expect(local[0]).not.toContain("prd.txt")

  expect(agentPlannerInstructions("build", "openai")).toEqual([])
  expect(agentPlannerInstructions("plan", "agency-swarm")).toEqual([])
  expect(agentPlannerInstructions("plan", "openai", false)).toEqual([])
})
