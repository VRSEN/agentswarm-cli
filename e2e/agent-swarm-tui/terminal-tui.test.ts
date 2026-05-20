import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  startAgencyProtocolServer,
  startTui,
  startTuiDemoAgencyServer,
  writeAgencyProject,
  type TuiProcess,
  type AgencyProtocolServer,
} from "./harness"

let currentTui: TuiProcess | undefined
let currentServer: AgencyProtocolServer | undefined
const tempDirs: string[] = []
const tuiReadyTimeoutMs = process.env.CI ? 120_000 : 30_000
const tuiInteractionTimeoutMs = process.env.CI ? 60_000 : 45_000

async function waitForConfiguredDemoRecipient(tui: TuiProcess) {
  await tui.waitFor(
    () => tui.screen().includes("UserSupportAgent"),
    "configured demo recipient",
    tuiInteractionTimeoutMs,
  )
}

afterEach(async () => {
  await currentTui?.close()
  currentTui = undefined
  currentServer?.stop()
  currentServer = undefined
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("Agent Swarm terminal TUI e2e", () => {
  const packageRoot = path.join(import.meta.dir, "..", "..", "packages", "opencode")

  test("launcher shows the detected-project choice before any venv work", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "agentswarm-detected-project-"))
    tempDirs.push(project)
    await writeAgencyProject(project)

    currentTui = await startTui({
      cwd: packageRoot,
      env: {
        AGENTSWARM_LAUNCHER: "1",
        OPENCODE_CONFIG_CONTENT: undefined,
      },
      args: [project],
    })

    await currentTui.waitForText("Use detected Agency Swarm project", 10_000)
    expect(currentTui.history()).toContain(project)
    expect(currentTui.history()).not.toContain("Creating virtual environment")
  })

  test("run-mode slash commands keep /auth and /connect separate and hide native commands", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/")
    await currentTui.waitForText("/auth")
    const screen = await currentTui.waitForText("/connect")

    expect(screen).toContain("/auth")
    expect(screen).toContain("/connect")
    expect(screen).toContain("/agents")
  })

  test("run-mode slash command filtering hides native commands by query", async () => {
    for (const [hiddenCommand, query] of [
      ["/editor", "/edi"],
      ["/variants", "/var"],
      ["/init", "/ini"],
      ["/review", "/rev"],
    ] as const) {
      currentServer = await startAgencyProtocolServer()
      currentTui = await startTui({ baseURL: currentServer.baseURL })

      await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
      currentTui.write(query)
      await currentTui.waitForText(query)

      expect(currentTui.screen()).not.toContain(hiddenCommand)

      await currentTui.close()
      currentTui = undefined
      currentServer.stop()
      currentServer = undefined
    }
  })

  test("run-target picker uses live agency labels instead of local-agency ids", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("Live QA Agency")

    expect(screen).toContain("Entry Agent")
    expect(screen).toContain("Review Agent")
    expect(screen).not.toContain("local-agency")
  })

  test("run-target picker uses Swarm and agent wording against the TUI demo swarm", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("/agents\r")
    const screen = await currentTui.waitForText("TuiDemoAgency")

    expect(screen).toContain("Select swarm")
    expect(screen).toContain("Swarm: TuiDemoAgency")
    expect(screen).toContain("UserSupportAgent")
    expect(screen).toContain("MathAgent")
    expect(screen.toLowerCase()).not.toContain("recipient")
  })

  test("selecting the swarm row clears stale explicit agent routing", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await selectCurrentSwarm(currentTui)
    currentTui.write("route through the whole swarm\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "swarm-routed request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("route through the whole swarm")
    expect(body).not.toHaveProperty("recipient_agent")
  })

  test("selecting a specific agent routes the next prompt to that agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await selectRunTarget(currentTui, "MathAgent", "Selected MathAgent in swarm TuiDemoAgency")
    currentTui.write("calculate through the selected agent\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agent-routed request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("calculate through the selected agent")
    expect(body).toMatchObject({
      recipient_agent: "MathAgent",
    })
  })

  test("visible OpenAI model state still routes Run-mode prompts to Agency Swarm", async () => {
    currentServer = await startTuiDemoAgencyServer()
    const runProject = await mkdtemp(path.join(os.tmpdir(), "agentswarm-visible-model-run-project-"))
    const stateHome = await mkdtemp(path.join(os.tmpdir(), "agentswarm-visible-model-state-"))
    tempDirs.push(runProject, stateHome)
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      args: ["--model", "openai/gpt-5"],
      env: {
        AGENTSWARM_RUN_PROJECT: runProject,
        XDG_STATE_HOME: stateHome,
      },
      includeOpenAIProvider: true,
    })

    await currentTui.waitForText("GPT-5 OpenAI", tuiReadyTimeoutMs)
    currentTui.write("run through agency despite visible openai model state\r")
    await currentTui.waitForText("TUI demo response complete.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency request with visible openai model state",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("run through agency despite visible openai model state")
    expect(body).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })

    const runSessionState = JSON.parse(
      await readFile(path.join(stateHome, "agentswarm", "agency-swarm-run-sessions.json"), "utf8"),
    ) as Record<string, { mode?: string; directory?: string }>
    expect(Object.values(runSessionState)).toContainEqual({
      mode: "local-project",
      directory: runProject,
    })
  })

  test("/connect opens the Agency Swarm server dialog with visible OpenAI model state", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      args: ["--model", "openai/gpt-5"],
      includeOpenAIProvider: true,
    })

    await currentTui.waitForText("GPT-5 OpenAI", tuiReadyTimeoutMs)
    currentTui.write("/con")
    await currentTui.waitFor(
      () => currentTui!.screen().includes("/connect") && currentTui!.screen().includes("/con"),
      "filtered /connect slash command",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    const screen = await currentTui.waitForText("Connect to local agency-swarm server", tuiInteractionTimeoutMs)

    expect(screen).toContain("Local servers")
    expect(screen).toContain("http://127.0.0.1:8000")
    expect(screen).toContain("http://127.0.0.1:8080")
    expect(screen).toContain("Add local port")
    expect(screen).not.toContain("Connect a provider")

    currentTui.write("\x1b[B\x1b[B")
    const tokenScreen = await currentTui.waitForText("Update token", tuiInteractionTimeoutMs)

    expect(tokenScreen).toContain("Authentication")
    expect(tokenScreen).toContain("Update token")
    expect(tokenScreen).toContain("Clear token")
    expect(tokenScreen).not.toContain("Connect a provider")
  })

  test("Run-mode auth failures open /auth with visible OpenAI model state", async () => {
    currentServer = await startAuthFailureAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      args: ["--model", "openai/gpt-5"],
      includeOpenAIProvider: true,
    })

    await currentTui.waitForText("GPT-5 OpenAI", tuiReadyTimeoutMs)
    currentTui.write("trigger upstream auth failure\r")
    const screen = await currentTui.waitForText("Manage Agent Swarm auth", tuiInteractionTimeoutMs)

    expect(screen).toContain("OpenAI")
    expect(screen).not.toContain("Connect a provider")
  })

  test("/new keeps Run mode usable and starts the next Agency request without old chat history", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      args: ["--model", "openai/gpt-5"],
      includeOpenAIProvider: true,
    })

    await currentTui.waitForText("GPT-5 OpenAI", tuiReadyTimeoutMs)
    currentTui.write("first run mode turn before new\r")
    await currentTui.waitForText("TUI demo response complete.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "first run-mode request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("/new")
    await currentTui.waitFor(
      () => currentTui!.screen().includes("/new"),
      "visible /new slash command",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("\r")
    await currentTui.waitFor(
      () => !currentTui!.screen().includes("first run mode turn before new"),
      "new empty prompt after session.new",
      tuiInteractionTimeoutMs,
    )
    currentTui.write("second run mode turn after new\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "second run-mode request after /new",
      tuiInteractionTimeoutMs,
    )

    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("second run mode turn after new")
    expect(JSON.stringify(nextBody?.chat_history ?? [])).not.toContain("first run mode turn before new")
  })

  test("SendMessage delegation does not switch control to the delegated agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("delegate normal sendmessage\r")
    await currentTui.waitForText("Delegated to MathAgent with SendMessage.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "delegate request", tuiInteractionTimeoutMs)

    currentTui.write("plain followup\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-delegation request",
      tuiInteractionTimeoutMs,
    )

    const delegateBody = currentServer.requests[0]?.body
    expect(delegateBody?.message).toContain("delegate normal sendmessage")
    expect(delegateBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("plain followup")
    expect(nextBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeTrue()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("nested SendMessage handoff-like metadata does not switch control", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("nested delegate with forwarded handoff metadata\r")
    await currentTui.waitForText("Nested SendMessage delegation finished.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "nested delegate request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("plain followup after nested delegation\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-nested-delegation request",
      tuiInteractionTimeoutMs,
    )

    const delegateBody = currentServer.requests[0]?.body
    expect(delegateBody?.message).toContain("nested delegate with forwarded handoff metadata")
    expect(delegateBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("plain followup after nested delegation")
    expect(nextBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeTrue()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("transfer_to handoff switches control to the target agent for the next turn", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("please handoff this calculation\r")
    await currentTui.waitForText("Math agent now has control.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(() => currentServer!.requests.length === 1, "handoff request", tuiInteractionTimeoutMs)

    currentTui.write("continue after handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("please handoff this calculation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
    expect(
      nextBody?.chat_history.some(
        (item: any) => item?.type === "message" && item?.role === "assistant" && !item?.content,
      ),
    ).toBeFalse()
  })

  test("top-level handoff wins over later nested handoff-like metadata", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("mixed handoff with nested delegation\r")
    await currentTui.waitForText("Math handoff finished after nested delegation.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "mixed handoff request",
      tuiInteractionTimeoutMs,
    )

    currentTui.write("continue after mixed handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-mixed-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("mixed handoff with nested delegation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after mixed handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("agent_updated_stream_event-only handoff switches control to the target agent", async () => {
    currentServer = await startTuiDemoAgencyServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      agency: "tui-demo-agency",
      recipientAgent: "UserSupportAgent",
      configSource: "file",
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    await waitForConfiguredDemoRecipient(currentTui)
    currentTui.write("please live handoff this calculation\r")
    await currentTui.waitForText("Live agent update moved control to MathAgent.", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "live handoff request",
      tuiInteractionTimeoutMs,
    )
    await currentTui.waitFor(
      () => currentTui!.screen().includes("MathAgent · Agency Swarm"),
      "live handoff routed prompt",
      tuiInteractionTimeoutMs,
    )
    // CI can briefly focus transient picker/search UI after live handoff routing.
    currentTui.write("\x1b")
    await Bun.sleep(100)

    currentTui.write("continue after live handoff\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 2,
      "post-live-handoff request",
      tuiInteractionTimeoutMs,
    )

    const handoffBody = currentServer.requests[0]?.body
    expect(handoffBody?.message).toContain("please live handoff this calculation")
    expect(handoffBody).toMatchObject({
      recipient_agent: "UserSupportAgent",
    })
    const nextBody = currentServer.requests[1]?.body
    expect(nextBody?.message).toContain("continue after live handoff")
    expect(nextBody).toMatchObject({
      recipient_agent: "MathAgent",
    })
    expect(nextBody?.chat_history.some((item: any) => item?.type === "function_call_output")).toBeFalse()
    expect(nextBody?.chat_history.some((item: any) => item?.type === "handoff_output_item")).toBeFalse()
  })

  test("prompt submit reaches the agency protocol server with the configured agent", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("hello from terminal e2e\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency protocol server stream request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    expect(body?.message).toContain("hello from terminal e2e")
    expect(body).toMatchObject({
      recipient_agent: "entry-agent",
    })
  })

  test("bracketed-paste image paths reach Agency servers as structured message content", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })
    const imageDir = await mkdtemp(path.join(os.tmpdir(), "agentswarm-image-drop-"))
    tempDirs.push(imageDir)
    const imagePath = path.join(imageDir, "red-dot.png")
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    await writeFile(imagePath, Buffer.from(pngBase64, "base64"))

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    const pastedPath = path.relative(packageRoot, imagePath)
    currentTui.write(`\x1b[200~${pastedPath}\x1b[201~`)
    await currentTui.waitForText("[Image 1]", tuiInteractionTimeoutMs)
    currentTui.write("please inspect this image\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "image attachment request",
      tuiInteractionTimeoutMs,
    )

    const body = currentServer.requests[0]?.body
    const message = body?.message as Array<{ content?: Array<Record<string, unknown>> }> | undefined
    expect(message?.[0]?.content).toContainEqual({
      type: "input_image",
      image_url: `data:image/png;base64,${pngBase64}`,
      detail: "auto",
    })
    expect(message?.[0]?.content).toContainEqual({
      type: "input_text",
      text: "[Image 1] please inspect this image",
    })
    expect(body?.file_urls).toBeUndefined()
  })

  test("Esc twice cancels queued Run-mode prompt before active stream drains", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({ baseURL: currentServer.baseURL })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("first issue 172 hold\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "first issue 172 agency request",
      tuiInteractionTimeoutMs,
    )
    const activeRequest = currentServer.requests[0]
    expect(activeRequest?.releaseStream).toBeDefined()
    expect(activeRequest?.streamClosed).toBeDefined()

    currentTui.write("second issue 172 prompt SHOULD_NOT_SEND\r")
    await currentTui.waitForText("QUEUED", tuiInteractionTimeoutMs)
    currentTui.write("\x1b")
    await Bun.sleep(100)
    currentTui.write("\x1b")
    await currentTui.waitForText("Cancelled 1 queued message", tuiInteractionTimeoutMs)
    activeRequest!.releaseStream!()
    await activeRequest!.streamClosed
    await currentTui.waitForText("completed first issue 172 prompt", tuiInteractionTimeoutMs)
    await currentTui.waitFor(
      () => !currentTui!.screen().includes("interrupt"),
      "TUI idle after active issue 172 stream",
      tuiInteractionTimeoutMs,
    )

    expect(currentServer.requests.map((request) => request.body.message)).toEqual(["first issue 172 hold"])
  })

  test("harness does not leak parent provider credentials to the agency protocol server", async () => {
    currentServer = await startAgencyProtocolServer()
    currentTui = await startTui({
      baseURL: currentServer.baseURL,
      env: {
        OPENAI_API_KEY: "sentinel-openai-key",
        ANTHROPIC_API_KEY: "sentinel-anthropic-key",
        ANTHROPIC_AUTH_TOKEN: "sentinel-anthropic-token",
      },
    })

    await currentTui.waitForText("Agency Swarm", tuiReadyTimeoutMs)
    currentTui.write("check env isolation\r")
    await currentTui.waitFor(
      () => currentServer!.requests.length === 1,
      "agency protocol server stream request",
      tuiInteractionTimeoutMs,
    )

    const body = JSON.stringify(currentServer.requests[0]?.body)
    expect(body).not.toContain("sentinel-openai-key")
    expect(body).not.toContain("sentinel-anthropic-key")
    expect(body).not.toContain("sentinel-anthropic-token")
  })
})

async function selectRunTarget(tui: TuiProcess, query: string, successMessage: string) {
  tui.write("/agents\r")
  await tui.waitForText("Select swarm")
  tui.write(query)
  await tui.waitForText(query)
  tui.write("\x1b[B")
  tui.write("\r")
  await tui.waitForText(successMessage, tuiInteractionTimeoutMs)
}

async function selectCurrentSwarm(tui: TuiProcess) {
  tui.write("/agents\r")
  await tui.waitForText("TuiDemoAgency")
  tui.write("\x1b[A\x1b[A\r")
  await tui.waitForText("Selected swarm TuiDemoAgency", tuiInteractionTimeoutMs)
}

async function startAuthFailureAgencyServer(): Promise<AgencyProtocolServer> {
  const requests: AgencyProtocolServer["requests"] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)

      if (url.pathname === "/openapi.json") {
        return Response.json({
          openapi: "3.1.0",
          paths: {
            "/local-agency/get_metadata": { get: {} },
            "/local-agency/get_response_stream": { post: {} },
            "/local-agency/cancel_response_stream": { post: {} },
          },
        })
      }

      if (url.pathname === "/local-agency/get_metadata") {
        return Response.json({
          agency_swarm_version: "1.9.6",
          metadata: {
            agencyName: "Auth Failure Agency",
            agents: ["entry-agent"],
            entryPoints: ["entry-agent"],
          },
          nodes: [
            {
              id: "entry-agent",
              type: "agent",
              data: {
                label: "Entry Agent",
                isEntryPoint: true,
                model: "gpt-4o-mini",
              },
            },
          ],
        })
      }

      if (url.pathname === "/local-agency/get_response_stream") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        requests.push({ path: url.pathname, body })
        return new Response("Invalid API key for OpenAI", { status: 403 })
      }

      if (url.pathname === "/local-agency/cancel_response_stream") {
        return Response.json({ cancelled: true })
      }

      return new Response("not found", { status: 404 })
    },
  })

  return {
    baseURL: `http://${server.hostname}:${server.port}`,
    requests,
    stop() {
      server.stop(true)
    },
  }
}
