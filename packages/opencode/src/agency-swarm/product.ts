import path from "node:path"

declare const AGENTSWARM_PRODUCT_DISPLAY_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_COMMAND: string | undefined
declare const AGENTSWARM_PRODUCT_PACKAGE_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME: string | undefined
declare const AGENTSWARM_PRODUCT_VERSION: string | undefined
declare const AGENTSWARM_PRODUCT_RELEASE_REPO: string | undefined
declare const AGENTSWARM_PRODUCT_DOCS_URL: string | undefined
declare const AGENTSWARM_PRODUCT_ISSUE_URL: string | undefined
declare const AGENTSWARM_PRODUCT_MDNS_DOMAIN: string | undefined
declare const AGENTSWARM_PRODUCT_STARTER_REPO: string | undefined
declare const AGENTSWARM_PRODUCT_STARTER_FOLDER: string | undefined
declare const AGENTSWARM_PRODUCT_ENTRY_FILES: string | undefined
declare const AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION: string | undefined
declare const AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION: string | undefined
declare const AGENTSWARM_PRODUCT_TUI_LOGO_LEFT: string | undefined
declare const AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT: string | undefined
declare const AGENTSWARM_PRODUCT_WORDMARK_LINES: string | undefined
declare const AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT: string | undefined
declare const AGENTSWARM_PRODUCT_ADDONS: string | undefined
declare const AGENTSWARM_PRODUCT_STATE_ROOT: string | undefined
declare const AGENTSWARM_MARKETPLACE_SWARM_ID: string | undefined
declare const AGENTSWARM_MARKETPLACE_PARENT_SWARM_ID: string | undefined
declare const AGENTSWARM_MARKETPLACE_SWARM_ORIGIN: string | undefined

export namespace AgencyProduct {
  export type PythonEnvironment = "any" | "standalone"
  export type MarketplaceSwarmOrigin = "original" | "fork" | "unknown"

  export interface Addon {
    id: string
    title: string
    keys: string[]
    excludeProviders?: string[]
  }

  export interface Profile {
    custom: boolean
    customBranding: boolean
    customStarter: boolean
    skipPostAuthModelSelection: boolean
    hideModelSelection: boolean
    addons: Addon[]
    name: string
    cmd: string
    packageName: string
    launcherPackageName: string
    productVersion?: string
    mdnsDomain: string
    releaseRepo: string
    docs: string
    issue: string
    starterTemplateRepo: string
    starterProjectName: string
    agencyEntryFiles: string[]
    tuiLogoLeft?: string[]
    tuiLogoRight?: string[]
    wordmarkLines?: string[]
    pythonEnvironment: PythonEnvironment
    stateRoot?: string
    marketplaceSwarmID?: string
    marketplaceParentSwarmID?: string
    marketplaceSwarmOrigin?: MarketplaceSwarmOrigin
  }

  const defaults: Profile = {
    custom: false,
    customBranding: false,
    customStarter: false,
    skipPostAuthModelSelection: false,
    hideModelSelection: false,
    addons: [],
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
    pythonEnvironment: "any",
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
    AGENTSWARM_PRODUCT_VERSION:
      typeof AGENTSWARM_PRODUCT_VERSION === "undefined" ? undefined : AGENTSWARM_PRODUCT_VERSION,
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
    AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION:
      typeof AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION === "undefined"
        ? undefined
        : AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION,
    AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION:
      typeof AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION === "undefined"
        ? undefined
        : AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION,
    AGENTSWARM_PRODUCT_TUI_LOGO_LEFT:
      typeof AGENTSWARM_PRODUCT_TUI_LOGO_LEFT === "undefined" ? undefined : AGENTSWARM_PRODUCT_TUI_LOGO_LEFT,
    AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT:
      typeof AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT === "undefined" ? undefined : AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT,
    AGENTSWARM_PRODUCT_WORDMARK_LINES:
      typeof AGENTSWARM_PRODUCT_WORDMARK_LINES === "undefined" ? undefined : AGENTSWARM_PRODUCT_WORDMARK_LINES,
    AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT:
      typeof AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT === "undefined" ? undefined : AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT,
    AGENTSWARM_PRODUCT_ADDONS: typeof AGENTSWARM_PRODUCT_ADDONS === "undefined" ? undefined : AGENTSWARM_PRODUCT_ADDONS,
    AGENTSWARM_PRODUCT_STATE_ROOT:
      typeof AGENTSWARM_PRODUCT_STATE_ROOT === "undefined" ? undefined : AGENTSWARM_PRODUCT_STATE_ROOT,
    AGENTSWARM_MARKETPLACE_SWARM_ID:
      typeof AGENTSWARM_MARKETPLACE_SWARM_ID === "undefined" ? undefined : AGENTSWARM_MARKETPLACE_SWARM_ID,
    AGENTSWARM_MARKETPLACE_PARENT_SWARM_ID:
      typeof AGENTSWARM_MARKETPLACE_PARENT_SWARM_ID === "undefined"
        ? undefined
        : AGENTSWARM_MARKETPLACE_PARENT_SWARM_ID,
    AGENTSWARM_MARKETPLACE_SWARM_ORIGIN:
      typeof AGENTSWARM_MARKETPLACE_SWARM_ORIGIN === "undefined" ? undefined : AGENTSWARM_MARKETPLACE_SWARM_ORIGIN,
  } satisfies Record<string, string | undefined>

