import path from "path"
import { type ParseError as JsoncParseError, applyEdits, modify, parse as parseJsonc } from "jsonc-parser"
import { unique } from "remeda"
import z from "zod"
import { ConfigPaths } from "@/config/paths"
import { TuiOptions } from "./tui-schema"
import { Instance } from "@/project/instance"
import { Flag } from "@/flag/flag"
import { Log } from "@/util/log"
import { Filesystem } from "@/util/filesystem"
import { Global } from "@/global"
import { AgencyBrand } from "@/agency-swarm/brand"

const log = Log.create({ service: "tui.migrate" })

const TUI_SCHEMA_URL = "https://opencode.ai/tui.json"

const LegacyRecord = z.record(z.string(), z.unknown()).optional()

const TuiLegacy = z
  .object({
    scroll_speed: TuiOptions.shape.scroll_speed.catch(undefined),
    scroll_acceleration: TuiOptions.shape.scroll_acceleration.catch(undefined),
    diff_style: TuiOptions.shape.diff_style.catch(undefined),
  })
  .strip()

type Input = {
  directories: string[]
  custom?: string
  managed: string
}

/**
 * Migrates tui-specific keys from server config files into dedicated tui.json
 * files. Legacy theme keys are stripped because the TUI now enforces a single
 * built-in dark theme.
 */
export async function migrateTuiConfig(input: Input) {
  const configs = await serverConfigFiles(input)
  for (const file of configs) {
    const source = await Filesystem.readText(file).catch((error) => {
      log.warn("failed to read config for tui migration", { path: file, error })
      return undefined
    })
    if (!source) continue
    const errors: JsoncParseError[] = []
    const data = parseJsonc(source, errors, { allowTrailingComma: true })
    if (errors.length || !data || typeof data !== "object" || Array.isArray(data)) continue

    const keybinds = LegacyRecord.safeParse("keybinds" in data ? data.keybinds : undefined)
    const legacyTui = LegacyRecord.safeParse("tui" in data ? data.tui : undefined)
    const extracted = {
      theme: "theme" in data ? data.theme : undefined,
      keybinds: keybinds.success ? keybinds.data : undefined,
      tui: legacyTui.success ? legacyTui.data : undefined,
    }
    const tui = extracted.tui ? normalizeTui(extracted.tui) : undefined
    if (extracted.theme === undefined && extracted.keybinds === undefined && !tui) continue

    const target = path.join(path.dirname(file), "tui.json")
    const targetExists = await Filesystem.exists(target)
    if (targetExists) {
      if (extracted.theme !== undefined && extracted.keybinds === undefined && !tui) {
        await backupAndStripLegacy(file, source)
      }
      continue
    }

    if (extracted.keybinds === undefined && !tui) {
      await backupAndStripLegacy(file, source)
      continue
    }

    const payload: Record<string, unknown> = {
      $schema: TUI_SCHEMA_URL,
    }
    if (extracted.keybinds !== undefined) {
      const keybinds = { ...extracted.keybinds }
      delete keybinds.theme_list
      if (Object.keys(keybinds).length) payload.keybinds = keybinds
    }
    if (tui) Object.assign(payload, tui)

    const wrote = await Filesystem.write(target, JSON.stringify(payload, null, 2))
      .then(() => true)
      .catch((error) => {
        log.warn("failed to write tui migration target", { from: file, to: target, error })
        return false
      })
    if (!wrote) continue

    const stripped = await backupAndStripLegacy(file, source)
    if (!stripped) {
      log.warn("tui config migrated but source file was not stripped", { from: file, to: target })
      continue
    }
    log.info("migrated tui config", { from: file, to: target })
  }
}

function normalizeTui(data: Record<string, unknown>) {
  const parsed = TuiLegacy.parse(data)
  if (
    parsed.scroll_speed === undefined &&
    parsed.diff_style === undefined &&
    parsed.scroll_acceleration === undefined
  ) {
    return
  }
  return parsed
}

async function backupAndStripLegacy(file: string, source: string) {
  const backup = file + ".tui-migration.bak"
  const hasBackup = await Filesystem.exists(backup)
  const backed = hasBackup
    ? true
    : await Filesystem.write(backup, source)
        .then(() => true)
        .catch((error) => {
          log.warn("failed to backup source config during tui migration", { path: file, backup, error })
          return false
        })
  if (!backed) return false

  const text = ["theme", "keybinds", "tui"].reduce((acc, key) => {
    const edits = modify(acc, [key], undefined, {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
      },
    })
    if (!edits.length) return acc
    return applyEdits(acc, edits)
  }, source)

  return Filesystem.write(file, text)
    .then(() => {
      log.info("stripped tui keys from server config", { path: file, backup })
      return true
    })
    .catch((error) => {
      log.warn("failed to strip legacy tui keys from server config", { path: file, backup, error })
      return false
    })
}

async function serverConfigFiles(input: { directories: string[]; managed: string }) {
  const project = Flag.OPENCODE_DISABLE_PROJECT_CONFIG
    ? []
    : await ConfigPaths.projectFiles(AgencyBrand.config, Instance.directory, Instance.worktree)
  const files = [...project, ...ConfigPaths.fileInDirectory(Global.Path.config, AgencyBrand.config)]
  for (const dir of unique(input.directories)) {
    files.push(...ConfigPaths.fileInDirectory(dir, AgencyBrand.config))
  }
  if (Flag.OPENCODE_CONFIG) files.push(Flag.OPENCODE_CONFIG)
  files.push(...ConfigPaths.fileInDirectory(input.managed, AgencyBrand.config))

  const existing = await Promise.all(
    unique(files).map(async (file) => {
      const ok = await Filesystem.exists(file)
      return ok ? file : undefined
    }),
  )
  return existing.filter((file): file is string => !!file)
}
