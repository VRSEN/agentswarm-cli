import path from "node:path"

export function createDevProcess(argv: string[], env: Record<string, string | undefined> = process.env) {
  const root = path.resolve(import.meta.dir, "..", "..", "..")
  const devHome = path.join(root, "opencode-dev")
  return {
    cmd: [
      process.execPath,
      "run",
      "--watch",
      "--cwd",
      "packages/opencode",
      "--conditions=browser",
      "src/index.ts",
      ...argv,
    ],
    cwd: root,
    env: {
      ...env,
      OPENCODE_SOURCE_DEV: env.OPENCODE_SOURCE_DEV ?? "1",
      OPENCODE_DISABLE_AUTOUPDATE: env.OPENCODE_DISABLE_AUTOUPDATE ?? "1",
      XDG_CONFIG_HOME: env.XDG_CONFIG_HOME ?? devHome,
      XDG_DATA_HOME: env.XDG_DATA_HOME ?? devHome,
      XDG_STATE_HOME: env.XDG_STATE_HOME ?? devHome,
      XDG_CACHE_HOME: env.XDG_CACHE_HOME ?? devHome,
    },
  }
}

if (import.meta.main) {
  const child = Bun.spawn({
    ...createDevProcess(Bun.argv.slice(2)),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })

  process.exit(await child.exited)
}
