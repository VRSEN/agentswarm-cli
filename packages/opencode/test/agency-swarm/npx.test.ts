import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import * as prompts from "@clack/prompts"
import {
  buildAgencyConfig,
  buildPythonEnv,
  collectUnixPythonCandidates,
  detectAgencyProject,
  formatProjectLabel,
  LAUNCHER_ENTRY_ENV,
  prepareProjectLaunch,
  resolveNpxAutoProject,
  shouldRunNpxOnboarding,
  summarizeBridgeStderr,
  validateStarterName,
} from "../../src/agency-swarm/npx"
import { AgencySwarmRunSession } from "../../src/agency-swarm/run-session"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Storage } from "../../src/storage/storage"
import { tmpdir } from "../fixture/fixture"

describe("agency-swarm npx onboarding", () => {
  const originalEnv = process.env[LAUNCHER_ENTRY_ENV]

  afterEach(() => {
    mock.restore()
    if (originalEnv === undefined) delete process.env[LAUNCHER_ENTRY_ENV]
    else process.env[LAUNCHER_ENTRY_ENV] = originalEnv
  })

  test("wrapper env enables onboarding for the default launch only", () => {
    process.env[LAUNCHER_ENTRY_ENV] = "1"

    expect(
      shouldRunNpxOnboarding({
        env: process.env,
      }),
    ).toBe(true)

    expect(
      shouldRunNpxOnboarding({
        env: process.env,
        model: "agency-swarm/default",
      }),
    ).toBe(false)
  })

  test("installed agentswarm binary enables onboarding for the default launch", () => {
    delete process.env[LAUNCHER_ENTRY_ENV]

    expect(
      shouldRunNpxOnboarding({
        env: process.env,
        argv: ["/usr/local/bin/agentswarm"],
      }),
    ).toBe(true)

    expect(
      shouldRunNpxOnboarding({
        env: process.env,
        argv: ["C:\\Users\\runner\\bin\\agentswarm.exe"],
      }),
    ).toBe(true)

    // Fork behavior: the platform binary ships as `agentswarm` only; running this fork's
    // compiled binary should trigger launcher mode even if argv[0] is rewritten by the
    // runtime. Setting AGENTSWARM_LAUNCHER=0 is the explicit opt-out.
    expect(
      shouldRunNpxOnboarding({
        env: { ...process.env, [LAUNCHER_ENTRY_ENV]: "0" },
        argv: ["/usr/local/bin/opencode"],
      }),
    ).toBe(false)
  })

  test("launcher mode treats bare project directories as positional args under rewritten argv", async () => {
    await using dir = await tmpdir()
    await mkdir(path.join(dir.path, "my-agency"))
    await mkdir(path.join(dir.path, "run"))
    const originalCwd = process.cwd()

    try {
      process.chdir(dir.path)

      expect(
        shouldRunNpxOnboarding({
          env: process.env,
          argv: ["/usr/local/bin/opencode", "my-agency"],
        }),
      ).toBe(true)

      expect(
        shouldRunNpxOnboarding({
          env: process.env,
          argv: ["bun", "/$bunfs/root/src/index.js", "my-agency"],
        }),
      ).toBe(true)

      expect(
        shouldRunNpxOnboarding({
          env: process.env,
          argv: ["/usr/local/bin/opencode", "run"],
        }),
      ).toBe(false)

      expect(
        shouldRunNpxOnboarding({
          env: process.env,
          argv: ["bun", "B:/~BUN/root/src/index.js", "session"],
        }),
      ).toBe(false)
    } finally {
      process.chdir(originalCwd)
    }
  })

  test("buildAgencyConfig keeps launch config session-scoped", () => {
    const config = JSON.parse(
      buildAgencyConfig({
        baseURL: "http://127.0.0.1:8123",
        agency: "local-agency",
        token: "server-token",
      }),
    )

    expect(config.model).toBe("agency-swarm/default")
    expect(config.provider["agency-swarm"].options).toEqual({
      baseURL: "http://127.0.0.1:8123",
      agency: "local-agency",
      discoveryTimeoutMs: 2000,
      token: "server-token",
    })
  })

  test("buildPythonEnv prepends the project directory for launcher imports", () => {
    const env = buildPythonEnv("/tmp/project", {
      PYTHONPATH: "/existing/path",
    })

    expect(env.PYTHONPATH).toBe(`/tmp/project${path.delimiter}/existing/path`)
  })

  test.skipIf(process.platform === "win32")(
    "collectUnixPythonCandidates discovers any python3.<minor> on PATH and orders them oldest-first",
    async () => {
      await using oldDir = await tmpdir()
      await using newDir = await tmpdir()
      await Bun.write(path.join(oldDir.path, "python3.12"), "")
      await Bun.write(path.join(newDir.path, "python3.14"), "")
      await Bun.write(path.join(newDir.path, "python3"), "")
      await Bun.write(path.join(newDir.path, "python3.99"), "") // far-future version

      const originalPath = process.env.PATH
      process.env.PATH = [oldDir.path, newDir.path].join(":")
      try {
        const candidates = await collectUnixPythonCandidates()
        const versioned = candidates.map(([name]) => name).filter((name) => /^python3\.\d+$/.test(name))
        expect(versioned).toEqual(["python3.12", "python3.14", "python3.99"])
        expect(candidates.at(-2)).toEqual(["python3"])
        expect(candidates.at(-1)).toEqual(["python"])
      } finally {
        process.env.PATH = originalPath
      }
    },
  )

  test.skipIf(process.platform === "win32")(
    "collectUnixPythonCandidates finds python3.14 when it is the only supported versioned binary",
    async () => {
      await using dir = await tmpdir()
      await Bun.write(path.join(dir.path, "python3.9"), "")
      await Bun.write(path.join(dir.path, "python3.14"), "")

      const originalPath = process.env.PATH
      process.env.PATH = dir.path
      try {
        const candidates = await collectUnixPythonCandidates()
        expect(candidates.map(([name]) => name)).toEqual(["python3.14", "python3", "python"])
      } finally {
        process.env.PATH = originalPath
      }
    },
  )

  test.skipIf(process.platform === "win32")(
    "collectUnixPythonCandidates skips python3.<minor> below 3.12 and ignores junk entries",
    async () => {
      await using dir = await tmpdir()
      await Bun.write(path.join(dir.path, "python3.9"), "")
      await Bun.write(path.join(dir.path, "python3.11"), "")
      await Bun.write(path.join(dir.path, "python3.13"), "")
      await Bun.write(path.join(dir.path, "python3.13-config"), "")
      await Bun.write(path.join(dir.path, "python"), "")

      const originalPath = process.env.PATH
      process.env.PATH = dir.path
      try {
        const candidates = await collectUnixPythonCandidates()
        const versioned = candidates.map(([name]) => name).filter((name) => /^python3\.\d+$/.test(name))
        expect(versioned).toEqual(["python3.13"])
      } finally {
        process.env.PATH = originalPath
      }
    },
  )

  test("prepareProjectLaunch installs LiteLLM extras when no dependency manifest exists", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("-c")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "fallback install failed",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("fallback install failed")

    const installCommand = commands.find(isUvPipInstallCommand)

    expect(commands.filter(isUvVenvCommand)).toEqual([["uv", "venv", "--python", "/usr/bin/python3.12", ".venv"]])
    expect(installCommand).toEqual([
      "uv",
      "pip",
      "install",
      "--python",
      getTestVenvPython(dir.path),
      "agency-swarm[fastapi,litellm]>=1.9.6",
    ])
  })

  test("prepareProjectLaunch fails clearly when uv is missing", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "uv: command not found",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("uv was not found. Install uv and rerun `npx @vrsen/agentswarm`")

    expect(commands.some((cmd) => cmd[0] === "uv" && isUvPipInstallCommand(cmd))).toBe(false)
  })

  test("prepareProjectLaunch installs requirements without a second agency-swarm upgrade", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "requirements.txt"), "agency-swarm==1.9.6\n")

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const venvPython = getTestVenvPython(dir.path)
    const uvInstallCommands = commands.filter(isUvPipInstallCommand)
    expect(uvInstallCommands).toEqual([
      ["uv", "pip", "install", "--python", venvPython, "--upgrade", "-r", "requirements.txt"],
    ])
    expect(uvInstallCommands.some((cmd) => cmd.includes("agency-swarm[fastapi,litellm]"))).toBe(false)

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch installs pyproject without a second agency-swarm upgrade", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "pyproject.toml"), "[project]\ndependencies = ['agency-swarm==1.9.6']\n")

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv") || isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const uvInstallCommands = commands.filter(isUvPipInstallCommand)
    expect(uvInstallCommands).toEqual([
      ["uv", "pip", "install", "--python", getTestVenvPython(dir.path), "--upgrade", "-e", "."],
    ])
    expect(uvInstallCommands.some((cmd) => cmd.includes("agency-swarm[fastapi,litellm]"))).toBe(false)

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch refreshes existing requirements venv without unpinned agency-swarm upgrade", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "requirements.txt"), "agency-swarm==1.9.6\n")
    await writeVenvPython(dir.path)

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const uvInstallCommands = commands.filter(isUvPipInstallCommand)
    expect(uvInstallCommands).toEqual([
      ["uv", "pip", "install", "--python", getTestVenvPython(dir.path), "--upgrade", "-r", "requirements.txt"],
    ])
    expect(commands.some((cmd) => cmd.includes("venv"))).toBe(false)
    expect(uvInstallCommands.some((cmd) => cmd.includes("agency-swarm[fastapi,litellm]"))).toBe(false)
    expect(commands.findIndex(isUvPipInstallCommand)).toBeLessThan(commands.findIndex(isCanaryCommand))

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch refreshes existing pyproject venv without unpinned agency-swarm upgrade", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "pyproject.toml"), "[project]\ndependencies = ['agency-swarm==1.9.6']\n")
    await writeVenvPython(dir.path)

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const uvInstallCommands = commands.filter(isUvPipInstallCommand)
    expect(uvInstallCommands).toEqual([
      ["uv", "pip", "install", "--python", getTestVenvPython(dir.path), "--upgrade", "-e", "."],
    ])
    expect(commands.some((cmd) => cmd.includes("venv"))).toBe(false)
    expect(uvInstallCommands.some((cmd) => cmd.includes("agency-swarm[fastapi,litellm]"))).toBe(false)
    expect(commands.findIndex(isUvPipInstallCommand)).toBeLessThan(commands.findIndex(isCanaryCommand))

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch keeps a healthy existing venv when uv is missing", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await writeVenvPython(dir.path)

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      commands.push(cmd)
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "uv: command not found",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(warn).toHaveBeenCalledWith(
      "uv was not found, so project dependency refresh was skipped. The current venv package set will be used as-is.",
    )
    expect(commands.some(isUvPipInstallCommand)).toBe(false)
    expect(commands.some(isUvVenvCommand)).toBe(false)
    expect(commands.some(isCanaryCommand)).toBe(true)

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch preserves corrupted existing venv when rebuild needs missing uv", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await writeVenvPython(dir.path)
    const staleFile = path.join(dir.path, ".venv", "lib", "python3.12", "site-packages", "stale.py")
    await mkdir(path.dirname(staleFile), { recursive: true })
    await Bun.write(staleFile, "stale")

    const confirm = spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)

    const commands: string[][] = []
    const replacementPython = process.platform === "win32" ? "C:\\Python312\\python.exe" : "/usr/bin/python3.12"
    let uvVersionAttempts = 0
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        uvVersionAttempts += 1
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "uv: command not found",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        if (target.endsWith(process.platform === "win32" ? "\\python.exe" : "/python")) {
          return {
            exited: Promise.resolve(0),
            stdout: `${target}\n3.12.7\n`,
            stderr: "",
          } as never
        }
        if (isReplacementPythonProbe(cmd)) {
          return {
            exited: Promise.resolve(0),
            stdout: `${replacementPython}\n3.12.7\n`,
            stderr: "",
          } as never
        }
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "ModuleNotFoundError: No module named 'agency_swarm'",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("uv was not found. Install uv and rerun `npx @vrsen/agentswarm`")

    expect(confirm).not.toHaveBeenCalled()
    expect(uvVersionAttempts).toBeGreaterThanOrEqual(2)
    expect(await Bun.file(getTestVenvPython(dir.path)).exists()).toBe(true)
    expect(await Bun.file(staleFile).exists()).toBe(true)
    expect(commands.some(isUvVenvCommand)).toBe(false)
    expect(commands.some(isUvPipInstallCommand)).toBe(false)
  })

  test("prepareProjectLaunch recreates an incomplete `.venv` instead of overlaying it", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    const staleFile = path.join(dir.path, ".venv", "lib", "python3.12", "site-packages", "stale.py")
    await mkdir(path.dirname(staleFile), { recursive: true })
    await Bun.write(staleFile, "stale")

    const confirm = spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)

    const commands: string[][] = []
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "dependency install failed",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("Dependency install failed")

    expect(confirm).not.toHaveBeenCalled()
    expect(await Bun.file(staleFile).exists()).toBe(false)
    expect(commands.filter(isUvVenvCommand)).toEqual([["uv", "venv", "--python", "/usr/bin/python3.12", ".venv"]])
  })

  test("prepareProjectLaunch recreates `.venv` when uv cannot refresh launcher-managed dependencies", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    const venvPython = path.join(
      dir.path,
      ".venv",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    )
    const staleFile = path.join(dir.path, ".venv", "lib", "python3.12", "site-packages", "stale.py")
    await mkdir(path.dirname(venvPython), { recursive: true })
    await mkdir(path.dirname(staleFile), { recursive: true })
    await Bun.write(venvPython, "")
    await Bun.write(staleFile, "stale")

    const confirm = spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const commands: string[][] = []
    const replacementPython = process.platform === "win32" ? "C:\\Python312\\python.exe" : "/usr/bin/python3.12"
    let uvInstallRuns = 0
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        if (target.endsWith(process.platform === "win32" ? "\\python.exe" : "/python")) {
          return {
            exited: Promise.resolve(0),
            stdout: `${target}\n3.12.7\n`,
            stderr: "",
          } as never
        }
        if (isReplacementPythonProbe(cmd)) {
          return {
            exited: Promise.resolve(0),
            stdout: `${replacementPython}\n3.12.7\n`,
            stderr: "",
          } as never
        }
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        uvInstallRuns += 1
        return {
          exited: Promise.resolve(uvInstallRuns === 1 ? 1 : 0),
          stdout: "",
          stderr: uvInstallRuns === 1 ? "uv: command not found" : "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(confirm).not.toHaveBeenCalled()
    expect(await Bun.file(staleFile).exists()).toBe(false)
    expect(commands.filter(isUvVenvCommand)).toEqual([["uv", "venv", "--python", replacementPython, ".venv"]])
    expect(uvInstallRuns).toBe(2)
    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch reruns the canary after rebuilding `.venv` and surfaces manifest import mismatches", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "requirements.txt"), "agency-swarm==0.0.0\n")
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)

    const commands: string[][] = []
    const canaryStderr = [
      "Traceback (most recent call last):",
      "ImportError: cannot import name 'LoadFileAttachment' from 'agency_swarm.tools.built_in'",
    ].join("\n")

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        if (target.endsWith(process.platform === "win32" ? "\\python.exe" : "/python")) {
          return {
            exited: Promise.resolve(0),
            stdout: `${target}\n3.12.7\n`,
            stderr: "",
          } as never
        }
        if (isReplacementPythonProbe(cmd)) {
          return {
            exited: Promise.resolve(0),
            stdout: `/usr/bin/python3.12\n3.12.7\n`,
            stderr: "",
          } as never
        }
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: canaryStderr,
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    let error: Error | undefined
    try {
      await prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      })
    } catch (caught) {
      error = caught as Error
    }

    expect(error).toBeInstanceOf(Error)
    if (!error) throw new Error("Expected prepareProjectLaunch to fail")
    expect(error.message).toContain(
      "The launcher recreated the local Python environment, but it still could not import required Agency Swarm packages.",
    )
    expect(error.message).toContain("Check requirements.txt/pyproject.toml for agency-swarm version compatibility.")
    expect(error.message).toContain("Check the log file at")
    expect(error.message).not.toContain("Canary import failed")
    expect(error.message).toContain("LoadFileAttachment")

    const canaryCommands = commands.filter(isCanaryCommand)
    expect(canaryCommands).toHaveLength(2)
  })

  test("prepareProjectLaunch streams rebuild output to stderr", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "success").mockImplementation(() => undefined as never)
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => true as never)

    let resolveInstall!: (code: number) => void
    const installExited = new Promise<number>((resolve) => {
      resolveInstall = resolve
    })

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: installExited,
          stdout: "Resolving packages...\n",
          stderr: "Downloading wheels...\n",
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    resolveInstall(1)
    await expect(launch).rejects.toThrow("Dependency install failed: Downloading wheels....")
    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain("Resolving packages...\n")
    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain("Downloading wheels...\n")
  })

  test("prepareProjectLaunch times out dependency rebuilds with a clear log path", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === "function") fn()
      return 1 as never
    }) as unknown as typeof setTimeout)
    spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stdout: "",
          stderr: "still working...\n",
          kill() {
            resolveExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    let error: Error | undefined
    try {
      await prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      })
    } catch (caught) {
      error = caught as Error
    }

    expect(error).toBeInstanceOf(Error)
    if (!error) throw new Error("Expected prepareProjectLaunch to fail")
    expect(error.message).toMatch(/Dependency install timed out after 10 minutes\..*launcher-rebuild\.log/)
    expect(error.message).not.toContain(dir.path)
  })

  test("prepareProjectLaunch times out even when the install process ignores kill", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const realSetTimeout = globalThis.setTimeout
    const killSignals: Array<string | undefined> = []

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === "function") fn()
      return 1 as never
    }) as unknown as typeof setTimeout)
    spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        let resolveExit!: (code: number) => void
        const stderr = createTextOutputStream("still working...\n")
        return {
          exited: new Promise<number>((resolve) => {
            resolveExit = resolve
          }),
          stdout: "",
          stderr: stderr.stream,
          kill(signal?: string) {
            killSignals.push(signal)
            if (signal === "SIGKILL") resolveExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })
    const pending = Symbol("pending")
    const outcome = await Promise.race([
      launch.then(
        () => "resolved",
        (error) => error,
      ),
      new Promise((resolve) => realSetTimeout(() => resolve(pending), 20)),
    ])

    expect(outcome).not.toBe(pending)
    expect(outcome).toBeInstanceOf(Error)
    if (!(outcome instanceof Error)) throw new Error("Expected prepareProjectLaunch to fail")
    expect(killSignals).toEqual([undefined, "SIGKILL"])
    expect(outcome.message).toContain("Dependency install timed out after 10 minutes")
  })

  test("prepareProjectLaunch preserves shutdown stderr emitted during timeout", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => true as never)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === "function") fn()
      return 1 as never
    }) as unknown as typeof setTimeout)
    spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        let resolveExit!: (code: number) => void
        const stderr = createTextOutputStream("still working...\n")
        return {
          exited: new Promise<number>((resolve) => {
            resolveExit = resolve
          }),
          stdout: "",
          stderr: stderr.stream,
          kill() {
            stderr.push("term tail\n")
            stderr.close()
            resolveExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("Dependency install timed out after 10 minutes")

    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain("still working...\n")
    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain("term tail\n")
  })

  test("prepareProjectLaunch clears the install timeout as soon as the child exits", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const realSetTimeout = globalThis.setTimeout
    const timers: Array<{ fn: TimerHandler; cleared: boolean }> = []

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    const setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      const timer = { fn, cleared: false }
      timers.push(timer)
      return timer as never
    }) as unknown as typeof setTimeout)
    const clearTimeoutSpy = spyOn(globalThis, "clearTimeout").mockImplementation(((timer: { cleared?: boolean }) => {
      timer.cleared = true
    }) as unknown as typeof clearTimeout)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    const installStderr = createTextOutputStream("install finished\n")

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: installStderr.stream,
          kill() {},
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launchPromise = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    await new Promise((resolve) => realSetTimeout(resolve, 20))

    expect(timers).not.toHaveLength(0)
    expect(timers[0]?.cleared).toBe(true)
    const installTimeout = timers[0]
    if (typeof installTimeout?.fn !== "function") throw new Error("Expected install timeout callback")
    await installTimeout.fn()

    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
    installStderr.close()
    const launch = await launchPromise
    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch surfaces refresh stderr when agency-swarm upgrade fails", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const info = spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => true as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "Collecting agency-swarm...\n",
          stderr: "ERROR: No matching distribution found for agency-swarm[fastapi,litellm]",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("Refreshing project dependencies with uv. Streaming output to stderr."),
    )
    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain("Collecting agency-swarm...\n")
    expect(stderrWrite.mock.calls.map((call) => call[0])).toContain(
      "ERROR: No matching distribution found for agency-swarm[fastapi,litellm]",
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Installer output: ERROR: No matching distribution found"),
    )

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch keeps broken pip ModuleNotFoundError tracebacks in the log instead of mirroring them", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const pipTraceback = [
      "Traceback (most recent call last):",
      '  File "<frozen runpy>", line 198, in _run_module_as_main',
      "    config: dict = {'pip': 'broken'}",
      '  File "<frozen runpy>", line 88, in _run_code',
      `  File "${path.join(dir.path, ".venv", "lib", "python3.13", "site-packages", "pip", "__main__.py")}", line 22, in <module>`,
      "    from pip._internal.cli.main import main as _main",
      "    foo",
      "ModuleNotFoundError: No module named 'pip._internal.cli.main'",
    ].join("\n")

    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => true as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    let pipRuns = 0
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.13.3\n`,
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        pipRuns += 1
        return {
          exited: Promise.resolve(pipRuns === 1 ? 1 : 0),
          stdout: "",
          stderr: pipRuns === 1 ? `${pipTraceback}\n` : "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const mirroredOutput = stderrWrite.mock.calls.map((call) => call[0]).join("")
    expect(mirroredOutput).not.toContain("Traceback (most recent call last):")
    expect(mirroredOutput).not.toContain("<frozen runpy>")
    expect(mirroredOutput).not.toContain("config: dict")
    expect(mirroredOutput).not.toContain("foo")
    expect(mirroredOutput).not.toContain("pip._internal.cli.main")
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("ModuleNotFoundError: No module named 'pip._internal.cli.main'"),
    )
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Traceback (most recent call last):"))

    const refreshLogs = Array.fromAsync(new Bun.Glob("*-launcher-refresh.log").scan(launcherLogDirectory(dir.path)))
    const logFiles = await refreshLogs
    expect(logFiles).toHaveLength(1)
    const logContent = await Bun.file(path.join(launcherLogDirectory(dir.path), logFiles[0]!)).text()
    expect(logContent).toContain("Traceback (most recent call last):")
    expect(logContent).toContain("<frozen runpy>")
    expect(logContent).toContain("foo")
    expect(logContent).toContain("pip._internal.cli.main")
    expect(logContent).toContain("ModuleNotFoundError: No module named 'pip._internal.cli.main'")

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch resumes stderr after a non-Error pip refresh traceback", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const pipTraceback = [
      "Traceback (most recent call last):",
      '  File "<frozen runpy>", line 198, in _run_module_as_main',
      '  File "<frozen runpy>", line 88, in _run_code',
      `  File "${path.join(dir.path, ".venv", "lib", "python3.13", "site-packages", "pip", "__main__.py")}", line 22, in <module>`,
      "    from pip._internal.cli.main import main as _main",
      "Exception: pip bootstrap failed",
      "later stderr after traceback",
    ].join("\n")

    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => true as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.13.3\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: `${pipTraceback}\n`,
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const mirroredOutput = stderrWrite.mock.calls.map((call) => call[0]).join("")
    expect(mirroredOutput).toContain("later stderr after traceback")
    expect(mirroredOutput).not.toContain("Traceback (most recent call last):")
    expect(mirroredOutput).not.toContain("pip._internal.cli.main")
    expect(mirroredOutput).not.toContain("Exception: pip bootstrap failed")
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Exception: pip bootstrap failed"))
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Traceback (most recent call last):"))

    const refreshLogs = Array.fromAsync(new Bun.Glob("*-launcher-refresh.log").scan(launcherLogDirectory(dir.path)))
    const logFiles = await refreshLogs
    expect(logFiles).toHaveLength(1)
    const logContent = await Bun.file(path.join(launcherLogDirectory(dir.path), logFiles[0]!)).text()
    expect(logContent).toContain("Traceback (most recent call last):")
    expect(logContent).toContain("pip._internal.cli.main")
    expect(logContent).toContain("Exception: pip bootstrap failed")
    expect(logContent).toContain("later stderr after traceback")

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch survives refresh log stream failures", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const iso = "2026-04-22T23:45:00.000Z"
    const refreshLogFile = launcherLogFilePath(dir.path, "launcher-refresh", iso)
    await mkdir(path.dirname(refreshLogFile), { recursive: true })
    await mkdir(refreshLogFile, { recursive: true })

    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(Date.prototype, "toISOString").mockReturnValue(iso)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "Collecting agency-swarm...\n",
          stderr: "ERROR: No matching distribution found for agency-swarm[fastapi,litellm]",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Installer output: ERROR: No matching distribution found"),
    )

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch checks the FastAPI launcher symbol in the canary", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const commands: string[][] = []
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      commands.push(cmd)
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    const canaryScripts = commands.filter(isCanaryCommand).map((cmd) => cmd.at(-1) ?? "")
    expect(canaryScripts.length).toBeGreaterThan(0)
    expect(
      canaryScripts.every((script) => script.includes("from agency_swarm.integrations.fastapi import run_fastapi")),
    ).toBe(true)

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch times out when the import canary hangs", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const realSetTimeout = globalThis.setTimeout
    const realClearTimeout = globalThis.clearTimeout
    const killSignals: Array<string | undefined> = []
    const canaryStderr = createTextOutputStream("importing openai types...\n")
    let resolveCanary!: (code: number) => void
    let canaryStarted = false

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      if (canaryStarted && typeof fn === "function") {
        fn()
        return 1 as never
      }
      return realSetTimeout(fn, 0) as never
    }) as unknown as typeof setTimeout)
    spyOn(globalThis, "clearTimeout").mockImplementation(((timer?: Parameters<typeof clearTimeout>[0]) => {
      realClearTimeout(timer)
    }) as typeof clearTimeout)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        if (target.endsWith(process.platform === "win32" ? "\\python.exe" : "/python")) {
          return {
            exited: Promise.resolve(0),
            stdout: `${target}\n3.12.7\n`,
            stderr: "",
          } as never
        }
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        canaryStarted = true
        return {
          exited: new Promise<number>((resolve) => {
            resolveCanary = resolve
          }),
          stdout: "",
          stderr: canaryStderr.stream,
          kill(signal?: string) {
            killSignals.push(signal)
            if (signal === "SIGKILL") {
              canaryStderr.close()
              resolveCanary(1)
            }
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })
    const pending = Symbol("pending")
    const outcome = await Promise.race([
      launch.then(
        () => "resolved",
        (error) => error,
      ),
      new Promise((resolve) => realSetTimeout(() => resolve(pending), 20)),
    ])

    if (outcome === pending) {
      canaryStderr.close()
      resolveCanary(1)
      await launch.catch(() => undefined)
    }

    expect(outcome).not.toBe(pending)
    expect(outcome).toBeInstanceOf(Error)
    if (!(outcome instanceof Error)) throw new Error("Expected prepareProjectLaunch to fail")
    expect(killSignals).toEqual([undefined, "SIGKILL"])
    expect(outcome.message).toContain("Agency Swarm import canary timed out after 1 minute")
  })

  test("prepareProjectLaunch returns when server readiness timeout stderr does not close", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const realSetTimeout = globalThis.setTimeout
    const serverStderr = createTextOutputStream("bridge still starting\n")
    const killSignals: Array<string | undefined> = []
    let resolveServerExit!: (code: number) => void
    let now = 0

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(Date, "now").mockImplementation(() => {
      const value = now
      now = 90001
      return value
    })
    spyOn(globalThis, "fetch").mockRejectedValue(new Error("not ready") as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        return {
          exited: new Promise<number>((resolve) => {
            resolveServerExit = resolve
          }),
          stderr: serverStderr.stream,
          kill(signal?: string) {
            killSignals.push(signal)
            if (killSignals.length > 1) resolveServerExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })
    const pending = Symbol("pending")
    const outcome = await Promise.race([
      launch.then(
        () => "resolved",
        (error) => error,
      ),
      new Promise((resolve) => realSetTimeout(() => resolve(pending), 1500)),
    ])

    if (outcome === pending) {
      serverStderr.close()
      await launch.catch(() => undefined)
    }

    expect(outcome).not.toBe(pending)
    expect(outcome).toBeInstanceOf(Error)
    if (!(outcome instanceof Error)) throw new Error("Expected prepareProjectLaunch to fail")
    expect(killSignals).toEqual([undefined, undefined])
    expect(outcome.message).toContain(
      "Timed out waiting for the Agency Swarm server to start after 90 seconds. Last bridge output: bridge still starting",
    )
  })

  test("prepareProjectLaunch labels optional bridge warnings as non-fatal on readiness timeout", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const realSetTimeout = globalThis.setTimeout
    const serverStderr = createTextOutputStream(
      [
        "Files folder '/project/example_agent/files' does not exist. Skipping...",
        "App token is not set. Authentication will be disabled.",
      ].join("\n"),
    )
    const killSignals: Array<string | undefined> = []
    let resolveServerExit!: (code: number) => void
    let now = 0

    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(Date, "now").mockImplementation(() => {
      const value = now
      now = 90001
      return value
    })
    spyOn(globalThis, "fetch").mockRejectedValue(new Error("not ready") as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        return {
          exited: new Promise<number>((resolve) => {
            resolveServerExit = resolve
          }),
          stderr: serverStderr.stream,
          kill(signal?: string) {
            killSignals.push(signal)
            if (killSignals.length > 1) resolveServerExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })
    const pending = Symbol("pending")
    const outcome = await Promise.race([
      launch.then(
        () => "resolved",
        (error) => error,
      ),
      new Promise((resolve) => realSetTimeout(() => resolve(pending), 1500)),
    ])

    if (outcome === pending) {
      serverStderr.close()
      await launch.catch(() => undefined)
    }

    expect(outcome).not.toBe(pending)
    expect(outcome).toBeInstanceOf(Error)
    if (!(outcome instanceof Error)) throw new Error("Expected prepareProjectLaunch to fail")
    expect(killSignals).toEqual([undefined, undefined])
    expect(outcome.message).toContain("Timed out waiting for the Agency Swarm server to start after 90 seconds.")
    expect(outcome.message).toContain("Bridge output only contained non-fatal startup warnings")
    expect(outcome.message).not.toContain("Last bridge output")
  })

  test("prepareProjectLaunch does not fail healthy `.venv` launches when refresh logging cannot be created", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    const blockedLogDir = launcherLogDirectory(dir.path)
    await mkdir(path.dirname(blockedLogDir), { recursive: true })
    await Bun.write(blockedLogDir, "occupied\n")
    await mkdir(path.join(dir.path, ".venv", process.platform === "win32" ? "Scripts" : "bin"), {
      recursive: true,
    })
    await Bun.write(
      path.join(
        dir.path,
        ".venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
      "",
    )

    const warn = spyOn(prompts.log, "warn").mockImplementation(() => undefined as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd) || isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Could not create launcher refresh log file"))

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch ignores mirrored stderr pipe failures during rebuild installs", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const stderrPipeError = Object.assign(new Error("write EPIPE"), { code: "EPIPE" })
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(() => {
      throw stderrPipeError
    })
    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as never)

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        const target = cmd[0] ?? ""
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "Collecting agency-swarm...\n",
          stderr: "",
        } as never
      }
      if (isCanaryCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (cmd[1]?.endsWith("launch_agency.py")) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stderr: "",
          kill() {
            resolveExit(0)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(stderrWrite).toHaveBeenCalled()

    await launch?.cleanup?.()
  })

  test("prepareProjectLaunch preserves full install stderr when log creation falls back", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    const blockedLogDir = launcherLogDirectory(dir.path)
    await mkdir(path.dirname(blockedLogDir), { recursive: true })
    await Bun.write(blockedLogDir, "occupied\n")
    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)

    const installStderr = Array.from({ length: 8 }, (_, i) => `resolver detail ${i}`).join("\n")

    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        return {
          exited: Promise.resolve(1),
          stdout: "",
          stderr: installStderr,
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow(`Dependency install failed: ${installStderr}`)
  })

  test("prepareProjectLaunch omits rebuild log hints when timeout logging never opens", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const iso = "2026-04-23T02:30:00.000Z"
    const installLogFile = launcherLogFilePath(dir.path, "launcher-rebuild", iso)
    await mkdir(path.dirname(installLogFile), { recursive: true })
    await mkdir(installLogFile, { recursive: true })

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)
    spyOn(prompts.log, "info").mockImplementation(() => undefined as never)
    spyOn(Date.prototype, "toISOString").mockReturnValue(iso)
    spyOn(globalThis, "setTimeout").mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === "function") fn()
      return 1 as never
    }) as unknown as typeof setTimeout)
    spyOn(globalThis, "clearTimeout").mockImplementation(() => undefined as never)

    let error: Error | undefined
    spyOn(Bun, "spawn").mockImplementation((options: any) => {
      const cmd = options?.cmd as string[] | undefined
      if (!cmd) throw new Error("Missing command")
      if (isUvVersionCommand(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "uv 0.8.0\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
      if (cmd.includes("venv")) {
        return {
          exited: Promise.resolve(0),
          stdout: "",
          stderr: "",
        } as never
      }
      if (isUvPipInstallCommand(cmd)) {
        let resolveExit!: (code: number) => void
        const exited = new Promise<number>((resolve) => {
          resolveExit = resolve
        })
        return {
          exited,
          stdout: "",
          stderr: "still working...\n",
          kill() {
            resolveExit(1)
          },
        } as never
      }
      throw new Error(`Unexpected command: ${cmd.join(" ")}`)
    })

    try {
      await prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      })
    } catch (caught) {
      error = caught as Error
    }

    expect(error).toBeInstanceOf(Error)
    if (!error) throw new Error("Expected prepareProjectLaunch to fail")
    expect(error.message).toBe("Dependency install timed out after 10 minutes.")
  })

  test("prepareProjectLaunch avoids manifest remediation after fallback install canary failures", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)

    const canaryStderr = [
      "Traceback (most recent call last):",
      "ImportError: cannot import name 'LoadFileAttachment' from 'agency_swarm.tools.built_in'",
    ].join("\n")

    mockPrepareProjectLaunchCanaryFailure(canaryStderr)

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow(
      "The launcher recreated the local Python environment, but it still could not import required Agency Swarm packages. Check for project-local fastapi.py/agency_swarm.py files that may shadow installed packages.",
    )
  })

  test("prepareProjectLaunch names detected shadowing files in the canary remediation", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)
    await Bun.write(path.join(dir.path, "requirements.txt"), "agency-swarm==1.9.4\n")
    await Bun.write(path.join(dir.path, "fastapi.py"), "print('shadow')\n")
    await Bun.write(path.join(dir.path, "agency_swarm.py"), "print('shadow')\n")

    spyOn(prompts, "confirm").mockResolvedValue(true as never)
    spyOn(prompts, "spinner").mockReturnValue({
      start() {},
      stop() {},
    } as never)

    const canaryStderr = [
      "Traceback (most recent call last):",
      "ModuleNotFoundError: No module named 'agency_swarm.integrations.fastapi'; 'agency_swarm' is not a package",
    ].join("\n")

    mockPrepareProjectLaunchCanaryFailure(canaryStderr)

    await expect(
      prepareProjectLaunch({
        directory: dir.path,
        agencyFile: path.join(dir.path, "agency.py"),
      }),
    ).rejects.toThrow("Detected project-local fastapi.py, agency_swarm.py that may shadow installed packages.")
  })

  test("detectAgencyProject requires agency.py with create_agency", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await detectAgencyProject(dir.path)

    expect(project?.directory).toBe(dir.path)
    expect(project?.agencyFile).toBe(path.join(dir.path, "agency.py"))
  })

  test("detectAgencyProject only checks the selected directory", async () => {
    await using dir = await tmpdir()
    const child = path.join(dir.path, "my-agency")
    await mkdir(child)
    await writeAgency(child)

    const project = await detectAgencyProject(dir.path)

    expect(project).toBeUndefined()
  })

  test("detectAgencyProject ignores parent agency projects", async () => {
    await using dir = await tmpdir()
    const nested = path.join(dir.path, "example_agent")
    await mkdir(nested)
    await writeAgency(dir.path)

    const project = await detectAgencyProject(nested)

    expect(project).toBeUndefined()
  })

  test("detectAgencyProject ignores unrelated python files", async () => {
    await using dir = await tmpdir()
    await Bun.write(path.join(dir.path, "agency.py"), "print('hello')")

    const project = await detectAgencyProject(dir.path)

    expect(project).toBeUndefined()
  })

  test("formatProjectLabel includes the full project path", () => {
    const root = path.join("/tmp", "workspace", "agency")

    expect(
      formatProjectLabel({
        directory: root,
        agencyFile: path.join(root, "agency.py"),
      }),
    ).toBe(`Use detected Agency Swarm project (${root})`)
  })

  test("validateStarterName rejects existing target folders", async () => {
    await using dir = await tmpdir()
    await mkdir(path.join(dir.path, "my-agency"))

    expect(validateStarterName(dir.path, "my-agency")).toBe("A folder with this name already exists")
    expect(validateStarterName(dir.path, "new-agency")).toBeUndefined()
  })

  test("resolveNpxAutoProject uses session directory for explicit session resumes", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: "/tmp/elsewhere",
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [{ sessionID: "ses_123", directory: dir.path }],
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject does not auto-start explicit sessions without run metadata", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject uses legacy local-agency history for explicit session resumes", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([["agency_swarm_history", "legacy"]])
    spyOn(Storage, "read").mockResolvedValue({
      scope: "http://127.0.0.1:8123|local-agency|ses_123",
      chat_history: [],
      updated_at: 1,
    } as never)

    const project = await resolveNpxAutoProject({
      directory: "/tmp/elsewhere",
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject ignores legacy history for remote agencies", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([["agency_swarm_history", "legacy"]])
    spyOn(Storage, "read").mockResolvedValue({
      scope: "https://remote.example|my-remote-agency|ses_123",
      chat_history: [],
      updated_at: 1,
    } as never)

    const project = await resolveNpxAutoProject({
      directory: "/tmp/elsewhere",
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject ignores older local history when newer remote history exists", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([
      ["agency_swarm_history", "older-local"],
      ["agency_swarm_history", "newer-remote"],
    ])
    spyOn(Storage, "read").mockImplementation(async (key) => {
      if (key.at(-1) === "older-local") {
        return {
          scope: "http://127.0.0.1:8123|local-agency|ses_123",
          chat_history: [],
          updated_at: 1,
        } as never
      }
      return {
        scope: "https://remote.example|remote-agency|ses_123",
        chat_history: [],
        updated_at: 2,
      } as never
    })

    const project = await resolveNpxAutoProject({
      directory: "/tmp/elsewhere",
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject does not use legacy local history after an explicit session switches providers", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([["agency_swarm_history", "legacy"]])
    spyOn(Storage, "read").mockResolvedValue({
      scope: "http://127.0.0.1:8123|local-agency|ses_123",
      chat_history: [],
      updated_at: 1,
    } as never)
    spyOn(Session, "messages").mockResolvedValue([
      {
        info: {
          role: "user",
          model: {
            providerID: "openai",
            modelID: "gpt-5",
          },
        },
        parts: [],
      } as never,
    ])

    const project = await resolveNpxAutoProject({
      directory: "/tmp/elsewhere",
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject does not fallback when explicit session is stale", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_missing",
      sessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject does not fallback when explicit session is not an agency project", async () => {
    await using dir = await tmpdir()
    await using other = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      session: "ses_123",
      sessions: [
        {
          id: "ses_123" as any,
          directory: other.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [{ sessionID: "ses_123", directory: other.path }],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject uses latest local root session for continue", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [
        {
          id: "ses_old" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
        {
          id: "ses_new" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 2,
            updated: 2,
          },
        },
      ],
      runSessions: [{ sessionID: "ses_new", directory: dir.path }],
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject does not auto-start continue sessions without run metadata", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [
        {
          id: "ses_remote" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject uses legacy local-agency history for continue", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([["agency_swarm_history", "legacy"]])
    spyOn(Storage, "read").mockResolvedValue({
      scope: "http://127.0.0.1:8123|local-agency|ses_legacy",
      chat_history: [],
      updated_at: 1,
    } as never)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [
        {
          id: "ses_legacy" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject does not use legacy local history for continue after switching providers", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([["agency_swarm_history", "legacy"]])
    spyOn(Storage, "read").mockResolvedValue({
      scope: "http://127.0.0.1:8123|local-agency|ses_legacy",
      chat_history: [],
      updated_at: 1,
    } as never)
    spyOn(Session, "messages").mockResolvedValue([
      {
        info: {
          role: "assistant",
          providerID: "openai",
          modelID: "gpt-5",
        },
        parts: [],
      } as never,
    ])

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [
        {
          id: "ses_legacy" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject ignores local-agency history when the newest scope is remote", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    spyOn(Storage, "list").mockResolvedValue([
      ["agency_swarm_history", "old-local"],
      ["agency_swarm_history", "newer-remote-local-agency"],
    ])
    spyOn(Storage, "read").mockImplementation(async (key) => {
      if (key.at(-1) === "old-local") {
        return {
          scope: "http://127.0.0.1:8123|local-agency|ses_legacy",
          chat_history: [],
          updated_at: 1,
        } as never
      }
      return {
        scope: "https://remote.example|local-agency|ses_legacy",
        chat_history: [],
        updated_at: 2,
      } as never
    })

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [
        {
          id: "ses_legacy" as any,
          directory: dir.path,
          parentID: undefined,
          time: {
            created: 1,
            updated: 1,
          },
        },
      ],
      runSessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject falls back to current project when continue has no local session", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      sessions: [],
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject does not fallback when forking continue without a local session", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      continue: true,
      fork: true,
      sessions: [],
    })

    expect(project).toBeUndefined()
  })

  test("resolveNpxAutoProject starts current project for prompt launch", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      prompt: "hello",
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject starts current project for agent launch", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      agent: "build",
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject starts current project for agency-swarm model launch", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      model: "agency-swarm/default",
    })

    expect(project?.directory).toBe(dir.path)
  })

  test("resolveNpxAutoProject skips non agency-swarm model overrides", async () => {
    await using dir = await tmpdir()
    await writeAgency(dir.path)

    const project = await resolveNpxAutoProject({
      directory: dir.path,
      env: { [LAUNCHER_ENTRY_ENV]: "1" },
      model: "openai/gpt-5",
    })

    expect(project).toBeUndefined()
  })

  test("created run-mode sessions can be resumed by explicit session id", async () => {
    await using dir = await tmpdir({ git: true })
    await writeAgency(dir.path)
    const runProject = process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]

    try {
      process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV] = dir.path
      let session: Session.Info | undefined
      await Instance.provide({
        directory: dir.path,
        fn: async () => {
          session = await Session.create({})
        },
      })

      if (!session) throw new Error("Expected session")
      const current = session
      expect((await AgencySwarmRunSession.get(current.id))?.directory).toBe(dir.path)

      const project = await resolveNpxAutoProject({
        directory: "/tmp/elsewhere",
        env: { [LAUNCHER_ENTRY_ENV]: "1" },
        session: current.id,
      })

      expect(project?.directory).toBe(dir.path)
      await Instance.provide({
        directory: dir.path,
        fn: async () => {
          await Session.remove(current.id)
        },
      })
    } finally {
      if (runProject === undefined) delete process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]
      else process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV] = runProject
    }
  })

  test("summarizeBridgeStderr collapses multiline warnings into a concise tail", () => {
    expect(summarizeBridgeStderr("")).toBe("")
    expect(summarizeBridgeStderr("   \n  \n")).toBe("")

    const warnings =
      "Files folder '/project/example_agent/files' does not exist. Skipping...\n" +
      "Files folder '/project/example_agent2/files' does not exist. Skipping..."
    const summary = summarizeBridgeStderr(warnings)
    expect(summary).toBe(
      "Files folder '/project/example_agent/files' does not exist. Skipping... | Files folder '/project/example_agent2/files' does not exist. Skipping...",
    )

    const manyLines = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n")
    const tail = summarizeBridgeStderr(manyLines)
    expect(tail).toBe("line 15 | line 16 | line 17 | line 18 | line 19")

    const huge = "x".repeat(2000)
    const truncated = summarizeBridgeStderr(huge)
    expect(truncated.endsWith("...")).toBe(true)
    expect(truncated.length).toBeLessThanOrEqual(503)
  })
})

async function writeAgency(dir: string) {
  await Bun.write(
    path.join(dir, "agency.py"),
    [
      "from agency_swarm import Agency",
      "",
      "def create_agency(load_threads_callback=None):",
      "    return Agency()",
    ].join("\n"),
  )
}

async function writeVenvPython(dir: string) {
  const venvPython = getTestVenvPython(dir)
  await mkdir(path.dirname(venvPython), { recursive: true })
  await Bun.write(venvPython, "")
}

function mockPrepareProjectLaunchCanaryFailure(canaryStderr: string) {
  spyOn(Bun, "spawn").mockImplementation((options: any) => {
    const cmd = options?.cmd as string[] | undefined
    if (!cmd) throw new Error("Missing command")
    if (isUvVersionCommand(cmd)) {
      return {
        exited: Promise.resolve(0),
        stdout: "uv 0.8.0\n",
        stderr: "",
      } as never
    }
    if (cmd.includes("import sys; print(sys.executable); print(sys.version.split()[0])")) {
      const target = cmd[0] ?? ""
      if (target.endsWith(process.platform === "win32" ? "\\python.exe" : "/python")) {
        return {
          exited: Promise.resolve(0),
          stdout: `${target}\n3.12.7\n`,
          stderr: "",
        } as never
      }
      if (isReplacementPythonProbe(cmd)) {
        return {
          exited: Promise.resolve(0),
          stdout: "/usr/bin/python3.12\n3.12.7\n",
          stderr: "",
        } as never
      }
    }
    if (isCanaryCommand(cmd)) {
      return {
        exited: Promise.resolve(1),
        stdout: "",
        stderr: canaryStderr,
      } as never
    }
    if (cmd.includes("venv")) {
      return {
        exited: Promise.resolve(0),
        stdout: "",
        stderr: "",
      } as never
    }
    if (isUvPipInstallCommand(cmd)) {
      return {
        exited: Promise.resolve(0),
        stdout: "",
        stderr: "",
      } as never
    }
    throw new Error(`Unexpected command: ${cmd.join(" ")}`)
  })
}

function launcherLogDirectory(directory: string) {
  return path.join(
    os.tmpdir(),
    "agentswarm-cli-logs",
    `${path.basename(path.resolve(directory)) || "project"}-${Bun.hash(path.resolve(directory)).toString(16)}`,
  )
}

function launcherLogFilePath(directory: string, stem: string, iso: string) {
  return path.join(launcherLogDirectory(directory), `${iso.replaceAll(":", "").replaceAll(".", "")}-${stem}.log`)
}

function getTestVenvPython(directory: string) {
  return path.join(
    directory,
    ".venv",
    process.platform === "win32" ? "Scripts" : "bin",
    process.platform === "win32" ? "python.exe" : "python",
  )
}

function createTextOutputStream(initial?: string) {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(next) {
      controller = next
      if (initial) controller.enqueue(encoder.encode(initial))
    },
  })

  return {
    stream,
    push(text: string) {
      controller.enqueue(encoder.encode(text))
    },
    close() {
      try {
        controller.close()
      } catch (error) {
        if (!(error instanceof TypeError) || !String(error.message).includes("Controller is already closed")) {
          throw error
        }
      }
    },
  }
}

function isUvPipInstallCommand(cmd: string[]) {
  return cmd[0] === "uv" && cmd[1] === "pip" && cmd[2] === "install"
}

function isUvVenvCommand(cmd: string[]) {
  return cmd[0] === "uv" && cmd[1] === "venv"
}

function isUvVersionCommand(cmd: string[]) {
  return cmd[0] === "uv" && cmd[1] === "--version"
}

function isReplacementPythonProbe(cmd: string[]) {
  const target = cmd[0] ?? ""
  if (process.platform === "win32") {
    if (target === "py" && (cmd[1]?.startsWith("-3.") ?? false)) return true
    return target === "python" || target === "python3"
  }
  return target === "python" || target === "python3" || /^python3\.\d+$/.test(target)
}

function isCanaryCommand(cmd: string[]) {
  const script = cmd.at(-1) ?? ""
  return (
    cmd.includes("-c") && script.includes("import agency_swarm") && script.includes("agency_swarm.integrations.fastapi")
  )
}
