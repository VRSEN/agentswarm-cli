import path from "node:path"
import { readdir } from "node:fs/promises"
import type { AgencyProduct } from "./product"

export interface PythonInfo {
  cmd: string[]
  executable: string
  version: string
  basePrefix?: string
  condaMetadata?: boolean
}

export interface PythonCommandResult {
  code: number
  stdout: string
}

export type PythonCommandRunner = (cmd: string[], options?: { env?: NodeJS.ProcessEnv }) => Promise<PythonCommandResult>

const CONDA_PATH_COMPONENT =
  /(?:^|[/\\])(?:anaconda\d*|miniconda\d*|miniforge\d*|mambaforge|micromamba|conda\d*)(?:[/\\]|$)/i

// Walk $PATH for python3.<minor> binaries before trying unqualified names. Some
// installers leave `python3` pointed at an older system interpreter while exposing
// supported versions only through their fully qualified names, such as python3.14.
// Prefer the oldest supported version when several are installed.
export async function collectUnixPythonCandidates(): Promise<string[][]> {
  const found = new Map<string, { minor: number; order: number }>()
  let order = 0
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      const match = entry.match(/^python3\.(\d+)$/)
      if (!match) continue
      const minor = Number(match[1])
      if (minor < 12) continue
      const candidate = path.join(dir, entry)
      if (!found.has(candidate)) found.set(candidate, { minor, order: order++ })
    }
  }
  const versioned = [...found.entries()]
    .sort(([, a], [, b]) => a.minor - b.minor || a.order - b.order)
    .map(([name]) => [name])
  return [...versioned, ["python3"], ["python"]]
}

export async function findPythonExecutable(
  run: PythonCommandRunner,
  excludeUnder?: string,
  environment: AgencyProduct.PythonEnvironment = "any",
) {
  const candidates: string[][] =
    process.platform === "win32"
      ? [["py", "-3.13"], ["py", "-3.12"], ["python"], ["python3"]]
      : await collectUnixPythonCandidates()

  const root = excludeUnder ? path.resolve(excludeUnder) : undefined
  const prefix = root ? root + path.sep : undefined
  const env = root ? stripVenvFromEnv(process.env, root) : undefined

  for (const candidate of candidates) {
    const info = await inspectPython(run, candidate, env, {
      includeBasePrefix: environment === "standalone",
    })
    if (!info) continue
    if (root && prefix) {
      const resolved = path.resolve(info.executable)
      if (resolved === root || resolved.startsWith(prefix)) continue
    }
    const match = info.version.match(/^(\d+)\.(\d+)/)
    if (!match) continue
    const major = Number(match[1])
    const minor = Number(match[2])
    if (environment === "standalone" && isCondaPython(info)) continue
    if (major > 3 || (major === 3 && minor >= 12)) return info
  }
}

export async function inspectPython(
  run: PythonCommandRunner,
  cmd: string[],
  env?: NodeJS.ProcessEnv,
  options?: { includeBasePrefix?: boolean },
): Promise<PythonInfo | undefined> {
  const script = options?.includeBasePrefix
    ? [
        "import os, sys",
        "print(sys.executable)",
        "print(sys.version.split()[0])",
        "base_prefix = getattr(sys, 'base_prefix', sys.prefix)",
        "print(base_prefix)",
        "prefixes = {sys.prefix, base_prefix}",
        "print('1' if any(os.path.isdir(os.path.join(prefix, 'conda-meta')) for prefix in prefixes if prefix) else '0')",
      ].join("; ")
    : "import sys; print(sys.executable); print(sys.version.split()[0])"
  const result = await run([...cmd, "-c", script], env ? { env } : undefined)
  if (result.code !== 0) return
  const [executable, version, basePrefix, condaMetadata] = result.stdout.trim().split(/\r?\n/)
  if (!executable || !version) return
  return {
    cmd,
    executable,
    version,
    basePrefix,
    condaMetadata: condaMetadata === "1",
  }
}

export function formatPython(info: PythonInfo | undefined, cmd: string[]) {
  if (!info) return cmd.join(" ")
  return `${info.executable} (Python ${info.version})`
}

export function isCondaPython(info: PythonInfo) {
  if (info.condaMetadata) return true
  return info.basePrefix ? CONDA_PATH_COMPONENT.test(info.basePrefix) : false
}

function stripVenvFromEnv(env: NodeJS.ProcessEnv, root: string): NodeJS.ProcessEnv {
  const bin = path.join(root, process.platform === "win32" ? "Scripts" : "bin")
  const resolvedBin = path.resolve(bin)
  const key = process.platform === "win32" ? "Path" : "PATH"
  const raw = env[key] ?? env.PATH ?? ""
  const sep = process.platform === "win32" ? ";" : ":"
  const filtered = raw
    .split(sep)
    .filter((entry) => {
      if (!entry) return false
      try {
        const resolved = path.resolve(entry)
        return resolved !== resolvedBin && !resolved.startsWith(resolvedBin + path.sep)
      } catch {
        return true
      }
    })
    .join(sep)
  const next = { ...env, [key]: filtered }
  delete next.VIRTUAL_ENV
  // macOS's python3 honors __PYVENV_LAUNCHER__ when reporting sys.executable,
  // so leaving it in would make a healthy system Python lie and report itself
  // as the broken .venv interpreter, hiding the only valid recovery candidate.
  delete next.__PYVENV_LAUNCHER__
  return next
}
