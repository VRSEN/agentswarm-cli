import { expect, test } from "bun:test"
import { agentBuilderInstructions } from "../../src/session/agent-builder"

test("agentBuilderInstructions applies only to local build turns", () => {
  const local = agentBuilderInstructions("build", "openai")
  expect(local).toHaveLength(1)
  expect(local[0]).toContain("Agent Swarm Build Instructions")
  expect(local[0]).toContain("https://github.com/agency-ai-solutions/agency-starter-template")
  expect(local[0]).toContain(
    "If the latest system reminder or handoff mentions an approved session plan file, read it before you change code",
  )
  expect(local[0]).not.toContain("prd.txt")

  expect(agentBuilderInstructions("plan", "openai")).toEqual([])
  expect(agentBuilderInstructions("build", "agency-swarm")).toEqual([])
})

test("agentBuilderInstructions never tells Build to copy .env secret values into a new agency", () => {
  const [prompt] = agentBuilderInstructions("build", "openai")

  expect(prompt).toContain("Never copy an existing `.env` file's values into the new agency folder")
  expect(prompt).toContain("Secret values must never move from the parent directory's `.env` into the new agency")
  expect(prompt).toContain(
    "create a template `.env` in the new agency folder that contains only those key names plus the required key names from `.env.example`, all with empty values",
  )

  // Regression guard: the prior wording permitted copying real values after
  // user confirmation. That instruction must never come back.
  expect(prompt).not.toContain("copy it only after the user confirms")
  expect(prompt).not.toContain("If the user declines the copy")
})
