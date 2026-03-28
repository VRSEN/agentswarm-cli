import path from "node:path"

export function createDevProcess(argv: string[], env: Record<string, string | undefined> = process.env) {
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
    cwd: path.resolve(import.meta.dir, "..", "..", ".."),
    env: {
      ...env,
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
