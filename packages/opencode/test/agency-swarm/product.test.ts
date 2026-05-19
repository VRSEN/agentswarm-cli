import { describe, expect, test } from "bun:test"
import { AgencyProduct } from "../../src/agency-swarm/product"

describe("AgencyProduct profile", () => {
  test("keeps Agent Swarm defaults when no downstream values are set", () => {
    const profile = AgencyProduct.resolve({})

    expect(profile.custom).toBe(false)
    expect(profile.customBranding).toBe(false)
    expect(profile.lockModelSelection).toBe(false)
    expect(AgencyProduct.shouldShowModelSelection(profile)).toBe(true)
    expect(profile.name).toBe("Agent Swarm")
    expect(profile.cmd).toBe("agentswarm")
    expect(profile.packageName).toBe("agentswarm-cli")
    expect(profile.launcherPackageName).toBe("@vrsen/agentswarm")
    expect(profile.mdnsDomain).toBe("agentswarm.local")
    expect(profile.releaseRepo).toBe("VRSEN/agentswarm-cli")
    expect(profile.docs).toBe("https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli")
    expect(profile.issue).toBe("https://github.com/VRSEN/agentswarm-cli/issues/new?template=bug-report.yml")
    expect(profile.starterTemplateRepo).toBe("agency-ai-solutions/agency-starter-template")
    expect(profile.starterProjectName).toBe("my-agency")
    expect(profile.agencyEntryFiles).toEqual(["agency.py"])
    expect(profile.addonsSetupFlagEnv).toBeUndefined()
    expect(profile.tuiLogoLeft).toBeUndefined()
    expect(profile.tuiLogoRight).toBeUndefined()
    expect(profile.wordmarkLines).toBeUndefined()
    expect(AgencyProduct.hasAddonsSetup(profile)).toBe(false)
    expect(AgencyProduct.tuiLogo(profile)).toBeUndefined()
  })

  test("selects a generic downstream profile from product env", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_DISPLAY_NAME: "Example Product",
      AGENTSWARM_PRODUCT_COMMAND: "example",
      AGENTSWARM_PRODUCT_PACKAGE_NAME: "example-cli",
      AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME: "@example/product",
      AGENTSWARM_PRODUCT_RELEASE_REPO: "example/product-cli",
      AGENTSWARM_PRODUCT_DOCS_URL: "https://example.com/docs",
      AGENTSWARM_PRODUCT_ISSUE_URL: "https://example.com/issues/new",
      AGENTSWARM_PRODUCT_MDNS_DOMAIN: "example.local",
      AGENTSWARM_PRODUCT_STARTER_REPO: "example/starter",
      AGENTSWARM_PRODUCT_STARTER_FOLDER: "example-project",
      AGENTSWARM_PRODUCT_ENTRY_FILES: "main.py, agency.py",
      AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION: "true",
      AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV: "EXAMPLE_ADDONS_FLAG",
      AGENTSWARM_PRODUCT_TUI_LOGO_LEFT: JSON.stringify([" LEFT", "LEFT2"]),
      AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT: "RIGHT\\nRIGHT2",
      AGENTSWARM_PRODUCT_WORDMARK_LINES: "WORD\\n MARK",
    })

    expect(profile.custom).toBe(true)
    expect(profile.customBranding).toBe(true)
    expect(profile.customStarter).toBe(true)
    expect(profile.lockModelSelection).toBe(true)
    expect(AgencyProduct.shouldShowModelSelection(profile)).toBe(false)
    expect(profile.name).toBe("Example Product")
    expect(profile.cmd).toBe("example")
    expect(profile.packageName).toBe("example-cli")
    expect(profile.launcherPackageName).toBe("@example/product")
    expect(profile.mdnsDomain).toBe("example.local")
    expect(profile.releaseRepo).toBe("example/product-cli")
    expect(profile.docs).toBe("https://example.com/docs")
    expect(profile.issue).toBe("https://example.com/issues/new")
    expect(profile.starterTemplateRepo).toBe("example/starter")
    expect(profile.starterProjectName).toBe("example-project")
    expect(profile.agencyEntryFiles).toEqual(["main.py", "agency.py"])
    expect(profile.addonsSetupFlagEnv).toBe("EXAMPLE_ADDONS_FLAG")
    expect(profile.tuiLogoLeft).toEqual([" LEFT", "LEFT2"])
    expect(profile.tuiLogoRight).toEqual(["RIGHT", "RIGHT2"])
    expect(profile.wordmarkLines).toEqual(["WORD", " MARK"])
    expect(AgencyProduct.hasAddonsSetup(profile)).toBe(true)
    expect(AgencyProduct.addonsSetupFlagPath({ EXAMPLE_ADDONS_FLAG: "/tmp/example.flag" }, profile)).toBe(
      "/tmp/example.flag",
    )
    expect(AgencyProduct.tuiLogo(profile)).toEqual({
      left: [" LEFT", "LEFT2"],
      right: ["RIGHT", "RIGHT2"],
    })
  })

  test("ignores missing downstream add-ons flag paths", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV: "EXAMPLE_ADDONS_FLAG",
    })

    expect(AgencyProduct.hasAddonsSetup(profile)).toBe(true)
    expect(AgencyProduct.addonsSetupFlagPath({}, profile)).toBeUndefined()
  })

  test("custom entry files alone do not force starter creation", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_ENTRY_FILES: "main.py",
    })

    expect(profile.custom).toBe(true)
    expect(profile.customBranding).toBe(false)
    expect(profile.customStarter).toBe(false)
    expect(profile.name).toBe("Agent Swarm")
    expect(profile.cmd).toBe("agentswarm")
    expect(profile.packageName).toBe("agentswarm-cli")
    expect(profile.launcherPackageName).toBe("@vrsen/agentswarm")
    expect(profile.agencyEntryFiles).toEqual(["main.py"])
  })

  test("custom command alone does not force text branding", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_COMMAND: "example",
    })

    expect(profile.custom).toBe(true)
    expect(profile.customBranding).toBe(false)
    expect(profile.name).toBe("Agent Swarm")
    expect(profile.cmd).toBe("example")
  })

  test("ignores invalid model-selection lock values", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION: "maybe",
    })

    expect(profile.custom).toBe(false)
    expect(profile.lockModelSelection).toBe(false)
    expect(AgencyProduct.shouldShowModelSelection(profile)).toBe(true)
  })

  test("disables model switching commands when model selection is locked", () => {
    expect(AgencyProduct.modelSwitchCommandState({ lockModelSelection: false })).toEqual({
      enabled: true,
      hidden: false,
    })
    expect(AgencyProduct.modelSwitchCommandState({ lockModelSelection: true })).toEqual({
      enabled: false,
      hidden: true,
    })
  })
})

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
