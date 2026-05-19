declare const AGENTSWARM_PRODUCT_DISPLAY_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_COMMAND: string | undefined
declare const AGENTSWARM_PRODUCT_PACKAGE_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_RELEASE_REPO: string | undefined
declare const AGENTSWARM_PRODUCT_DOCS_URL: string | undefined
declare const AGENTSWARM_PRODUCT_ISSUE_URL: string | undefined
declare const AGENTSWARM_PRODUCT_MDNS_DOMAIN: string | undefined
declare const AGENTSWARM_PRODUCT_STARTER_REPO: string | undefined
declare const AGENTSWARM_PRODUCT_STARTER_FOLDER: string | undefined
declare const AGENTSWARM_PRODUCT_ENTRY_FILES: string | undefined
declare const AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION: string | undefined
declare const AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV: string | undefined
declare const AGENTSWARM_PRODUCT_TUI_LOGO_LEFT: string | undefined
declare const AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT: string | undefined
declare const AGENTSWARM_PRODUCT_WORDMARK_LINES: string | undefined

export namespace AgencyProduct {
  export interface Profile {
    custom: boolean
    customBranding: boolean
    customStarter: boolean
    lockModelSelection: boolean
    name: string
    cmd: string
    packageName: string
    launcherPackageName: string
    mdnsDomain: string
    releaseRepo: string
    docs: string
    issue: string
    starterTemplateRepo: string
    starterProjectName: string
    agencyEntryFiles: string[]
    addonsSetupFlagEnv?: string
    tuiLogoLeft?: string[]
    tuiLogoRight?: string[]
    wordmarkLines?: string[]
  }

  const defaults: Profile = {
    custom: false,
    customBranding: false,
    customStarter: false,
    lockModelSelection: false,
    name: "Agent Swarm",
    cmd: "agentswarm",
    packageName: "agentswarm-cli",
    launcherPackageName: "@vrsen/agentswarm",
    mdnsDomain: "agentswarm.local",
    releaseRepo: "VRSEN/agentswarm-cli",
    docs: "https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli",
    issue: "https://github.com/VRSEN/agentswarm-cli/issues/new?template=bug-report.yml",
    starterTemplateRepo: "agency-ai-solutions/agency-starter-template",
    starterProjectName: "my-agency",
    agencyEntryFiles: ["agency.py"],
  }

  const defineValues = {
    AGENTSWARM_PRODUCT_DISPLAY_NAME:
      typeof AGENTSWARM_PRODUCT_DISPLAY_NAME === "undefined" ? undefined : AGENTSWARM_PRODUCT_DISPLAY_NAME,
    AGENTSWARM_PRODUCT_COMMAND:
      typeof AGENTSWARM_PRODUCT_COMMAND === "undefined" ? undefined : AGENTSWARM_PRODUCT_COMMAND,
    AGENTSWARM_PRODUCT_PACKAGE_NAME:
      typeof AGENTSWARM_PRODUCT_PACKAGE_NAME === "undefined" ? undefined : AGENTSWARM_PRODUCT_PACKAGE_NAME,
    AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME:
      typeof AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME === "undefined"
        ? undefined
        : AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME,
    AGENTSWARM_PRODUCT_RELEASE_REPO:
      typeof AGENTSWARM_PRODUCT_RELEASE_REPO === "undefined" ? undefined : AGENTSWARM_PRODUCT_RELEASE_REPO,
    AGENTSWARM_PRODUCT_DOCS_URL:
      typeof AGENTSWARM_PRODUCT_DOCS_URL === "undefined" ? undefined : AGENTSWARM_PRODUCT_DOCS_URL,
    AGENTSWARM_PRODUCT_ISSUE_URL:
      typeof AGENTSWARM_PRODUCT_ISSUE_URL === "undefined" ? undefined : AGENTSWARM_PRODUCT_ISSUE_URL,
    AGENTSWARM_PRODUCT_MDNS_DOMAIN:
      typeof AGENTSWARM_PRODUCT_MDNS_DOMAIN === "undefined" ? undefined : AGENTSWARM_PRODUCT_MDNS_DOMAIN,
    AGENTSWARM_PRODUCT_STARTER_REPO:
      typeof AGENTSWARM_PRODUCT_STARTER_REPO === "undefined" ? undefined : AGENTSWARM_PRODUCT_STARTER_REPO,
    AGENTSWARM_PRODUCT_STARTER_FOLDER:
      typeof AGENTSWARM_PRODUCT_STARTER_FOLDER === "undefined" ? undefined : AGENTSWARM_PRODUCT_STARTER_FOLDER,
    AGENTSWARM_PRODUCT_ENTRY_FILES:
      typeof AGENTSWARM_PRODUCT_ENTRY_FILES === "undefined" ? undefined : AGENTSWARM_PRODUCT_ENTRY_FILES,
    AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION:
      typeof AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION === "undefined"
        ? undefined
        : AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION,
    AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV:
      typeof AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV === "undefined"
        ? undefined
        : AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV,
    AGENTSWARM_PRODUCT_TUI_LOGO_LEFT:
      typeof AGENTSWARM_PRODUCT_TUI_LOGO_LEFT === "undefined" ? undefined : AGENTSWARM_PRODUCT_TUI_LOGO_LEFT,
    AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT:
      typeof AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT === "undefined" ? undefined : AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT,
    AGENTSWARM_PRODUCT_WORDMARK_LINES:
      typeof AGENTSWARM_PRODUCT_WORDMARK_LINES === "undefined" ? undefined : AGENTSWARM_PRODUCT_WORDMARK_LINES,
  } satisfies Record<string, string | undefined>

