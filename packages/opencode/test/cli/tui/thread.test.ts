import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../../fixture/fixture"
import * as App from "../../../src/cli/cmd/tui/app"
import { Rpc } from "../../../src/util"
import { UI } from "../../../src/cli/ui"
import * as Timeout from "../../../src/util/timeout"
import * as Network from "../../../src/cli/network"
import * as Win32 from "../../../src/cli/cmd/tui/win32"
import { TuiConfig } from "../../../src/cli/cmd/tui/config/tui"
import { AgencyProduct } from "../../../src/agency-swarm/product"
import * as Npx from "../../../src/agency-swarm/npx"
import { AgencySwarmRunSession } from "../../../src/agency-swarm/run-session"

const stop = new Error("stop")
const seen = {
  tui: [] as string[],
}

type CallOverrides = {
  continue?: boolean
  prompt?: string
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
    mdnsDomain: AgencyProduct.mdnsDomain,
    cors: [],
  })
  spyOn(Win32, "win32DisableProcessedInput").mockImplementation(() => {})
  spyOn(Win32, "win32InstallCtrlCGuard").mockReturnValue(undefined)
}

describe("tui thread", () => {
  afterEach(() => {
    mock.restore()
  })

  async function call(project?: string, overrides: CallOverrides = {}) {
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
      "mdns-domain": AgencyProduct.mdnsDomain,
      mdnsDomain: AgencyProduct.mdnsDomain,
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

  test("uses cwd-only npx launches without preparing local projects", async () => {
    setup()
    await using caller = await tmpdir({ git: true })
    await using root = await tmpdir()
    const project = path.join(root.path, "project")
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    seen.tui.length = 0
    await fs.mkdir(project, { recursive: true })
    const prepare = spyOn(Npx, "prepareProjectLaunch").mockImplementation(async () => {
      throw new Error("prepareProjectLaunch should not run for cwd-only launches")
    })
    spyOn(Npx, "resolveNpxAutoProject").mockResolvedValue({ directory: project, cwdOnly: true })

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
      process.chdir(caller.path)
      process.env.PWD = caller.path
      await expect(call(undefined, { continue: true, prompt: undefined })).rejects.toBe(stop)
      expect(prepare).not.toHaveBeenCalled()
      expect(seen.tui[0]).toBe(project)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
    }
  })

  test("uses cwd-only remote config content for state-root resumes", async () => {
    setup()
    await using caller = await tmpdir({ git: true })
    await using root = await tmpdir()
    const project = path.join(root.path, "project")
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const configContent = Npx.buildAgencyConfig({
      baseURL: "https://remote.example",
      agency: "remote-agency",
      token: "server-token",
    })
    const configContentEnv = process.env.OPENCODE_CONFIG_CONTENT
    const localProjectEnv = process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    let workerEnv: Record<string, string> | undefined
    seen.tui.length = 0
    await fs.mkdir(project, { recursive: true })
    const prepare = spyOn(Npx, "prepareProjectLaunch").mockImplementation(async () => {
      throw new Error("prepareProjectLaunch should not run for cwd-only launches")
    })
    spyOn(Npx, "resolveNpxAutoProject").mockResolvedValue({
      directory: project,
      cwdOnly: true,
      configContent,
    })

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      constructor(_file: string | URL, options?: { env?: Record<string, string> }) {
        super()
        workerEnv = options?.env
      }
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker

    try {
      process.chdir(caller.path)
      process.env.PWD = caller.path
      await expect(call(undefined, { continue: true, prompt: undefined })).rejects.toBe(stop)
      expect(prepare).not.toHaveBeenCalled()
      expect(seen.tui[0]).toBe(project)
      expect(workerEnv?.OPENCODE_CONFIG_CONTENT).toBe(configContent)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (configContentEnv === undefined) delete process.env.OPENCODE_CONFIG_CONTENT
      else process.env.OPENCODE_CONFIG_CONTENT = configContentEnv
      if (localProjectEnv === undefined) delete process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]
      else process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV] = localProjectEnv
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
    }
  })

  test("prepares local npx projects instead of reusing cwd-only config", async () => {
    setup()
    await using caller = await tmpdir({ git: true })
    await using root = await tmpdir()
    const project = path.join(root.path, "project")
    const agency = {
      directory: project,
      agencyFile: path.join(project, "main.py"),
      moduleName: "main",
    }
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const configContent = Npx.buildAgencyConfig({
      baseURL: "http://127.0.0.1:8123",
      agency: "local-agency",
    })
    const configContentEnv = process.env.OPENCODE_CONFIG_CONTENT
    const localProjectEnv = process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    let workerEnv: Record<string, string> | undefined
    seen.tui.length = 0
    await fs.mkdir(project, { recursive: true })
    spyOn(Npx, "resolveNpxAutoProject").mockResolvedValue(agency)
    const prepare = spyOn(Npx, "prepareProjectLaunch").mockResolvedValue({
      directory: project,
      runProjectDirectory: project,
      configContent,
    })

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      constructor(_file: string | URL, options?: { env?: Record<string, string> }) {
        super()
        workerEnv = options?.env
      }
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker

    try {
      process.chdir(caller.path)
      process.env.PWD = caller.path
      await expect(call(undefined, { continue: true, prompt: undefined })).rejects.toBe(stop)
      expect(prepare).toHaveBeenCalledWith(agency)
      expect(seen.tui[0]).toBe(project)
      expect(workerEnv?.OPENCODE_CONFIG_CONTENT).toBe(configContent)
      expect(workerEnv?.[AgencySwarmRunSession.LOCAL_PROJECT_ENV]).toBe(project)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (configContentEnv === undefined) delete process.env.OPENCODE_CONFIG_CONTENT
      else process.env.OPENCODE_CONFIG_CONTENT = configContentEnv
      if (localProjectEnv === undefined) delete process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV]
      else process.env[AgencySwarmRunSession.LOCAL_PROJECT_ENV] = localProjectEnv
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
    }
  })
})