  function clean(value: string | undefined) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  }

  function readValue(env: Record<string, string | undefined>, name: keyof typeof defineValues) {
    return clean(env[name]) ?? clean(defineValues[name])
  }

  function readStateRoot(env: Record<string, string | undefined>) {
    const root = readValue(env, "AGENTSWARM_PRODUCT_STATE_ROOT")
    return root ? path.resolve(root) : undefined
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

  function readPythonEnvironment(value: string | undefined): PythonEnvironment | undefined {
    const normalized = clean(value)?.toLowerCase()
    if (!normalized) return undefined
    if (normalized === "any" || normalized === "standalone") return normalized
    return undefined
  }

  function readMarketplaceSwarmOrigin(value: string | undefined): MarketplaceSwarmOrigin | undefined {
    const normalized = clean(value)?.toLowerCase()
    if (!normalized) return undefined
    if (normalized === "original" || normalized === "fork" || normalized === "unknown") return normalized
    return undefined
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  function readStringList(value: unknown) {
    return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length > 0
      ? value
      : undefined
  }

  function readOptionalStringList(value: unknown) {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined
  }

  function isEnvKey(value: string) {
    return /^[A-Z_][A-Z0-9_]*$/.test(value)
  }

  function readAddon(value: unknown): Addon | undefined {
    if (!isRecord(value)) return undefined
    if (typeof value.id !== "string" || typeof value.title !== "string") return undefined
    const keys = readStringList(value.keys)
    if (!keys || keys.some((key) => !isEnvKey(key))) return undefined
    const hasExclusions = Object.hasOwn(value, "excludeProviders")
    const excludeProviders = hasExclusions ? readOptionalStringList(value.excludeProviders) : undefined
    if (hasExclusions && !excludeProviders) return undefined
    const addon = {
      id: value.id,
      title: value.title,
      keys,
    }
    return excludeProviders ? { ...addon, excludeProviders } : addon
  }

  function readAddons(value: string | undefined) {
    if (value === undefined || value.trim() === "") return undefined
    try {
      const parsed: unknown = JSON.parse(value)
      if (!Array.isArray(parsed)) return undefined
      const addons = parsed.map(readAddon).filter((item): item is Addon => item !== undefined)
      if (addons.length !== parsed.length) return undefined
      if (new Set(addons.map((addon) => addon.id)).size !== addons.length) return undefined
      return addons
    } catch {
      return undefined
    }
  }

  export function resolve(env: Record<string, string | undefined> = process.env): Profile {
    const overrides = {
      name: readValue(env, "AGENTSWARM_PRODUCT_DISPLAY_NAME"),
      cmd: readValue(env, "AGENTSWARM_PRODUCT_COMMAND"),
      packageName: readValue(env, "AGENTSWARM_PRODUCT_PACKAGE_NAME"),
      launcherPackageName: readValue(env, "AGENTSWARM_PRODUCT_LAUNCHER_PACKAGE_NAME"),
      productVersion: readValue(env, "AGENTSWARM_PRODUCT_VERSION"),
      releaseRepo: readValue(env, "AGENTSWARM_PRODUCT_RELEASE_REPO"),
      docs: readValue(env, "AGENTSWARM_PRODUCT_DOCS_URL"),
      issue: readValue(env, "AGENTSWARM_PRODUCT_ISSUE_URL"),
      mdnsDomain: readValue(env, "AGENTSWARM_PRODUCT_MDNS_DOMAIN"),
      starterTemplateRepo: readValue(env, "AGENTSWARM_PRODUCT_STARTER_REPO"),
      starterProjectName: readValue(env, "AGENTSWARM_PRODUCT_STARTER_FOLDER"),
      agencyEntryFiles: readEntryFiles(readValue(env, "AGENTSWARM_PRODUCT_ENTRY_FILES")),
      skipPostAuthModelSelection: readBoolean(readValue(env, "AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION")),
      hideModelSelection: readBoolean(readValue(env, "AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION")),
      tuiLogoLeft: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_TUI_LOGO_LEFT")),
      tuiLogoRight: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_TUI_LOGO_RIGHT")),
      wordmarkLines: readLines(readRawValue(env, "AGENTSWARM_PRODUCT_WORDMARK_LINES")),
      pythonEnvironment: readPythonEnvironment(readValue(env, "AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT")),
      addons: readAddons(readValue(env, "AGENTSWARM_PRODUCT_ADDONS")),
      stateRoot: readStateRoot(env),
      marketplaceSwarmID: readValue(env, "AGENTSWARM_MARKETPLACE_SWARM_ID"),
      marketplaceParentSwarmID: readValue(env, "AGENTSWARM_MARKETPLACE_PARENT_SWARM_ID"),
      marketplaceSwarmOrigin: readMarketplaceSwarmOrigin(readValue(env, "AGENTSWARM_MARKETPLACE_SWARM_ORIGIN")),
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
      skipPostAuthModelSelection: overrides.skipPostAuthModelSelection ?? defaults.skipPostAuthModelSelection,
      hideModelSelection: overrides.hideModelSelection ?? defaults.hideModelSelection,
      addons: overrides.addons ?? defaults.addons,
      name: overrides.name ?? defaults.name,
      cmd: overrides.cmd ?? defaults.cmd,
      packageName: overrides.packageName ?? defaults.packageName,
      launcherPackageName: overrides.launcherPackageName ?? defaults.launcherPackageName,
      productVersion: overrides.productVersion,
      releaseRepo: overrides.releaseRepo ?? defaults.releaseRepo,
      docs: overrides.docs ?? defaults.docs,
      issue: overrides.issue ?? defaults.issue,
      mdnsDomain: overrides.mdnsDomain ?? defaults.mdnsDomain,
      starterTemplateRepo: overrides.starterTemplateRepo ?? defaults.starterTemplateRepo,
      starterProjectName: overrides.starterProjectName ?? defaults.starterProjectName,
      agencyEntryFiles: overrides.agencyEntryFiles ?? defaults.agencyEntryFiles,
      tuiLogoLeft: overrides.tuiLogoLeft,
      tuiLogoRight: overrides.tuiLogoRight,
      wordmarkLines: overrides.wordmarkLines,
      pythonEnvironment: overrides.pythonEnvironment ?? defaults.pythonEnvironment,
      stateRoot: overrides.stateRoot,
      marketplaceSwarmID: overrides.marketplaceSwarmID,
      marketplaceParentSwarmID: overrides.marketplaceParentSwarmID,
      marketplaceSwarmOrigin: overrides.marketplaceSwarmOrigin,
    }
  }

  const current = resolve()

  export const custom = current.custom
  export const customBranding = current.customBranding
  export const customStarter = current.customStarter
  export const skipPostAuthModelSelection = current.skipPostAuthModelSelection
  export const hideModelSelection = current.hideModelSelection
  export const addons = current.addons
  export const name = current.name
  export const packageName = current.packageName
  export const launcherPackageName = current.launcherPackageName
  export const productVersion = current.productVersion
  export const cmd = current.cmd
  export const mdnsDomain = current.mdnsDomain
  export const releaseRepo = current.releaseRepo
  export const docs = current.docs
  export const issue = current.issue
  export const starterTemplateRepo = current.starterTemplateRepo
  export const starterProjectName = current.starterProjectName
  export const agencyEntryFiles = current.agencyEntryFiles
  export const tuiLogoLeft = current.tuiLogoLeft
  export const tuiLogoRight = current.tuiLogoRight
  export const wordmarkLines = current.wordmarkLines
  export const pythonEnvironment = current.pythonEnvironment
  export const stateRoot = current.stateRoot
  export const marketplaceSwarmID = current.marketplaceSwarmID
  export const marketplaceParentSwarmID = current.marketplaceParentSwarmID
  export const marketplaceSwarmOrigin = current.marketplaceSwarmOrigin
  export const auth = "Manage provider auth"
  export const connect = "Connect to local agency-swarm server"
  export const start = [
    "Authenticate providers and connect to a local agency-swarm server before sending prompts.",
    "Use /auth for provider credentials, then /connect to choose the server and store a token.",
  ]

  export function shouldShowPostAuthModelSelection(profile: Pick<Profile, "skipPostAuthModelSelection"> = current) {
    return !profile.skipPostAuthModelSelection
  }

  export function shouldShowModelSelection(profile: Pick<Profile, "hideModelSelection"> = current) {
    return !profile.hideModelSelection
  }

  export function shouldShowAddons(profile: Pick<Profile, "addons"> = current) {
    return profile.addons.length > 0
  }

  export function modelSwitchCommandState(profile: Pick<Profile, "hideModelSelection"> = current) {
    const enabled = shouldShowModelSelection(profile)
    return {
      enabled,
      hidden: !enabled,
    }
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
    "Use {highlight}/editor{/highlight}",
    "Run {highlight}/init{/highlight}",
    "Use {highlight}/review{/highlight}",
    "{highlight}/models{/highlight}",
    "Add {highlight}.md{/highlight} files to {highlight}.agentswarm/agent/{/highlight}",
    "Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents",
    "Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers",
    "Press {highlight}F2{/highlight}",
    "Configure {highlight}model{/highlight}",
    "OpenCode auto-handles OAuth",
    "Switch to {highlight}Plan{/highlight}",
    "Create JSON theme files in {highlight}.agentswarm/themes/{/highlight}",
    "Use {highlight}\"theme\": \"system\"{/highlight}",
    "Themes support dark/light variants",
    "Use numeric xterm color codes",
    "Run {highlight}opencode serve{/highlight}",
    `Run {highlight}${cmd} agent create{/highlight}`,
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
    ["{highlight}opencode.json{/highlight}", "{highlight}agentswarm.json{/highlight}"],
    ["{highlight}~/.config/opencode/tui.json{/highlight}", "{highlight}~/.config/agentswarm/tui.json{/highlight}"],
    ["{highlight}.opencode/commands/{/highlight}", "{highlight}.agentswarm/command/{/highlight}"],
    ["{highlight}.opencode/agents/{/highlight}", "{highlight}.agentswarm/agent/{/highlight}"],
    ["{highlight}.opencode/tools/{/highlight}", "{highlight}.agentswarm/tools/{/highlight}"],
    ["{highlight}.opencode/plugins/{/highlight}", "{highlight}.agentswarm/plugin/{/highlight}"],
    ["{highlight}.opencode/themes/{/highlight}", "{highlight}.agentswarm/themes/{/highlight}"],
    ["{highlight}opencode run{/highlight}", `{highlight}${cmd} run{/highlight}`],
    ["{highlight}opencode --continue{/highlight}", `{highlight}${cmd} --continue{/highlight}`],
    ["{highlight}opencode run -f file.ts{/highlight}", `{highlight}${cmd} run -f file.ts{/highlight}`],
    ["{highlight}opencode run --attach{/highlight}", `{highlight}${cmd} run --attach{/highlight}`],
    ["{highlight}opencode upgrade{/highlight}", `{highlight}${cmd} upgrade{/highlight}`],
    ["{highlight}opencode agent create{/highlight}", `{highlight}${cmd} agent create{/highlight}`],
    ["{highlight}opencode debug config{/highlight}", `{highlight}${cmd} debug config{/highlight}`],
  ] as const

  type TipFunction = (...args: unknown[]) => unknown

  function skipped(value: string) {
    return skip.some((text) => value.includes(text))
  }

  function rewrite(value: string) {
    let next = value
    for (const [from, to] of swap) next = next.replaceAll(from, to)
    if (next.includes("{highlight}/compact{/highlight}")) {
      next = next.replace("long sessions near context limits", "long agency-swarm sessions near context limits")
    }
    if (next.includes("{highlight}opencode auth list{/highlight}")) {
      next = `Run {highlight}${cmd} auth list{/highlight} to see configured provider credentials`
    }
    return next
  }

  function transform<T>(item: T): T | undefined {
    if (typeof item === "string") {
      if (skipped(item)) return undefined
      const next = rewrite(item)
      if (skipped(next)) return undefined
      return next as T
    }
    if (typeof item === "function") {
      const fn = item as TipFunction
      return ((...args: unknown[]) => {
        const value = fn(...args)
        if (typeof value !== "string") return value
        if (skipped(value)) return undefined
        const next = rewrite(value)
        if (skipped(next)) return undefined
        return next
      }) as T
    }
    return item
  }

  export function tips<T>(input: T[]): T[] {
    const seen = new Set<string>()
    const base = input.reduce<T[]>((acc, item) => {
      const next = transform(item)
      if (next !== undefined) acc.push(next)
      return acc
    }, [])
    const list = base.concat(add as T[]).filter((item) => {
      if (typeof item !== "string") return true
      if (seen.has(item)) return false
      seen.add(item)
      return true
    })
    return list
  }
}