  function clean(value: string | undefined) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  }

  function readValue(env: Record<string, string | undefined>, name: keyof typeof defineValues) {
    return clean(env[name]) ?? clean(defineValues[name])
  }

  function readRawValue(env: Record<string, string | undefined>, name: keyof typeof defineValues) {
    return env[name] ?? defineValues[name]
  }

  function readEntryFiles(value: string | undefined) {
    const files = value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    return files && files.length > 0 ? files : undefined
  }

  function readLines(value: string | undefined) {
    if (value === undefined || value.trim() === "") return undefined
    const trimmed = value.trim()
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string") && parsed.length > 0) {
          return parsed
        }
      } catch {
        // Fall through to newline parsing for non-JSON line blocks.
      }
    }
    const lines = value.replaceAll("\\n", "\n").split(/\r?\n/)
    return lines.length > 0 ? lines : undefined
  }

  function readBoolean(value: string | undefined) {
    const normalized = clean(value)?.toLowerCase()
    if (!normalized) return undefined
    if (["1", "true", "yes", "on"].includes(normalized)) return true
    if (["0", "false", "no", "off"].includes(normalized)) return false
    return undefined
  }

  export function resolve(env: Record<string, string | undefined> = process.env): Profile {
    const overrides = {
      name: readValue(env, "AGENTSWARM_PRODUCT_DISPLAY_NAME"),
      cmd: readValue(env, "AGENTSWARM_PRODUCT_COMMAND"),
      packageName: readValue(env, "AGENTSWARM_PRODUCT_PACKAGE_NAME"),
      launcherPackageName: readValue(env, "AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME"),
      releaseRepo: readValue(env, "AGENTSWARM_PRODUCT_RELEASE_REPO"),
      docs: readValue(env, "AGENTSWARM_PRODUCT_DOCS_URL"),
      issue: readValue(env, "AGENTSWARM_PRODUCT_ISSUE_URL"),
      mdnsDomain: readValue(env, "AGENTSWARM_PRODUCT_MDNS_DOMAIN"),
      starterTemplateRepo: readValue(env, "AGENTSWARM_PRODUCT_STARTER_REPO"),
      starterProjectName: readValue(env, "AGENTSWARM_PRODUCT_STARTER_FOLDER"),
      agencyEntryFiles: readEntryFiles(readValue(env, "AGENTSWARM_PRODUCT_ENTRY_FILES")),
      lockModelSelection: readBoolean(readValue(env, "AGENTSWARM_PRODUCT_LOCK_MODEL_SELECTION")),
      addonsSetupFlagEnv: readValue(env, "AGENTSWARM_PRODUCT_ADDONS_SETUP_FLAG_ENV"),
      tuiLogoLeft: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_TUI_LOGO_LEFT")),
      tuiLogoRight: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT")),
      wordmarkLines: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_WORDMARK_LINES")),
    }
    const custom = Object.values(overrides).some((value) => value !== undefined)
    const customBranding =
      overrides.name !== undefined ||
      overrides.tuiLogoLeft !== undefined ||
      overrides.tuiLogoRight !== undefined ||
      overrides.wordmarkLines !== undefined
    const customStarter = overrides.starterTemplateRepo !== undefined || overrides.starterProjectName !== undefined

    return {
      custom,
      customBranding,
      customStarter,
      lockModelSelection: overrides.lockModelSelection ?? defaults.lockModelSelection,
      name: overrides.name ?? defaults.name,
      cmd: overrides.cmd ?? defaults.cmd,
      packageName: overrides.packageName ?? defaults.packageName,
      launcherPackageName: overrides.launcherPackageName ?? defaults.launcherPackageName,
      releaseRepo: overrides.releaseRepo ?? defaults.releaseRepo,
      docs: overrides.docs ?? defaults.docs,
      issue: overrides.issue ?? defaults.issue,
      mdnsDomain: overrides.mdnsDomain ?? defaults.mdnsDomain,
      starterTemplateRepo: overrides.starterTemplateRepo ?? defaults.starterTemplateRepo,
      starterProjectName: overrides.starterProjectName ?? defaults.starterProjectName,
      agencyEntryFiles: overrides.agencyEntryFiles ?? defaults.agencyEntryFiles,
      addonsSetupFlagEnv: overrides.addonsSetupFlagEnv,
      tuiLogoLeft: overrides.tuiLogoLeft,
      tuiLogoRight: overrides.tuiLogoRight,
      wordmarkLines: overrides.wordmarkLines,
    }
  }

  const current = resolve()

  export const custom = current.custom
  export const customBranding = current.customBranding
  export const customStarter = current.customStarter
  export const lockModelSelection = current.lockModelSelection
  export const name = current.name
  export const packageName = current.packageName
  export const launcherPackageName = current.launcherPackageName
  export const cmd = current.cmd
  export const mdnsDomain = current.mdnsDomain
  export const releaseRepo = current.releaseRepo
  export const docs = current.docs
  export const issue = current.issue
  export const starterTemplateRepo = current.starterTemplateRepo
  export const starterProjectName = current.starterProjectName
  export const agencyEntryFiles = current.agencyEntryFiles
  export const addonsSetupFlagEnv = current.addonsSetupFlagEnv
  export const tuiLogoLeft = current.tuiLogoLeft
  export const tuiLogoRight = current.tuiLogoRight
  export const wordmarkLines = current.wordmarkLines
  export const connect = "Authenticate providers"
  export const start = [
    "Authenticate providers and connect to a local agency-swarm server before sending prompts.",
    "Use /auth for provider credentials, then /connect to choose the server and store a token.",
  ]

  export function shouldShowModelSelection(profile: Pick<Profile, "lockModelSelection"> = current) {
    return !profile.lockModelSelection
  }

  export function hasAddonsSetup(profile: Pick<Profile, "addonsSetupFlagEnv"> = current) {
    return profile.addonsSetupFlagEnv !== undefined
  }

  export function addonsSetupFlagPath(
    env: Record<string, string | undefined> = process.env,
    profile: Pick<Profile, "addonsSetupFlagEnv"> = current,
  ) {
    if (!profile.addonsSetupFlagEnv) return undefined
    return clean(env[profile.addonsSetupFlagEnv])
  }

  export function tuiLogo(profile: Pick<Profile, "tuiLogoLeft" | "tuiLogoRight"> = current) {
    if (!profile.tuiLogoLeft && !profile.tuiLogoRight) return undefined
    return {
      left: profile.tuiLogoLeft ?? [],
      right: profile.tuiLogoRight ?? [],
    }
  }

  const skip = [
    "Run {highlight}/share{/highlight}",
    "Press {highlight}Ctrl+X E{/highlight} or {highlight}/editor{/highlight}",
    "Run {highlight}/init{/highlight}",
    "Use {highlight}/review{/highlight}",
    "Run {highlight}/models{/highlight}",
    "Add {highlight}.md{/highlight} files to {highlight}.agentswarm/agent/{/highlight}",
    "Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents",
    "Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers",
    "Press {highlight}F2{/highlight}",
    "Configure {highlight}model{/highlight}",
    "OpenCode auto-handles OAuth",
    "Run {highlight}opencode serve{/highlight}",
    "Use {highlight}/opencode{/highlight}",
    "Run {highlight}opencode github install{/highlight}",
    "Comment {highlight}/opencode fix this{/highlight}",
    "Comment {highlight}/oc{/highlight}",
    "Run {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight}",
    "Use {highlight}/connect{/highlight} with OpenCode Zen",
  ]

  const add = [
    "Use {highlight}/auth{/highlight} to sign in to OpenAI or add API keys for supported providers",
    "Use {highlight}/connect{/highlight} to choose the local agency-swarm server you want to use",
    "Use {highlight}/agents{/highlight} to pick the active swarm or agent from live metadata",
    "Set {highlight}provider.agency-swarm.options.baseURL{/highlight} in config to pin a default local server",
    "Use {highlight}/connect{/highlight} to configure local server ports and your Agency token",
  ]

  const swap = [
    ["OpenCode", name],
    ["Open Code", name],
    ["{highlight}opencode run{/highlight}", `{highlight}${cmd} run{/highlight}`],
    ["{highlight}opencode --continue{/highlight}", `{highlight}${cmd} --continue{/highlight}`],
    ["{highlight}opencode run -f file.ts{/highlight}", `{highlight}${cmd} run -f file.ts{/highlight}`],
    ["{highlight}opencode run --attach{/highlight}", `{highlight}${cmd} run --attach{/highlight}`],
    ["{highlight}opencode upgrade{/highlight}", `{highlight}${cmd} upgrade{/highlight}`],
    ["{highlight}opencode agent create{/highlight}", `{highlight}${cmd} agent create{/highlight}`],
    ["{highlight}opencode debug config{/highlight}", `{highlight}${cmd} debug config{/highlight}`],
  ] as const

  export function tips(input: string[]) {
    const seen = new Set<string>()
    const list = input
      .filter((item) => !skip.some((text) => item.includes(text)))
      .map((item) => {
        let next = item
        for (const [from, to] of swap) next = next.replaceAll(from, to)
        if (next.includes("{highlight}/compact{/highlight}")) {
          next = next.replace("long sessions near context limits", "long agency-swarm sessions near context limits")
        }
        if (next.includes("{highlight}opencode auth list{/highlight}")) {
          next = `Run {highlight}${cmd} auth list{/highlight} to see configured provider credentials`
        }
        return next
      })
      .concat(add)
      .filter((item) => {
        if (seen.has(item)) return false
        seen.add(item)
        return true
      })
    return list
  }
}
