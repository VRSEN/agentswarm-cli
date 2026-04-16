import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../../fixture/fixture"
import * as App from "../../../src/cli/cmd/tui/app"
import { Rpc } from "../../../src/util/rpc"
import { UI } from "../../../src/cli/ui"
import * as Timeout from "../../../src/util/timeout"
import * as Network from "../../../src/cli/network"
import * as Win32 from "../../../src/cli/cmd/tui/win32"
import { TuiConfig } from "../../../src/config/tui"
import { Instance } from "../../../src/project/instance"
import { AgencySwarmRunSession } from "../../../src/agency-swarm/run-session"

const stop = new Error("stop")
const seen = {
  tui: [] as string[],
  inst: [] as string[],
  config: [] as Array<string | undefined>,
  runEnv: [] as Array<string | undefined>,
}

function setup() {
  // Intentionally avoid mock.module() here: Bun keeps module overrides in cache
  // and mock.restore() does not reset mock.module values. If this switches back
  // to module mocks, later suites can see mocked @/config/tui and fail (e.g.
  // plugin-loader tests expecting real TuiConfig.waitForDependencies). See:
  // https://github.com/oven-sh/bun/issues/7823 and #12823.
  spyOn(App, "tui").mockImplementation(async (input) => {
    if (input.directory) seen.tui.push(input.directory)
    throw stop
  })
  spyOn(Rpc, "client").mockImplementation(() => ({
    call: async () => ({ url: "http://127.0.0.1" }) as never,
    on: () => () => {},
  }))
  spyOn(UI, "error").mockImplementation(() => {})
  spyOn(Timeout, "withTimeout").mockImplementation((input) => input)
  spyOn(Network, "resolveNetworkOptions").mockResolvedValue({
    mdns: false,
    port: 0,
    hostname: "127.0.0.1",
    mdnsDomain: "opencode.local",
    cors: [],
  })
  spyOn(Win32, "win32DisableProcessedInput").mockImplementation(() => {})
  spyOn(Win32, "win32InstallCtrlCGuard").mockReturnValue(undefined)
  spyOn(TuiConfig, "get").mockResolvedValue({})
  spyOn(Instance, "provide").mockImplementation(async (input) => {
    seen.inst.push(input.directory)
    seen.config.push(process.env.OPENCODE_CONFIG_CONTENT)
    seen.runEnv.push(process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV])
    return input.fn()
  })
}

describe("tui thread", () => {
  afterEach(() => {
    mock.restore()
  })

  async function call(project?: string, overrides: Record<string, unknown> = {}) {
    const { TuiThreadCommand } = await import("../../../src/cli/cmd/tui/thread")
    const args: Parameters<NonNullable<typeof TuiThreadCommand.handler>>[0] = {
      _: [],
      $0: "opencode",
      project,
      prompt: "hi",
      model: undefined,
      agent: undefined,
      session: undefined,
      continue: false,
      fork: false,
      port: 0,
      hostname: "127.0.0.1",
      mdns: false,
      "mdns-domain": "opencode.local",
      mdnsDomain: "opencode.local",
      cors: [],
      ...overrides,
    }
    return TuiThreadCommand.handler(args)
  }

  async function check(project?: string) {
    setup()
    await using tmp = await tmpdir({ git: true })
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    const link = path.join(path.dirname(tmp.path), path.basename(tmp.path) + "-link")
    const type = process.platform === "win32" ? "junction" : "dir"
    seen.tui.length = 0
    seen.inst.length = 0
    seen.config.length = 0
    seen.runEnv.length = 0
    await fs.symlink(tmp.path, link, type)

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker

    try {
      process.chdir(tmp.path)
      process.env.PWD = link
      await expect(call(project)).rejects.toBe(stop)
      expect(seen.inst[0]).toBe(tmp.path)
      expect(seen.tui[0]).toBe(tmp.path)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
      await fs.rm(link, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  test("uses the real cwd when PWD points at a symlink", async () => {
    await check()
  })

  test("uses the real cwd after resolving a relative project from PWD", async () => {
    await check(".")
  })

  test("prepares detected project before prompt launch", async () => {
    setup()
    const Npx = await import("../../../src/agency-swarm/npx")
    await using tmp = await tmpdir({ git: true })
    await writeAgency(tmp.path)
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const launcher = process.env[Npx.LAUNCHER_ENTRY_ENV]
    const config = process.env.OPENCODE_CONFIG_CONTENT
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    const cleanup = mock(async () => {})
    seen.tui.length = 0
    seen.inst.length = 0
    seen.config.length = 0
    seen.runEnv.length = 0

    spyOn(Npx, "prepareProjectLaunch").mockResolvedValue({
      directory: tmp.path,
      runProjectDirectory: tmp.path,
      configContent: "project-config",
      cleanup,
    })
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker

    try {
      process.chdir(tmp.path)
      process.env.PWD = tmp.path
      process.env[Npx.LAUNCHER_ENTRY_ENV] = "1"
      await expect(call()).rejects.toBe(stop)
      expect(Npx.prepareProjectLaunch).toHaveBeenCalledTimes(1)
      expect(seen.config[0]).toBe("project-config")
      expect(seen.runEnv[0]).toBe(tmp.path)
      expect(seen.inst[0]).toBe(tmp.path)
      expect(seen.tui[0]).toBe(tmp.path)
      expect(cleanup).toHaveBeenCalledTimes(1)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (launcher === undefined) delete process.env[Npx.LAUNCHER_ENTRY_ENV]
      else process.env[Npx.LAUNCHER_ENTRY_ENV] = launcher
      if (config === undefined) delete process.env.OPENCODE_CONFIG_CONTENT
      else process.env.OPENCODE_CONFIG_CONTENT = config
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
    }
  })
})

async function writeAgency(dir: string) {
  await fs.writeFile(
    path.join(dir, "agency.py"),
    [
      "from agency_swarm import Agency",
      "",
      "def create_agency(load_threads_callback=None):",
      "    return Agency()",
    ].join("\n"),
  )
}
