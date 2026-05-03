import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

function envPath() {
  return path.join(process.cwd(), ".env")
}

function parseLine(line: string) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)
  return match?.[1]
}

function quoteEnvValue(value: string) {
  if (!/[\s"'#\\]/.test(value)) return value
  return JSON.stringify(value)
}

export function readEnvKey(key: string): string | undefined {
  const file = envPath()
  if (!existsSync(file)) return
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((line) => parseLine(line) === key)
  if (!line) return
  const raw = line.slice(line.indexOf("=") + 1).trim()
  if (!raw) return ""
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  return raw
}

export function writeEnvKey(key: string, value: string): void {
  const file = envPath()
  const next = `${key}=${quoteEnvValue(value)}`
  if (!existsSync(file)) {
    writeFileSync(file, `${next}\n`)
    return
  }

  const lines = readFileSync(file, "utf8").split(/\r?\n/)
  const index = lines.findIndex((line) => parseLine(line) === key)
  if (index >= 0) {
    lines[index] = next
  } else {
    if (lines.at(-1) !== "") lines.push("")
    lines.push(next)
  }
  writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"))
}
