import { existsSync, readFileSync, readdirSync } from "fs"
import path from "path"

export type Journal = { sql: string; timestamp: number; name: string }[]

function stamp(name: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(name)
  if (!match) return 0
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  )
}

export function read(dir: string): Journal {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  return dirs
    .map((name) => {
      const file = path.join(dir, name, "migration.sql")
      if (!existsSync(file)) return
      return {
        sql: readFileSync(file, "utf-8"),
        timestamp: stamp(name),
        name,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp) as Journal
}
