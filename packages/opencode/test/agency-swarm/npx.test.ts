import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  buildAgencyConfig,
  buildPythonEnv,
  detectAgencyProject,
  formatProjectLabel,
  LAUNCHER_ENTRY_ENV,
  resolveNpxAutoProject,
  shouldRunNpxOnboarding,
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
