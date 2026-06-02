export const commandCategories = new Set<string>(["Agent", "Prompt", "Provider", "Session", "Suggested", "System"])

const commandSourceValues = ["keybind", "palette", "programmatic", "slash", "suggested"] as const

export type CommandTelemetrySource = (typeof commandSourceValues)[number]

export const commandSources = new Set<string>(commandSourceValues)

export const trackedCommandValues = new Set<string>(["docs.open"])

const blockedCommandNameParts = new Set(["credential", "credentials", "key", "password", "private", "secret", "token"])

export function normalizeSlashCommandName(value: string) {
  const first = value.trim().split(/\s+/)[0]?.replace(/^\//, "")
  if (!first) return undefined
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(first)) return undefined
  if (first.split("-").some((part) => blockedCommandNameParts.has(part))) return undefined
  return first
}

export function isTrackedCommandValue(value: string, source: string | boolean | undefined) {
  if (trackedCommandValues.has(value)) return true
  if (source !== "slash") return false
  return normalizeSlashCommandName(value) === value
}
