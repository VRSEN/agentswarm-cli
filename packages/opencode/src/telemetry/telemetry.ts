import os from "os"
import path from "path"
import fs from "fs/promises"
import { Global } from "@opencode-ai/core/global"
import { Flag } from "@opencode-ai/core/flag/flag"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { AgencyProduct } from "@/agency-swarm/product"
import { commandCategories, commandSources, isTrackedCommandValue } from "./command-values"

declare const AGENTSWARM_POSTHOG_API_KEY: string | undefined
declare const AGENTSWARM_POSTHOG_HOST: string | undefined

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"
const STATE_FILE = "telemetry.json"
const FALSE_VALUES = new Set(["0", "false", "off", "no"])
const REQUEST_TIMEOUT_MS = 2_000
const publicProviderIDs = new Set([
  "agency-swarm",
  "amazon-bedrock",
  "anthropic",
  "azure",
  "deepseek",
  "github-copilot",
  "gitlab",
  "google",
  "google-vertex",
  "groq",
  "litellm",
  "lmstudio",
  "mistral",
  "ollama",
  "opencode",
  "opencode-go",
  "openai",
  "openrouter",
  "xai",
])
const publicIntegrationIDs = new Set([
  "anthropic",
  "composio",
  "fal",
  "google",
  "pexels",
  "pixabay",
  "search",
  "unsplash",
])

const allowedEvents = new Set([
  "app_started",
  "integration_requested",
  "provider_auth_configured",
  "provider_auth_failed",
  "provider_auth_started",
  "provider_requested",
  "task_failed",
  "task_succeeded",
  "ui_command_executed",
  "ui_prompt_submitted",
])

type TelemetryEvent =
  | "app_started"
  | "integration_requested"
  | "provider_auth_configured"
  | "provider_auth_failed"
  | "provider_auth_started"
  | "provider_requested"
  | "task_failed"
  | "task_succeeded"
  | "ui_command_executed"
  | "ui_prompt_submitted"
type SafeValue = string | boolean
export type TelemetryDurationBucket = "lt_2s" | "2s_10s" | "10s_60s" | "gte_60s" | "unknown"
export type TelemetryErrorBucket = "auth_rejected" | "network" | "server" | "timeout" | "unknown"
type PropertySpec =
  | {
      type: "boolean"
    }
  | {
      type: "integration_id"
    }
  | {
      type: "provider_id"
    }
  | {
      type: "string"
      values?: ReadonlySet<string>
    }
type Pending = {
  abort: () => void
  promise: Promise<void>
}

type InstallID = {
  file: string
  value: Promise<string>
}

