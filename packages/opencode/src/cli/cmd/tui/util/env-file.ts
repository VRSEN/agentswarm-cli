import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const keyPattern = /^[A-Z_][A-Z0-9_]*$/

function envPath(dir = process.cwd()) {
  return path.join(dir, ".env")
}

function parseValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function formatValue(value: string) {
  return JSON.stringify(value)
}

function assertKey(key: string) {
  if (!keyPattern.test(key)) throw new Error(`Invalid env key: ${key}`)
}

export function readEnvKey(key: string, dir = process.cwd()) {
  assertKey(key)
  const file = envPath(dir)
  if (!existsSync(file)) return undefined
  const prefix = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`)
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((item) => prefix.test(item))
  if (!line) return undefined
  return parseValue(line.slice(line.indexOf("=") + 1))
}

export function writeEnvKey(key: string, value: string, dir = process.cwd()) {
  assertKey(key)
  const file = envPath(dir)
  const next = `${key}=${formatValue(value)}`
  if (!existsSync(file)) {
    writeFileSync(file, `${next}\n`)
    return
  }

  const lines = readFileSync(file, "utf8").split(/\r?\n/)
  const match = new RegExp(`^(\\s*(?:export\\s+)?)${key}(\\s*=)`)
  let updated = false
  const content = lines
    .map((line) => {
      if (!match.test(line)) return line
      updated = true
      return line.replace(match, `$1${key}$2`).replace(/=.*/, `=${formatValue(value)}`)
    })
    .join("\n")

  writeFileSync(file, updated ? content : `${content.replace(/\n*$/, "\n")}${next}\n`)
}
