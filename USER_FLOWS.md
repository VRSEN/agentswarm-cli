# Agent Swarm CLI User Flows

This is the fork-only QA map for `agentswarm-cli`. Use it with `FORK_CHANGELOG.md`: the changelog names the approved fork divergence, while this file turns that divergence into release flows to verify.

Do not document upstream-only OpenCode behavior here. Generic session navigation, prompt submission, PR checkout mechanics, native provider/model management, and ordinary `gh` behavior belong upstream unless the fork changes the user outcome.

## Scope

- Launcher and install behavior for the `agentswarm` command.
- Local Agency Swarm project detection, Python environment repair, bridge startup, starter creation, and external server connection.
- Run mode, including Agency backend discovery, agent targeting, auth, reconnect, and hidden upstream-native commands.
- Fork branding, tips, theme, config precedence, upgrade channel limits, and session sharing carry-forward.
- Developer/debug backend management commands exposed as `agentswarm agency`.

## Entry Points

- `npx @vrsen/agentswarm`: enters the fork launcher and sets `AGENTSWARM_LAUNCHER=1`.
- Installed `agentswarm`: resolves the fork platform package or cached fork binary, then enters the default TUI command.
- Direct `agentswarm` binary: enters launcher mode when the command name or launcher env says this is the fork command.
- Launcher onboarding: offers detected local project, starter project, or existing Agency Swarm server connection.
- Resume and continue: reuse saved local Agency project context before the TUI opens when the session was an Agency run session.
- TUI Run mode: connects to Agency Swarm, hides or limits upstream-native surfaces, and routes auth or connection failures to the fork dialogs.
- `agentswarm pr <number>`: preserves fork branding and imports approved `https://opncd.ai/s/<id>` share links before reopening `agentswarm`.
- `agentswarm agency ...`: developer/debug commands for backend configuration and inspection.

## Decision Tree

1. Resolve the fork launcher.
   - The wrapper must find the fork package or platform binary.
   - Launcher mode is explicit through `AGENTSWARM_LAUNCHER=1` or inferred from the `agentswarm` command shape.
2. Decide whether onboarding runs.
   - Onboarding runs only for launcher default starts.
   - Upstream-owned flags such as session, continue, prompt, model, or agent skip onboarding.
3. Prepare an Agency target.
   - If the current directory is a valid `agency.py` project, offer it first.
   - If the user chooses starter, create a project from the approved starter template.
   - If the user chooses connect, build session-scoped Agency provider config for the selected server.
4. Prepare a local project.
   - Verify Python 3.12+ and `agency_swarm`.
   - Reuse `.venv`, or repair/create it with uv.
   - Re-run `requirements.txt` or `pyproject.toml` installs with uv when present; use launcher-managed `agency-swarm[fastapi,litellm]` only when no manifest exists.
   - Start the local FastAPI bridge and point the TUI at `local-agency`.
5. Recover local project context for resume.
   - Use the fork run-session record when its saved directory still matches the session directory.
   - Fall back only for legacy local Agency history.
   - Do not document upstream-owned fork or navigation semantics here.
6. Enter Run mode.
   - Use Agency Swarm provider config, agent defaults, or current provider state to compute framework mode.
   - Hide or limit upstream-native commands, model choices, auth providers, and mode switching while framework mode is active.
   - Route prompts through the Agency Swarm adapter.
7. Recover from runtime failures.
   - Provider credential failures open `/auth`.
   - Agency server reachability or authorization failures open `/connect`.
   - Dead local server monitoring opens reconnect instead of leaving the session broken.

## Release QA Flows

### Launcher Bootstrap

- Trigger: start from `npx @vrsen/agentswarm`, an installed `agentswarm`, or the direct fork binary.
- Expected path:
  - Resolve the fork wrapper or platform binary.
  - Set or preserve `AGENTSWARM_LAUNCHER=1`.
  - Start the default TUI command with Agent Swarm branding.
- Expected failures:
  - Missing fork package or platform binary fails before the TUI opens.
  - The launcher must not rely on the unapproved local `dist/` fallback as an end-user path.

### Detected Local Project

- Trigger: launch from a directory containing `agency.py` with `def create_agency` and an `agency_swarm` import.
- Expected path:
  - Offer `Use detected Agency Swarm project` as the first onboarding choice.
  - Reuse a healthy `.venv`.
  - Re-run `requirements.txt` or `pyproject.toml` installs with uv while respecting pins, without a second unpinned `agency-swarm` upgrade.
  - Use uv for launcher-managed fallback installs into `.venv`.
  - Rebuild a broken `.venv` when Python 3.12+ is available.
  - Start the local FastAPI bridge and open the TUI in Run mode against `local-agency`.
