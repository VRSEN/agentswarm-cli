import os from "os"
import path from "path"
import fs from "fs/promises"
import { Global } from "@opencode-ai/core/global"
import { Flag } from "@opencode-ai/core/flag/flag"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { AgencyProduct } from "@/agency-swarm/product"

declare const AGENTSWARM_POSTHOG_API_KEY: string | undefined
declare const AGENTSWARM_POSTHOG_HOST: string | undefined

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"
const STATE_FILE = "telemetry.json"
const FALSE_VALUES = new Set(["0", "false", "off", "no"])
const REQUEST_TIMEOUT_MS = 2_000
const sessionID = crypto.randomUUID()
const publicProviderIDs = new Set([
  "agency-swarm",
  "amazon-bedrock",
  "anthropic",
  "azure",
  "deepseek",
  "github-copilot",
  "google",
  "google-vertex",
  "groq",
  "litellm",
  "lmstudio",
  "ollama",
  "opencode",
  "opencode-go",
  "openai",
  "xai",
])

const allowedEvents = new Set([
  "app_started",
  "provider_auth_configured",
  "ui_command_executed",
  "ui_prompt_submitted",
  "ui_route_changed",
])

const allowedProperties = new Set([
  "app",
  "arch",
  "auth_method",
  "category",
  "channel",
  "command",
  "entrypoint",
  "framework_mode",
  "has_agent_parts",
  "has_editor_selection",
  "has_file_parts",
  "keybind",
  "mode",
  "platform",
  "provider_id",
  "route",
  "slash",
  "source",
  "terminal",
  "to_route",
  "telemetry_session_id",
  "type",
  "version",
])

type TelemetryEvent =
  | "app_started"
  | "provider_auth_configured"
  | "ui_command_executed"
  | "ui_prompt_submitted"
  | "ui_route_changed"
type SafeValue = string | number | boolean
type Fetch = typeof fetch
type Pending = {
  abort: () => void
  promise: Promise<void>
}

let installID: Promise<string> | undefined
let fetchOverride: Fetch | undefined
let pending = new Set<Pending>()

function definedValue(name: "AGENTSWARM_POSTHOG_API_KEY" | "AGENTSWARM_POSTHOG_HOST") {
  try {
    if (name === "AGENTSWARM_POSTHOG_API_KEY") {
      return typeof AGENTSWARM_POSTHOG_API_KEY === "string" ? AGENTSWARM_POSTHOG_API_KEY : undefined
    }
    return typeof AGENTSWARM_POSTHOG_HOST === "string" ? AGENTSWARM_POSTHOG_HOST : undefined
  } catch {
    return undefined
  }
}

function clean(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function config() {
  const apiKey = clean(process.env.AGENTSWARM_POSTHOG_API_KEY ?? definedValue("AGENTSWARM_POSTHOG_API_KEY"))
  const host = clean(process.env.AGENTSWARM_POSTHOG_HOST ?? definedValue("AGENTSWARM_POSTHOG_HOST"))
  return {
    apiKey,
    host: host ?? DEFAULT_POSTHOG_HOST,
  }
}

function statePath() {
  return path.join(process.env.AGENTSWARM_TELEMETRY_STATE_DIR ?? Global.Path.state, STATE_FILE)
}

async function anonymousInstallID() {
  if (!installID) {
    installID = (async () => {
      const file = statePath()
      try {
        const current = JSON.parse(await fs.readFile(file, "utf8")) as { installID?: unknown }
        if (typeof current.installID === "string" && current.installID) return current.installID
      } catch {}

      const next = crypto.randomUUID()
      try {
        await fs.mkdir(path.dirname(file), { recursive: true })
        await fs.writeFile(file, JSON.stringify({ installID: next }, null, 2) + "\n", "utf8")
      } catch {}
      return next
    })()
  }
  return installID
}

function isDisabledByEnvironment() {
  const explicit = process.env.AGENTSWARM_TELEMETRY ?? process.env.OPENCODE_TELEMETRY
  if (explicit && FALSE_VALUES.has(explicit.trim().toLowerCase())) return true
  if (Flag.OPENCODE_PURE) return true
  if (process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST === "1") return false
  if (process.env.CI) return true
  if (process.env.NODE_ENV === "test" || process.env.BUN_TEST) return true
  return false
}

function safeString(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 128) return undefined
  if (/[\r\n\t]/.test(trimmed)) return undefined
  return trimmed
}

function safeValue(key: string, value: unknown): SafeValue | undefined {
  if (!allowedProperties.has(key)) return undefined
  if (typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const safe = safeString(value)
    if (key === "provider_id") return safe ? (publicProviderIDs.has(safe) ? safe : "custom") : undefined
    return safe
  }
  return undefined
}

function assignSafe(output: Record<string, SafeValue>, key: string, value: unknown) {
  const safe = safeValue(key, value)
  if (safe !== undefined) output[key] = safe
}

function sanitize(input: Record<string, unknown> | undefined) {
  const output: Record<string, SafeValue> = {}
  assignSafe(output, "app", AgencyProduct.name)
  assignSafe(output, "arch", os.arch())
  assignSafe(output, "channel", InstallationChannel)
  assignSafe(output, "platform", os.platform())
  assignSafe(output, "telemetry_session_id", sessionID)
  assignSafe(output, "version", InstallationVersion)
  assignSafe(output, "terminal", Flag.OPENCODE_CLIENT)

  for (const [key, value] of Object.entries(input ?? {})) {
    assignSafe(output, key, value)
  }
  return output
}

export async function capture(event: TelemetryEvent, properties?: Record<string, unknown>) {
  if (!allowedEvents.has(event)) return false
  if (isDisabledByEnvironment()) return false

  const { apiKey, host } = config()
  if (!apiKey) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const url = `${host.replace(/\/+$/, "")}/i/v0/e/`
  const promise = (async () => {
    const body = {
      api_key: apiKey,
      distinct_id: await anonymousInstallID(),
      event,
      properties: sanitize(properties),
    }

    const fetcher = fetchOverride ?? fetch
    try {
      await fetcher(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
    } finally {
      clearTimeout(timeout)
    }
  })()
  const task = {
    abort: () => controller.abort(),
    promise,
  }

  pending.add(task)
  promise.finally(() => pending.delete(task))
  return true
}

export async function flush(options: { timeoutMs?: number } = {}) {
  const tasks = [...pending]
  if (tasks.length === 0) return
  const wait = Promise.all(tasks.map((task) => task.promise)).then(() => undefined)
  if (options.timeoutMs === undefined) {
    await wait
    return
  }
  if (options.timeoutMs <= 0) {
    tasks.forEach((task) => task.abort())
    return
  }
  let timeout: Timer | undefined
  await Promise.race([
    wait,
    new Promise<void>((resolve) => {
      timeout = setTimeout(() => {
        tasks.forEach((task) => task.abort())
        resolve()
      }, options.timeoutMs)
    }),
  ])
  if (timeout) clearTimeout(timeout)
}

export function isEnabled() {
  return !!config().apiKey && !isDisabledByEnvironment()
}

export function setFetchForTests(next: Fetch | undefined) {
  fetchOverride = next
}

export function resetForTests() {
  installID = undefined
  pending = new Set()
  fetchOverride = undefined
}

export const Telemetry = {
  capture,
  flush,
  isEnabled,
  resetForTests,
  setFetchForTests,
}
