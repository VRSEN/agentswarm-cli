export const commandCategories = new Set<string>(["Agent", "Prompt", "Provider", "Session", "Suggested", "System"])

const commandSourceValues = ["keybind", "palette", "programmatic", "slash", "suggested"] as const

export type CommandTelemetrySource = (typeof commandSourceValues)[number]

export const commandSources = new Set<string>(commandSourceValues)

export const trackedCommandValues = new Set<string>(["docs.open"])

export const trackedSlashCommandValues = new Set<string>([
  "addons",
  "agents",
  "ai-deps",
  "auth",
  "changelog",
  "compact",
  "commit",
  "connect",
  "copy",
  "editor",
  "exit",
  "export",
  "fork",
  "help",
  "init",
  "issues",
  "learn",
  "mcps",
  "models",
  "new",
  "org",
  "redo",
  "rename",
  "review",
  "rmslop",
  "sessions",
  "share",
  "skills",
  "spellcheck",
  "status",
  "thinking",
  "timeline",
  "timestamps",
  "translate",
  "undo",
  "unshare",
  "variants",
])

export function normalizeSlashCommandName(value: string) {
  const first = value.trim().split(/\s+/)[0]?.replace(/^\//, "")
  if (!first) return undefined
  if (!trackedSlashCommandValues.has(first)) return undefined
  return first
}

export function isTrackedCommandValue(value: string, source: string | boolean | undefined) {
  if (trackedCommandValues.has(value)) return true
  if (source !== "slash") return false
  return normalizeSlashCommandName(value) === value
}
