import { expect, test } from "bun:test"
import { agentBuilderInstructions } from "../../src/session/agent-builder"

test("agentBuilderInstructions applies only to local build turns", () => {
  const local = agentBuilderInstructions("build", "openai")
  expect(local).toHaveLength(1)
  expect(local[0]).toContain("Agent Swarm Agent Creator Instructions")
  expect(local[0]).toContain("https://github.com/agency-ai-solutions/agency-starter-template")

  expect(agentBuilderInstructions("plan", "openai")).toEqual([])
  expect(agentBuilderInstructions("build", "agency-swarm")).toEqual([])
})