const authMethods = new Set(["api", "oauth"])
const authDialogSources = new Set(["auth_dialog"])
const booleanField = { type: "boolean" } satisfies PropertySpec
const providerIDField = { type: "provider_id" } satisfies PropertySpec
const integrationIDField = { type: "integration_id" } satisfies PropertySpec
const durationBuckets = new Set(["lt_2s", "2s_10s", "10s_60s", "gte_60s", "unknown"])
const errorBuckets = new Set(["auth_rejected", "network", "server", "timeout", "unknown"])
const platforms = new Set(["aix", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32"])
const promptModes = new Set(["normal", "shell"])
const promptTypes = new Set(["prompt", "server_command", "shell"])
const terminalClients = new Set(["app", "cli", "desktop"])

function stringField(values?: ReadonlySet<string>): PropertySpec {
  return {
    type: "string",
    values,
  }
}

const baseProperties: Record<string, PropertySpec> = {
  app: stringField(),
  arch: stringField(),
  channel: stringField(),
  platform: stringField(platforms),
  terminal: stringField(terminalClients),
  version: stringField(),
}

const eventProperties: Record<TelemetryEvent, Record<string, PropertySpec>> = {
  app_started: {
    entrypoint: stringField(new Set(["tui"])),
    framework_mode: booleanField,
    provider_id: providerIDField,
  },
  integration_requested: {
    already_configured: booleanField,
    integration_id: integrationIDField,
    provider_id: providerIDField,
    source: stringField(new Set(["addons_dialog"])),
  },
  provider_auth_configured: {
    auth_method: stringField(authMethods),
    framework_mode: booleanField,
    provider_id: providerIDField,
    source: stringField(authDialogSources),
  },
  provider_auth_failed: {
    auth_method: stringField(authMethods),
    error_bucket: stringField(errorBuckets),
    framework_mode: booleanField,
    provider_id: providerIDField,
    source: stringField(authDialogSources),
    step: stringField(new Set(["api_key_save", "oauth_authorize", "oauth_callback", "post_auth_refresh"])),
  },
  provider_auth_started: {
    auth_method: stringField(authMethods),
    framework_mode: booleanField,
    provider_id: providerIDField,
    source: stringField(authDialogSources),
  },
  provider_requested: {
    connected_before: booleanField,
    framework_mode: booleanField,
    provider_id: providerIDField,
    source: stringField(authDialogSources),
  },
  task_failed: {
    duration_bucket: stringField(durationBuckets),
    error_bucket: stringField(errorBuckets),
    framework_mode: booleanField,
    has_agent_parts: booleanField,
    has_file_parts: booleanField,
    mode: stringField(new Set(["normal"])),
    provider_id: providerIDField,
  },
  task_succeeded: {
    duration_bucket: stringField(durationBuckets),
    framework_mode: booleanField,
    has_agent_parts: booleanField,
    has_file_parts: booleanField,
    mode: stringField(new Set(["normal"])),
    provider_id: providerIDField,
  },
  ui_command_executed: {
    category: stringField(commandCategories),
    command: stringField(),
    keybind: booleanField,
    source: stringField(commandSources),
  },
  ui_prompt_submitted: {
    framework_mode: booleanField,
    has_agent_parts: booleanField,
    has_editor_selection: booleanField,
    has_file_parts: booleanField,
    mode: stringField(promptModes),
    provider_id: providerIDField,
    type: stringField(promptTypes),
  },
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
  const allowTest =
    process.env.AGENTSWARM_TELEMETRY_ALLOW_TEST === "1" &&
    !!(process.env.BUN_TEST || process.env.NODE_ENV === "test" || process.env.OPENCODE_TEST_HOME)
  if (Flag.OPENCODE_PURE && !allowTest) return true
  if (allowTest) return false
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

function safeValue(spec: PropertySpec, value: unknown): SafeValue | undefined {
  if (spec.type === "boolean") return typeof value === "boolean" ? value : undefined
  if (typeof value !== "string") return undefined

  const safe = safeString(value)
  if (!safe) return undefined
  if (spec.type === "provider_id") return publicProviderIDs.has(safe) ? safe : "custom"
  if (spec.type === "integration_id") return publicIntegrationIDs.has(safe) ? safe : "custom"
  if (!spec.values || spec.values.has(safe)) return safe
  return undefined
}

function assignSafe(
  output: Record<string, SafeValue>,
  specs: Record<string, PropertySpec>,
  key: string,
  value: unknown,
) {
  if (!Object.prototype.hasOwnProperty.call(specs, key)) return
  const spec = specs[key]
  const safe = safeValue(spec, value)
  if (safe !== undefined) output[key] = safe
}

function sanitize(event: TelemetryEvent, input: Record<string, unknown> | undefined) {
  const output: Record<string, SafeValue> = {
    $process_person_profile: false,
  }
  assignSafe(output, baseProperties, "app", AgencyProduct.name)
  assignSafe(output, baseProperties, "arch", os.arch())
  assignSafe(output, baseProperties, "channel", InstallationChannel)
  assignSafe(output, baseProperties, "platform", os.platform())
  assignSafe(output, baseProperties, "version", InstallationVersion)
  assignSafe(output, baseProperties, "terminal", Flag.OPENCODE_CLIENT)

  const allowed = eventProperties[event]
  for (const [key, value] of Object.entries(input ?? {})) {
    assignSafe(output, allowed, key, value)
  }
  return output
}

function shouldSend(event: TelemetryEvent, properties: Record<string, SafeValue>) {
  if (event === "ui_command_executed") {
    return typeof properties.command === "string" && isTrackedCommandValue(properties.command, properties.source)
  }
  return true
}

export async function capture(event: TelemetryEvent, properties?: Record<string, unknown>) {
  if (!allowedEvents.has(event)) return false
  if (isDisabledByEnvironment()) return false

  const { apiKey, host } = config()
  if (!apiKey) return false

  const safe = sanitize(event, properties)
  if (!shouldSend(event, safe)) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const url = `${host.replace(/\/+$/, "")}/i/v0/e/`
  const promise = (async () => {
    const body = {
      api_key: apiKey,
      distinct_id: await anonymousInstallID(),
      event,
      properties: safe,
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

export function durationBucket(ms: number): TelemetryDurationBucket {
  if (!Number.isFinite(ms) || ms < 0) return "unknown"
  if (ms < 2_000) return "lt_2s"
  if (ms < 10_000) return "2s_10s"
  if (ms < 60_000) return "10s_60s"
  return "gte_60s"
}

export function errorBucket(error: unknown): TelemetryErrorBucket {
  const status = errorStatus(error)
  if (status === 401 || status === 403) return "auth_rejected"
  if (status !== undefined && status >= 500) return "server"

  const message = errorMessage(error)
  if (!message) return "unknown"
  if (/timeout|timed out|\babort/i.test(message)) return "timeout"
  if (/ECONN|ENOTFOUND|EAI_AGAIN|fetch failed|network|socket|dns/i.test(message)) return "network"
  if (
    /unauthori[sz]ed|forbidden|invalid api key|auth failed|authentication|credential|access token|\b401\b|\b403\b/i.test(
      message,
    )
  ) {
    return "auth_rejected"
  }
  if (/\b5\d\d\b|internal server|bad gateway|service unavailable/i.test(message)) return "server"
  return "unknown"
}

function errorStatus(error: unknown): number | undefined {
  for (const item of errorPayloads(error)) {
    if (!isRecord(item)) continue
    for (const key of ["status", "statusCode", "code"]) {
      const value = item[key]
      if (typeof value === "number" && Number.isInteger(value)) return value
    }
  }
  return undefined
}

function errorMessage(error: unknown): string | undefined {
  for (const item of errorPayloads(error)) {
    const message = messageFrom(item)
    if (message) return message
  }
  return undefined
}

function errorPayloads(error: unknown) {
  if (!isRecord(error)) return [error]
  const data = error["data"]
  return data === undefined ? [error] : [data, error]
}

function messageFrom(value: unknown) {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  if (!isRecord(value)) return undefined
  const message = value["message"]
  return typeof message === "string" ? message : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

export const Telemetry = {
  capture,
  durationBucket,
  errorBucket,
  flush,
  isEnabled,
}
