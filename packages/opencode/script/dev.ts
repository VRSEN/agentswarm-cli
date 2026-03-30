export function createDevProcess(argv: string[], env: Record<string, string | undefined> = process.env) {
  const root = new URL("../../..", import.meta.url)
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
    cwd: Bun.fileURLToPath(root),
    env: {
      ...env,
      OPENCODE_SOURCE_DEV: env.OPENCODE_SOURCE_DEV ?? "1",
      OPENCODE_DISABLE_AUTOUPDATE: env.OPENCODE_DISABLE_AUTOUPDATE ?? "1",
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
