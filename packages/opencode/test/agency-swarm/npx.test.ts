import { afterEach, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  buildAgencyConfig,
  buildPythonEnv,
  detectAgencyProject,
  NPX_ENTRY_ENV,
  prepareProjectLaunch,
  shouldRunNpxOnboarding,
} from "../../src/agency-swarm/npx"
import { tmpdir } from "../fixture/fixture"

describe("agency-swarm npx onboarding", () => {
  const originalEnv = process.env[NPX_ENTRY_ENV]

  afterEach(() => {
    if (originalEnv === undefined) delete process.env[NPX_ENTRY_ENV]
    else process.env[NPX_ENTRY_ENV] = originalEnv
  })

  test("wrapper env enables onboarding for the default launch only", () => {
    process.env[NPX_ENTRY_ENV] = "1"

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

  test("detectAgencyProject requires agency.py with create_agency", async () => {
    await using dir = await tmpdir()
    await Bun.write(
      path.join(dir.path, "agency.py"),
      [
        "from agency_swarm import Agency",
        "",
        "def create_agency(load_threads_callback=None):",
        "    return Agency()",
      ].join("\n"),
    )

    const project = await detectAgencyProject(dir.path)

    expect(project?.directory).toBe(dir.path)
    expect(project?.agencyFile).toBe(path.join(dir.path, "agency.py"))
  })

  test("detectAgencyProject ignores unrelated python files", async () => {
    await using dir = await tmpdir()
    await Bun.write(path.join(dir.path, "agency.py"), "print('hello')")

    const project = await detectAgencyProject(dir.path)

    expect(project).toBeUndefined()
  })

  test("prepareProjectLaunch keeps project launches in local Agent Builder mode", async () => {
    await using dir = await tmpdir()
    const venvPython = path.join(
      dir.path,
      ".venv",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    )
    await mkdir(path.dirname(venvPython), { recursive: true })
    await Bun.write(venvPython, "")

    const launch = await prepareProjectLaunch({
      directory: dir.path,
      agencyFile: path.join(dir.path, "agency.py"),
    })

    expect(launch).toEqual({
      directory: dir.path,
    })
  })
})
