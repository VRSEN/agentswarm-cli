export * as TuiConfig from "./tui"

import { existsSync } from "fs"
import z from "zod"
import { mergeDeep, unique } from "remeda"
import { Config } from "@/config/config"
import { ConfigPaths } from "@/config/paths"
import { migrateTuiConfig } from "./tui-migrate"
import { TuiInfo } from "./tui-schema"
import { Instance } from "@/project/instance"
import { Flag } from "@/flag/flag"
import { Log } from "@/util/log"
import { isRecord } from "@/util/record"
import { Global } from "@/global"
import { AgencyBrand } from "@/agency-swarm/brand"

const log = Log.create({ service: "tui.config" })

export const Info = TuiInfo

type Acc = { result: Info }

export type Info = z.output<typeof Info> & {
  // Internal resolved plugin list used by runtime loading.
  plugin_origins?: Config.PluginOrigin[]
}

function normalize(raw: Record<string, unknown>) {
  let data = { ...raw }
  if (isRecord(data.tui)) {
    data = { ...data.tui, ...data }
  }
  delete data.tui
  delete data.theme
  if (isRecord(data.keybinds)) {
    const keybinds = { ...data.keybinds }
    delete keybinds.theme_list
    data.keybinds = keybinds
  }
  return data
}

async function load(text: string, configFilepath: string): Promise<Info> {
  const raw = await ConfigPaths.parseText(text, configFilepath, "empty")
  if (!isRecord(raw)) return {}

  const parsed = Info.safeParse(normalize(raw))
  if (!parsed.success) {
    log.warn("invalid tui config", { path: configFilepath, issues: parsed.error.issues })
    return {}
  }

  const data = parsed.data
  if (data.plugin) {
    for (let i = 0; i < data.plugin.length; i++) {
      data.plugin[i] = await Config.resolvePluginSpec(data.plugin[i], configFilepath)
    }
  }
  return data
}

async function loadFile(filepath: string): Promise<Info> {
  const text = await ConfigPaths.readFile(filepath)
  if (!text) return {}
  return load(text, filepath).catch((error) => {
    log.warn("failed to load tui config", { path: filepath, error })
    return {}
  })
}

async function mergeFile(acc: Acc, file: string) {
  const data = await loadFile(file)
  acc.result = mergeDeep(acc.result, data)
  if (!data.plugin?.length) return

  const scope: Config.PluginScope = Instance.containsPath(file) ? "local" : "global"
  const origins = Config.deduplicatePluginOrigins([
    ...(acc.result.plugin_origins ?? []),
    ...data.plugin.map((spec) => ({ spec, scope, source: file })),
  ])
  acc.result.plugin = origins.map((item) => item.spec)
  acc.result.plugin_origins = origins
}

function shouldLoadConfigDir(dir: string) {
  return dir.endsWith(AgencyBrand.workspace) || dir === Flag.OPENCODE_CONFIG_DIR
}

const state = Instance.state(async () => {
  let projectFiles = Flag.OPENCODE_DISABLE_PROJECT_CONFIG
    ? []
    : await ConfigPaths.projectFiles("tui", Instance.directory, Instance.worktree)
  const directories = await ConfigPaths.directories(Instance.directory, Instance.worktree)
  const managed = Config.managedConfigDir()

  await migrateTuiConfig({
    directories,
    custom: Flag.OPENCODE_TUI_CONFIG,
    managed,
  })

  projectFiles = Flag.OPENCODE_DISABLE_PROJECT_CONFIG
    ? []
    : await ConfigPaths.projectFiles("tui", Instance.directory, Instance.worktree)

  const acc: Acc = { result: {} }
  const files = [
    ...ConfigPaths.fileInDirectory(Global.Path.config, "tui"),
    ...(Flag.OPENCODE_TUI_CONFIG ? [Flag.OPENCODE_TUI_CONFIG] : []),
    ...projectFiles,
    ...unique(directories)
      .filter(shouldLoadConfigDir)
      .flatMap((dir) => ConfigPaths.fileInDirectory(dir, "tui")),
    ...(existsSync(managed) ? ConfigPaths.fileInDirectory(managed, "tui") : []),
  ]

  for (const file of files) {
    await mergeFile(acc, file)
    if (file === Flag.OPENCODE_TUI_CONFIG) log.debug("loaded custom tui config", { path: file })
  }

  const keybinds = { ...(acc.result.keybinds ?? {}) }
  if (process.platform === "win32") {
    keybinds.terminal_suspend = "none"
    keybinds.input_undo ??= unique(["ctrl+z", ...Config.Keybinds.shape.input_undo.parse(undefined).split(",")]).join(
      ",",
    )
  }
  acc.result.keybinds = Config.Keybinds.parse(keybinds)

  const deps = acc.result.plugin?.length
    ? unique(directories)
        .filter(shouldLoadConfigDir)
        .map((dir) => Config.installDependencies(dir))
    : []

  return { config: acc.result, deps }
})

export async function get() {
  return state().then((x) => x.config)
}

export async function waitForDependencies() {
  await Promise.all(await state().then((x) => x.deps))
}
