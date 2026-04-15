import { afterEach, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  buildAgencyConfig,
  buildPythonEnv,
  detectAgencyProject,
  formatProjectLabel,
  LAUNCHER_ENTRY_ENV,
  shouldRunNpxOnboarding,
  validateStarterName,
} from "../../src/agency-swarm/npx"
import { tmpdir } from "../fixture/fixture"

describe("agency-swarm npx onboarding", () => {
  const originalEnv = process.env[LAUNCHER_ENTRY_ENV]

  afterEach(() => {
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

    expect(
      shouldRunNpxOnboarding({
        env: process.env,
        argv: ["/usr/local/bin/opencode"],
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
