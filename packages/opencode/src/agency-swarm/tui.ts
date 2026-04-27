import { Log } from "@/util"

const log = Log.create({ service: "agency-swarm.tui" })

function read(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = input[key]
    if (typeof value !== "string") continue
    const text = value.trim()
    if (text) return text
  }
}

function parse(raw: string) {
  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    log.error("failed to parse agency-swarm TUI payload; ignoring malformed value", {
      error: error instanceof Error ? error.message : String(error),
    })
    return
  }
}

function text(input: Record<string, unknown>) {
  const value =
    read(input, ["snippet", "excerpt", "text", "content", "summary", "match", "preview"]) ??
    (typeof input["content"] === "object" && input["content"] !== null
      ? read(input["content"] as Record<string, unknown>, ["text", "value", "content"])
      : undefined)
  if (!value) return
  return value.replace(/\s+/g, " ").trim().slice(0, 140)
}

function row(value: unknown) {
  if (!value || typeof value !== "object") return []
  const item = value as Record<string, unknown>
  return [
    {
      title:
        read(item, [
          "filename",
          "file_name",
          "file",
          "path",
          "file_path",
          "filepath",
          "relative_path",
          "name",
          "title",
          "id",
          "file_id",
        ]) ?? "Result",
      text: text(item),
    },
  ]
}

export function queries(input: Record<string, unknown>) {
  const values = new Set<string>()
  const add = (value: unknown) => {
    if (typeof value !== "string") return
    const text = value.trim()
    if (!text) return
    const lower = text.toLowerCase()
    if (lower === "none" || lower === "null" || lower === "undefined") return
    values.add(text)
  }
  const addMany = (value: unknown) => {
    if (!Array.isArray(value)) return
    value.forEach(add)
  }
  addMany(input["queries"])
  add(input["query"])
  add(input["search_query"])
  add(input["search_prompt"])
  const action = input["action"]
  if (typeof action === "object" && action !== null) {
    const item = action as Record<string, unknown>
    addMany(item["queries"])
    add(item["query"])
    add(item["search_query"])
    add(item["search_prompt"])
  }
  if (typeof action === "string") add(action)
  return [...values]
}

export function rows(raw?: string) {
  if (!raw) return []
  const data = parse(raw)
  if (Array.isArray(data)) return data.flatMap(row)
  if (data && typeof data === "object") {
    const item = data as Record<string, unknown>
    if (Array.isArray(item["results"])) return item["results"].flatMap(row)
  }
  return []
}