- Expected failures:
  - Missing Python 3.12+, failed imports, bridge exit, or bridge timeout produces a visible launcher failure.

### Starter Project

- Trigger: launch without a detected project and choose `Create a new starter project`.
- Expected path:
  - Reject empty, unsafe, or already-used project names.
  - Use `agency-ai-solutions/agency-starter-template`.
  - Prefer GitHub template creation only when `gh` is present and authenticated; otherwise use local clone mode.
  - Hand the new project to local project preparation.
- Expected failures:
  - Clone, template creation, or later local bridge failures are visible and do not leave the user in a partial TUI launch.

### Onboarding Connect

- Trigger: launch without a detected project and choose `Connect to an existing agency`.
- Expected path:
  - Prompt for Agency Swarm base URL and optional bearer token.
  - Normalize and validate the URL.
  - Discover agencies, auto-pick one agency, or ask for an agency id when several exist.
  - Build session-scoped config for the selected Agency server.
- Expected failures:
  - Invalid URL blocks continue.
  - Discovery failure falls back to manual agency id instead of aborting.

### In-TUI `/connect`

- Trigger: run `/connect`, choose connect from the command palette, or hit a connect-class session error.
- Expected path:
  - Show known local servers, manual local-port entry, token set, and token clear options.
  - Persist base URL, selected agency, selected agent, token state, and local-server memory in the intended stores.
  - Re-bootstrap sync after the selected connection changes.
- Expected failures:
  - Invalid local-port input and unavailable selected servers are visible.
  - Agent discovery failures keep `/connect` available.

### Resume Local Agency Session

- Trigger: start the fork with an upstream-owned resume or continue entry that references an Agency run session.
- Expected path:
  - Recover the saved local Agency project only when the run-session directory still matches the session directory.
  - Recover legacy local Agency history only for loopback local-agency sessions.
  - Prepare the recovered project before opening the TUI.
- Expected failures:
  - Stale run-session records are ignored.
  - Non-Agency sessions stay on the upstream resume path without fork project recovery.

### Startup `/auth`

- Trigger: startup reaches Run mode without usable credentials for the needed Agency flow, or the user runs `/auth`.
- Expected path:
  - Keep `/auth` separate from `/connect`.
  - In Run mode, show only Agency-supported provider auth options.
  - Accept explicit `client_config` credentials when present.
  - Allow removable stored credentials to be removed from `/auth`.
  - Keep prompt input blocked while the auth modal owns focus, and close the modal on Esc.
- Expected failures:
  - Bearer tokens for the Agency server do not satisfy upstream provider auth.
  - Unsupported provider auth methods stay hidden in Run mode.

### Runtime Auth Recovery

- Trigger: an Agency run fails because provider credentials are missing, rejected, or unusable.
- Expected path:
  - Classify the error as provider auth, not server connection.
  - Show copy that distinguishes missing credentials from rejected credentials.
  - Reopen `/auth` so the user can repair credentials and retry.
- Expected failures:
  - Non-auth failures do not open `/auth`.
  - Connect-class failures route to `/connect`.

### Run Mode

- Trigger: the current provider, model, config, or agent defaults resolve to Agency Swarm framework mode.
- Expected path:
  - Route prompts through the Agency Swarm adapter.
  - Discover swarms and agents from the backend.
  - Selecting a swarm routes through the default agency path without a stale explicit recipient; selecting an agent routes the next prompt to that agent.
  - Send attached files and pasted images to structured-capable Agency runs as structured `message` content; older backends use legacy `file_urls` payloads.
  - Keep attached file and image context available across follow-up prompts without requiring the user to attach the same file again; manual history replay may resend inline attachment content or references.
  - Pass compatible configured provider credentials into Agency runs through the credential bridge.
  - Cancel in-flight Agency runs through the Agency Swarm bridge.
  - Preserve handoff-selected recipient agents across turns while keeping ordinary `SendMessage` delegation from changing user control.
  - Preserve caller agent identity during history compaction.
  - Recover loopback history across local Agency server URL or port changes.
  - Surface bridge error frames as session errors.
  - Strip Codex OAuth from non-OpenAI LiteLLM agency runs.
  - Preserve Agency tool-output metadata.
  - Hide Builder, Plan, `/editor`, `/variants`, `/init`, `/review`, and other upstream-native surfaces that are disabled in Run mode.
  - Limit `/models` and `/auth` to Agency-supported providers.
  - Keep `agency-swarm/default` active over stale stored model state until the user changes it.
  - Use live agency names in run-target labels, and cycle run targets with Tab.
