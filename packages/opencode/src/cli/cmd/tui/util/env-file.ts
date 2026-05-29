import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { AgencyProduct } from "@/agency-swarm/product"

const keyPattern = /^[A-Z_][A-Z0-9_]*$/
const productStateRootEnv = "AGENTSWARM_PRODUCT_STATE_ROOT"

function envDir(dir?: string) {
  const env = process.env[productStateRootEnv]?.trim()
  const root = env || AgencyProduct.stateRoot?.trim()
  return dir ?? (root ? path.resolve(root) : process.cwd())
}

function envPath(dir?: string) {
  return path.join(envDir(dir), ".env")
}

function parseValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === "string") return parsed
    } catch {}
    return trimmed.slice(1, -1)
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
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

function isTracked(dir: string) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", ".env"], {
    cwd: dir,
    stdio: "ignore",
  })
  return result.status === 0
}

function writeProtected(file: string, content: string) {
  writeFileSync(file, content, { mode: 0o600 })
  chmodSync(file, 0o600)
}

function eol(content: string) {
  return content.includes("\r\n") ? "\r\n" : "\n"
}

export function readEnvKey(key: string, dir?: string) {
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

export function writeEnvKey(key: string, value: string, dir?: string) {
  writeEnvKeys([[key, value]], dir)
}

export function writeEnvKeys(values: [string, string][], dir?: string) {
  if (values.length === 0) return
  for (const [key] of values) assertKey(key)
  const unique = [...new Map(values)]
  const root = envDir(dir)
  mkdirSync(root, { recursive: true })
  if (isTracked(root)) throw new Error("Refusing to write add-on secrets to a git-tracked .env file.")

  const file = envPath(root)
  const next = unique.map(([key, value]) => `${key}=${formatValue(value)}`)
  if (!existsSync(file)) {
    writeProtected(file, `${next.join("\n")}\n`)
    return
  }

  const current = readFileSync(file, "utf8")
  const lineEnd = eol(current)
  let lines = current.split(/\r\n|\n/)
  const pending = new Map(unique)
  for (const [key, value] of unique) {
    const match = new RegExp(`^(\\s*(?:export\\s+)?)${key}(\\s*=).*$`)
    lines = lines.map((line) => {
      if (!match.test(line)) return line
      pending.delete(key)
      return line.replace(match, (_, prefix: string, equals: string) => `${prefix}${key}${equals}${formatValue(value)}`)
    })
  }
  const remaining = [...pending].map(([key, value]) => `${key}=${formatValue(value)}`)
  let content = lines.join(lineEnd)
  if (remaining.length > 0) {
    content = content.length === 0 ? "" : content.replace(/(?:\r?\n)*$/, lineEnd)
    content += `${remaining.join(lineEnd)}${lineEnd}`
  }

  writeProtected(file, content)
}
