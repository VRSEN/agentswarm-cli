import { describe, expect, test } from "bun:test"
import { AgencyProduct } from "../../src/agency-swarm/product"

describe("AgencyProduct.tips", () => {
  test("removes Run-mode-invalid upstream tips", () => {
    const tips = AgencyProduct.tips([
      "Add {highlight}.md{/highlight} files to {highlight}.agentswarm/agent/{/highlight} for specialized AI personas",
      "Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents",
      "Use {highlight}/review{/highlight} to review uncommitted changes, branches, or PRs",
      "Use {highlight}/compact{/highlight} for long sessions near context limits",
    ])

    expect(tips).not.toContain(
      "Add {highlight}.md{/highlight} files to {highlight}.agentswarm/agent/{/highlight} for specialized AI personas",
    )
    expect(tips).not.toContain("Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents")
    expect(tips).not.toContain("Use {highlight}/review{/highlight} to review uncommitted changes, branches, or PRs")
    expect(tips).toContain("Use {highlight}/compact{/highlight} for long agency-swarm sessions near context limits")
    expect(tips).toContain("Use {highlight}/agents{/highlight} to pick the active swarm or agent from live metadata")
    expect(tips.join("\n")).not.toContain("recipient")
  })
})
