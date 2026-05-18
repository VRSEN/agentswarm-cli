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

let installID: Promise<string> | undefined
let fetchOverride: Fetch | undefined
let pending = new Set<Promise<void>>()

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
  if (typeof value === "string") return safeString(value)
  return undefined
}

function sanitize(input: Record<string, unknown> | undefined) {
  const output: Record<string, SafeValue> = {
    app: AgencyProduct.name,
    arch: os.arch(),
    channel: InstallationChannel,
    platform: os.platform(),
    telemetry_session_id: sessionID,
    version: InstallationVersion,
  }
  if (Flag.OPENCODE_CLIENT) output.terminal = Flag.OPENCODE_CLIENT

  for (const [key, value] of Object.entries(input ?? {})) {
    const safe = safeValue(key, value)
    if (safe !== undefined) output[key] = safe
  }
  return output
}

export async function capture(event: TelemetryEvent, properties?: Record<string, unknown>) {
  if (!allowedEvents.has(event)) return false
  if (isDisabledByEnvironment()) return false

  const { apiKey, host } = config()
  if (!apiKey) return false

  const url = `${host.replace(/\/+$/, "")}/i/v0/e/`
  const task = (async () => {
    const body = {
      api_key: apiKey,
      distinct_id: await anonymousInstallID(),
      event,
      properties: sanitize(properties),
    }

    const fetcher = fetchOverride ?? fetch
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
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

  pending.add(task)
  task.finally(() => pending.delete(task))
  return true
}

export async function flush() {
  await Promise.all([...pending])
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
