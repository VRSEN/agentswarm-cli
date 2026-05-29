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

const baseProperties = new Set(["app", "arch", "channel", "platform", "terminal", "telemetry_session_id", "version"])

type TelemetryEvent =
  | "app_started"
  | "provider_auth_configured"
  | "ui_command_executed"
  | "ui_prompt_submitted"
  | "ui_route_changed"
type SafeValue = string | number | boolean
type Pending = {
  abort: () => void
  promise: Promise<void>
}

type InstallID = {
  file: string
  value: Promise<string>
}

const eventProperties: Record<TelemetryEvent, Set<string>> = {
  app_started: new Set(["entrypoint", "framework_mode", "provider_id"]),
  provider_auth_configured: new Set(["auth_method", "framework_mode", "provider_id", "source"]),
  ui_command_executed: new Set(["category", "command", "keybind", "source"]),
  ui_prompt_submitted: new Set([
    "framework_mode",
    "has_agent_parts",
    "has_editor_selection",
    "has_file_parts",
    "mode",
    "provider_id",
    "type",
  ]),
  ui_route_changed: new Set(["route", "to_route"]),
}

let installID: InstallID | undefined
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
  const file = statePath()
  if (installID?.file !== file) {
    installID = {
      file,
      value: (async () => {
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
      })(),
    }
  }
  return installID.value
}

function isDisabledByEnvironment() {
  const explicit = [process.env.OPEN_SWARM_TELEMETRY, process.env.AGENTSWARM_TELEMETRY, process.env.OPENCODE_TELEMETRY]
  if (explicit.some((value) => value && FALSE_VALUES.has(value.trim().toLowerCase()))) return true
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

function safeValue(key: string, value: unknown, allowed: Set<string>): SafeValue | undefined {
  if (!allowed.has(key)) return undefined
  if (typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const safe = safeString(value)
    if (key === "provider_id") return safe ? (publicProviderIDs.has(safe) ? safe : "custom") : undefined
    return safe
  }
  return undefined
}

function assignSafe(output: Record<string, SafeValue>, allowed: Set<string>, key: string, value: unknown) {
  const safe = safeValue(key, value, allowed)
  if (safe !== undefined) output[key] = safe
}

function sanitize(event: TelemetryEvent, input: Record<string, unknown> | undefined) {
  const output: Record<string, SafeValue> = {}
  assignSafe(output, baseProperties, "app", AgencyProduct.name)
  assignSafe(output, baseProperties, "arch", os.arch())
  assignSafe(output, baseProperties, "channel", InstallationChannel)
  assignSafe(output, baseProperties, "platform", os.platform())
  assignSafe(output, baseProperties, "telemetry_session_id", sessionID)
  assignSafe(output, baseProperties, "version", InstallationVersion)
  assignSafe(output, baseProperties, "terminal", Flag.OPENCODE_CLIENT)

  const allowed = eventProperties[event]
  for (const [key, value] of Object.entries(input ?? {})) {
    assignSafe(output, allowed, key, value)
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
      properties: sanitize(event, properties),
    }

    try {
      await fetch(url, {
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

export const Telemetry = {
  capture,
  flush,
  isEnabled,
}
