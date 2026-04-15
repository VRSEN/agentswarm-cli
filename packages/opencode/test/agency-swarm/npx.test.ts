import { afterEach, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  buildAgencyConfig,
  buildPythonEnv,
  detectAgencyProject,
  getStarterBaseDirectory,
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
    await writeAgency(dir.path)

    const project = await detectAgencyProject(dir.path)

    expect(project?.directory).toBe(dir.path)
    expect(project?.agencyFile).toBe(path.join(dir.path, "agency.py"))
  })

  test("detectAgencyProject finds the project root from nested folders", async () => {
    await using dir = await tmpdir()
    const nested = path.join(dir.path, "example_agent", "tools")
    await mkdir(nested, { recursive: true })
    await writeAgency(dir.path)

    const project = await detectAgencyProject(nested)

    expect(project?.directory).toBe(dir.path)
    expect(project?.agencyFile).toBe(path.join(dir.path, "agency.py"))
  })

  test("detectAgencyProject finds one starter project inside the current folder", async () => {
    await using dir = await tmpdir()
    const child = path.join(dir.path, "my-agency")
    await mkdir(child)
    await writeAgency(child)

    const project = await detectAgencyProject(dir.path)

    expect(project?.directory).toBe(child)
    expect(project?.agencyFile).toBe(path.join(child, "agency.py"))
  })

  test("detectAgencyProject ignores ambiguous starter project folders", async () => {
    await using dir = await tmpdir()
    await mkdir(path.join(dir.path, "first"))
    await mkdir(path.join(dir.path, "second"))
    await writeAgency(path.join(dir.path, "first"))
    await writeAgency(path.join(dir.path, "second"))

    const project = await detectAgencyProject(dir.path)

    expect(project).toBeUndefined()
  })

  test("detectAgencyProject ignores unrelated python files", async () => {
    await using dir = await tmpdir()
    await Bun.write(path.join(dir.path, "agency.py"), "print('hello')")

    const project = await detectAgencyProject(dir.path)

    expect(project).toBeUndefined()
  })

  test("getStarterBaseDirectory keeps new starter projects beside detected projects", () => {
    const root = path.join("/tmp", "workspace", "agency")
    const nested = path.join(root, "example_agent", "tools")
    const parent = path.dirname(root)

    expect(
      getStarterBaseDirectory(nested, {
        directory: root,
        agencyFile: path.join(root, "agency.py"),
      }),
    ).toBe(parent)

    expect(
      getStarterBaseDirectory(parent, {
        directory: root,
        agencyFile: path.join(root, "agency.py"),
      }),
    ).toBe(parent)
    expect(getStarterBaseDirectory(parent)).toBe(parent)
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