- Expected failures:
  - Agent discovery failure offers `/connect`.
  - Server reachability or server-authorization failure opens `/connect`.
  - Provider credential failure opens `/auth`.

### Browser OAuth In Run Mode

- Trigger: choose an OAuth auth method from `/auth` while Run mode is active.
- Expected path:
  - Start provider OAuth.
  - Try to open the default browser.
  - Keep the sign-in URL visible.
  - Show inline error text and a warning toast when browser launch fails.
- Expected failures:
  - Browser-launch failure must not silently close or strand the auth dialog.

### Share Carry-Forward And PR Reopen

- Trigger: share or unshare a session, or run `agentswarm pr <number>` on a PR body containing `https://opncd.ai/s/<id>`.
- Expected path:
  - `/share` remains available through the approved upstream-compatible `https://opncd.ai` service.
  - README-level user docs warn not to share sessions containing secrets, private code, private customer data, or credentials.
  - PR checkout relaunches `agentswarm`, not `opencode`.
  - PR share import uses the fork command and resumes the imported session when import succeeds.
- Expected failures:
  - Failed share import does not block opening the checked-out PR branch.

### Backend Management

- Trigger: run `agentswarm agency ...`.
- Expected path:
  - Treat this group as developer/debug surface, not the primary end-user onboarding path.
  - `connect` stores normalized backend config and optional bearer token.
  - `agencies` discovers available agencies.
  - `use` pins a default agency id.
  - `agent` provides Agent Builder scaffold helpers.
- Expected failures:
  - URL normalization and discovery failures surface in the CLI command.

### Branding, Config, Upgrade, And Visual Checks

- Trigger: any release candidate build.
- Expected path:
  - User-facing surfaces use Agent Swarm naming, `agentswarm`, the fork tips, and the Agent Swarm wordmark.
  - The TUI starts on the supported dark palette and does not expose unsupported theme changes.
  - Same-level `agentswarm` config files win over same-level legacy `opencode` files; legacy files still load when branded files are absent.
  - Upgrade supports only published fork channels: npm, pnpm, bun, and curl.
- Expected failures:
  - Yarn, Homebrew, Chocolatey, and Scoop upgrade paths return clear unsupported-channel messages.

## Source Of Truth Map

- Approved fork scope: `FORK_CHANGELOG.md`.
- Terminal E2E coverage notes: `e2e/agent-swarm-tui/QA_COVERAGE.md`.
- Fork product naming, command, tips, and logo: `packages/opencode/src/agency-swarm/product.ts`, `packages/opencode/src/cli/logo.ts`, `packages/opencode/src/cli/cmd/tui/component/logo.tsx`.
- Launcher wrappers and platform-package resolution: `packages/opencode/bin/agentswarm-npx`, `packages/opencode/bin/agentswarm`, `packages/opencode/package.json`, `packages/opencode/script/postinstall.mjs`, `packages/opencode/script/publish.ts`.
- Launcher onboarding, project detection, starter creation, Python repair, and bridge startup: `packages/opencode/src/agency-swarm/npx.ts`.
- Run-session recovery: `packages/opencode/src/agency-swarm/run-session.ts`.
- Agency adapter, history, and run behavior: `packages/opencode/src/agency-swarm/adapter.ts`, `packages/opencode/src/agency-swarm/history.ts`, `packages/opencode/src/session/agency-swarm.ts`.
- Run mode, auth, connect, agent, model, theme, and dead-server recovery: `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`, `packages/opencode/src/cli/cmd/tui/context/local.tsx`, `packages/opencode/src/cli/cmd/tui/context/theme.tsx`, `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`, `packages/opencode/src/cli/cmd/tui/util/agency-target.ts`.
- Builder and Plan fork instructions: `packages/opencode/src/session/agent-builder.ts`, `packages/opencode/src/session/agent-planner.ts`, `packages/opencode/src/session/prompt/agent-builder.txt`, `packages/opencode/src/session/prompt/agent-planner.txt`.
- Config precedence: `packages/opencode/src/config/paths.ts`, `packages/opencode/src/config/config.ts`, `packages/opencode/src/cli/cmd/tui/config/tui.ts`.
- Upgrade channel limits: `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/upgrade.ts`.
- Share carry-forward and PR reopen: `packages/opencode/src/share/share-next.ts`, `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, `packages/opencode/src/cli/cmd/pr.ts`, `README.md`.
- Backend management commands: `packages/opencode/src/cli/cmd/agency.ts`.

## Tracked Gaps

- `agency.tui()` is an external Python-side trigger. This repo owns the TUI behavior after Agency Swarm framework mode is selected, but Python invocation details must be verified in the Python package before this file promises them.
