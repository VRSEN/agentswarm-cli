export const commandCategories = new Set<string>(["System"])

const commandSourceValues = ["keybind", "palette", "programmatic", "slash", "suggested"] as const

export type CommandTelemetrySource = (typeof commandSourceValues)[number]

export const commandSources = new Set<string>(commandSourceValues)

export const trackedCommandValues = new Set<string>(["docs.open"])
