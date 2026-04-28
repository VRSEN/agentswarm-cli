# Agent Swarm CLI User Flows

Use this file when changing the fork-owned launch, resume, auth, connect, and run-mode paths in `agentswarm-cli`. Read it with `FORK_CHANGELOG.md`: that file tracks fork divergence, while this file tracks how users enter the product, which checks run, which outcomes exist, and where the owning code lives. Focus on fork-altered flows. Skip upstream-only commands unless a flow below calls into them.

## Entry Points

- `npx @vrsen/agentswarm`. Resolve `bin/agentswarm-npx`, find a local `agentswarm-cli` install, set `AGENTSWARM_LAUNCHER=1`, and exec `bin/agentswarm`.
- Installed `agentswarm`. Resolve the cached or platform binary, preserve or set `AGENTSWARM_LAUNCHER=1`, and exec the real binary.
- Direct platform binary `agentswarm`. Enter the same default TUI command. Launcher mode still turns on because the argv basename is `agentswarm`.
- `agency.tui()` from Python. Enter Run mode after an external Agency Swarm server already exists. This repo owns the connected TUI behavior, not the Python call site.
- `agentswarm pr <number>`. Check out the PR, import an `opncd.ai` session link if the PR body has one, then relaunch with `agentswarm -s <session-id>`.
- `agentswarm -s <session-id>` or `--session`. Skip onboarding. Try to map the session back to a local Agency project before the TUI opens.
- `agentswarm -c` or `--continue`. Skip onboarding. Pick the newest root session in the current directory. Optionally fork it.
- `agentswarm --prompt "<text>"`. Seed the home composer. Auto-submit after sync and model bootstrap.
- `agentswarm agency ...` or `agentswarm agencii ...`. Manage the stored Agency Swarm backend, agency selection, and recipient-agent defaults without opening the TUI first.

## Decision Tree

1. Enter `TuiThreadCommand` as the default command. Reject `--fork` unless `--continue` or `--session` is also present.
2. Resolve the target directory. Use `PWD` for relative `project` arguments. Normalize to an absolute path before any launch checks.
3. Decide whether launcher onboarding is allowed.
   - `shouldRunNpxOnboarding()` returns true only when launcher mode is active and the user did not pass `--model`, `--continue`, `--session`, `--prompt`, or `--agent`.
   - `isLauncher()` returns true when `AGENTSWARM_LAUNCHER=1` or the argv basename is `agentswarm`.
4. Resolve an automatic Agency project when onboarding is skipped.
   - `--session`: load that session. Run `resolveRunProject()`. Reuse a persisted local-project mapping when one exists. Fall back to legacy local Agency history when needed.
   - `--continue`: list recent root sessions in the current directory. Pick the newest one. Reuse its project mapping when possible. If no session exists and the user did not ask to fork, probe the current directory for an Agency project.
   - `--prompt`, `--agent`, or an explicit `agency-swarm/...` model: probe the current directory for an Agency project.
5. Prepare launch state.
   - `prepareNpxLaunch()` handles default onboarding. It always shows `chooseLaunchChoice(project)`. When a project is detected it is the first/default option (`Use detected Agency Swarm project`); remaining options are `starter` and `connect`.
   - `prepareProjectLaunch()` ensures Python, reuses or rebuilds `.venv`, starts the local FastAPI bridge, builds session-scoped config, and sets `AGENTSWARM_RUN_PROJECT`.
   - `prepareRemoteLaunch()` stores a session-scoped base URL, optional bearer token, and chosen agency id.
6. Start the TUI.
   - Inject `OPENCODE_CONFIG_CONTENT` when launch prep returns config.
   - Change into the prepared directory.
   - Use the worker-backed internal transport by default. Switch to an external local server only when network flags request it.
7. Resolve session navigation inside the TUI.
   - `--session` navigates immediately when not forking.
   - `--continue` waits for the root-session list, then navigates or forks.
   - `--session --fork` waits for full sync before forking to avoid overwrite races.
   - `--prompt` fills the home composer and auto-submits once sync and model state are ready.
8. Gate auth and connect.
   - `shouldOpenStartupAuthDialog()` can interrupt startup with `/auth`.
   - `shouldOpenAgencyAuthDialog()` reopens `/auth` on provider-credential failures.
   - `shouldOpenAgencyConnectDialog()` reopens `/connect` on bridge reachability or server-authorization failures.
9. Land in one of six outcomes.
   - Auto-start a detected local project.
   - Create and start a starter project.
   - Connect to an existing agency server.
   - Resume a known session.
   - Fork a known session.
   - Fail early with a launcher or bridge error.

## Flows

### Launcher Bootstrap

- Name: Resolve the wrapper and enter launcher mode.
- When it triggers: Start with `npx @vrsen/agentswarm`, the installed `agentswarm` script, or the direct platform binary.
- Preconditions: The JS wrapper can find `agentswarm-cli` or a platform binary. The platform package for the current OS and CPU exists.
- Step-by-step:
  - Let `agentswarm-npx` walk upward until it finds `node_modules/agentswarm-cli/bin/agentswarm`.
  - Let `agentswarm` prefer `AGENTSWARM_BIN_PATH`, then the cached `.agentswarm` binary, then a platform package from `node_modules`, then a local `dist/` build.
  - Set or preserve `AGENTSWARM_LAUNCHER=1`.
  - Enter the default TUI command from `src/index.ts`.
- End state: The default TUI command runs in launcher mode.
- Notable error paths:
  - Abort if the `@vrsen/agentswarm` wrapper cannot find `agentswarm-cli`.
  - Abort if the installed wrapper cannot find a matching platform binary.

### Auto-Start Detected Local Project

- Name: Auto-start a local Agency project.
- When it triggers: Start in launcher mode from a directory that contains a valid `agency.py`.
- Preconditions: The current directory itself, not a parent or child directory, has `agency.py` with both `def create_agency` and an `agency_swarm` import.
- Step-by-step:
  - Detect the project with `detectAgencyProject()`.
  - Probe `.venv` first.
  - Reuse `.venv` when it is healthy.
  - Upgrade `agency-swarm[fastapi,litellm]` inside an existing `.venv`.
  - Run the venv canary import.
  - If the canary fails, wipe `.venv`, find Python 3.12+, rebuild `.venv`, and reinstall dependencies.
  - If no `.venv` exists, ask whether to create one. If the user declines, verify that the chosen Python can already import `agency_swarm`.
  - Start a local FastAPI bridge on a free port. Wait for `/<local-agency>/get_metadata` to answer.
  - Build session-scoped config that points the TUI at `local-agency`.
- End state: The TUI opens in the project directory and talks to the local bridge.
- Notable error paths:
  - Fail if Python 3.12+ is missing.
  - Fail if the selected non-venv Python cannot import `agency_swarm`.
  - Fail if the bridge exits early or does not answer before timeout.
  - Fail if a corrupted `.venv` exists and no replacement Python can rebuild it.

### Create Starter Project

- Name: Create and start a starter project.
- When it triggers: Start in launcher mode, detect no current project, and choose `starter`.
- Preconditions: The target folder name is unused. GitHub template mode also needs `gh --version` and `gh auth status` to succeed.
- Step-by-step:
  - Prompt for the project or repository name.
  - Validate the name and reject existing folders.
  - Offer `github` or `local` starter creation when `gh` is ready. Otherwise force `local`.
  - `github`: run `gh repo create <name> --template agency-ai-solutions/agency-starter-template --clone --<visibility>`.
  - `local`: clone the template repo, remove `.git`, then run `git init -b main`.
  - Hand the new directory to `prepareProjectLaunch()`.
- End state: A new starter project exists and the TUI opens against its local bridge.
- Notable error paths:
  - Reject a reused folder name before clone or repo creation.
  - Fail if `gh repo create` fails.
  - Fail if `git clone` fails.
  - Bubble up any later project-launch failure.

### Onboarding Connect To An Existing Agency

- Name: Connect during onboarding.
- When it triggers: Start in launcher mode, detect no current project, and choose `connect`.
- Preconditions: The user knows a base URL. Some servers also need a bearer token or an explicit agency id.
- Step-by-step:
  - Prompt for the Agency Swarm base URL.
  - Optionally prompt for a bearer token.
  - Normalize the URL.
  - Try discovery against that server.
  - Auto-pick the agency when discovery returns one agency.
  - Prompt for an agency id when discovery returns many agencies.
  - Fall back to a manual agency-id prompt when discovery fails.
  - Build session-scoped config for the selected agency.
- End state: The TUI opens against the selected existing server.
- Notable error paths:
  - Reject malformed URLs.
  - Cancel cleanly on any prompt cancel.
  - Fall back to manual agency id when discovery fails instead of aborting.

### In-TUI `/connect`

- Name: Change the Agency server from inside the TUI.
- When it triggers: Run `/connect`, use the command palette, pick `Open /connect` from agent discovery failure, or hit a session error that maps to connect recovery.
- Preconditions: The TUI is already open.
- Step-by-step:
  - Poll known local servers by fetching `openapi.json`.
  - Show available servers, local-port add flow, token set flow, and token clear flow.
  - Persist the selected base URL, agency, recipient agent, and local-server memory in global config.
  - Persist the bearer token through the auth store when needed.
  - Dispose the current instance and re-bootstrap sync.
- End state: The current TUI reconnects with updated local-server settings.
- Notable error paths:
  - Warn when a selected server is unavailable.
  - Warn on invalid local-port input.
  - Keep discovery failures visible and offer `/connect` again from agent selection.

### Resume Explicit Session

- Name: Resume a specific session with `--session`.
- When it triggers: Start with `agentswarm -s <id>` or reopen from `agentswarm pr <number>` after a share import.
- Preconditions: The user passes a session id. Launcher mode is needed if project auto-recovery should run before the TUI opens.
- Step-by-step:
  - Load the session metadata.
  - Try `AgencySwarmRunSession.get(session.id)`.
  - Require the stored run directory to match the session directory before trusting it.
  - Fall back to legacy local Agency history when no modern run-session record exists.
  - If a project is recovered, run `prepareProjectLaunch()` before the TUI starts.
  - In the TUI, navigate directly when `--fork` is absent.
  - In the TUI, wait for full sync and fork when `--fork` is present.
- End state: The requested session or its fork opens, optionally with a recovered local bridge.
- Notable error paths:
  - Ignore stale run-session records when the stored directory and session directory do not match.
  - Skip project recovery when the session was not an Agency run session.
  - Let later sync or routing own invalid-session behavior after startup.

### Fork A Known Session

- Name: Fork a known session before sending new work.
- When it triggers: Start with `agentswarm -s <id> --fork` or `agentswarm -c --fork`.
- Preconditions: A base session exists and finishes enough sync to fork safely.
- Step-by-step:
  - Resolve the base session from `--session` or the newest root session in the current directory.
  - Recover any matching local Agency project before the TUI opens.
  - Wait for full sync in the TUI instead of navigating immediately.
  - Fork the base session only after sync completes.
  - Open the new forked session.
- End state: A forked child session opens with the source session preserved.
- Notable error paths:
  - Reject `--fork` at CLI parse time unless `--session` or `--continue` is also present.
  - Do not probe the current directory for a project when `--continue --fork` has no base session to fork.

### Continue Last Session In The Current Directory

- Name: Continue the newest root session with `--continue`.
- When it triggers: Start with `agentswarm -c` or `agentswarm --continue`, with optional `--fork`.
- Preconditions: A recent root session exists in the current directory, or the current directory is itself an Agency project.
- Step-by-step:
  - List root sessions from the last 30 days in the current directory.
  - Pick the newest root session.
  - Try to recover a local project through the run-session record.
  - If no session exists and `--fork` is absent, probe the current directory for an Agency project.
  - In the TUI, navigate to the newest root session when not forking.
  - In the TUI, fork the newest root session when `--fork` is present.
- End state: The last session opens, a fork opens, or the current project launches after the user confirms the detected-project option.
- Notable error paths:
  - Open the normal home screen when no eligible session and no project exist.
  - Skip the directory probe when `--fork` is present but no base session exists.

### `--prompt` One-Shot Submit

- Name: Seed and auto-send a prompt from the CLI.
- When it triggers: Start with `agentswarm --prompt "<text>"`. Pipe stdin into the process. Use both together.
- Preconditions: The TUI reaches the home composer or creates a fresh session on first send.
- Step-by-step:
  - Merge piped stdin into the prompt text when stdin is not a TTY.
  - Run the same project auto-resolution as other non-onboarding launcher paths.
  - Bind the prompt into the home composer.
  - Wait for sync readiness and local model readiness.
  - Auto-submit once the composer still matches the requested prompt.
  - Create a new session when needed.
  - Sync the run-session record before the prompt call.
  - Navigate to the session immediately after creation so the first stream does not stay on the splash screen.
- End state: The first message streams in the session view.
- Notable error paths:
  - Block the send and open `/auth` when framework mode lacks supported credentials.
  - Restore the composer text when the first prompt fails.
  - Delete the just-created empty session when the first prompt fails with an auth error.

### Startup `/auth` And Auth Management

- Name: Open and manage auth.
- When it triggers: Startup sees no usable provider. Framework mode sees no supported OpenAI or Anthropic credential. The user also can run `/auth` or `/logout` manually.
- Preconditions: Sync is complete. The TUI can compute framework mode from config, agent defaults, or the current provider.
- Step-by-step:
  - Run `shouldOpenStartupAuthDialog()`.
  - In normal mode, require any usable provider.
  - In framework mode, require supported upstream credentials or explicit `client_config` credentials.
  - Open `DialogAuth`.
  - Filter visible auth providers to OpenAI and Anthropic in framework mode.
  - Offer `Remove credential` when removable stored credentials exist.
  - After auth in framework mode, offer model selection for the just-authenticated provider.
- End state: Supported credentials exist and the user can retry the launch or prompt.
- Notable error paths:
  - Keep unsupported provider auth methods hidden in framework mode.
  - Distinguish stored provider credentials from bridge bearer tokens. A bridge token does not satisfy upstream provider auth when forwarding is active.

### Runtime Auth Recovery

- Name: Reopen `/auth` after provider auth failures.
- When it triggers: The first send or a later session error matches provider-credential failure patterns.
- Preconditions: The current session is in Agency framework mode or is explicitly using the Agency provider.
- Step-by-step:
  - Classify the error with `shouldOpenAgencyAuthDialog()`.
  - Turn raw provider failures into actionable messages with `describeAgencyAuthFailure()`.
  - Show an error toast.
  - Reopen `DialogAuth`.
- End state: The user can repair credentials and retry the message.
- Notable error paths:
  - Let non-auth errors fall through to the raw error toast.
  - Keep connect failures out of this path and send them to `/connect` instead.

### Run Mode From `agency.tui()` Or An Existing Server Connection

- Name: Enter Run mode.
- When it triggers: The TUI connects to a running Agency server through external `agency.tui()` behavior or through a stored/selected Agency connection.
- Preconditions: Config, agent defaults, or the current provider resolve to Agency Swarm framework mode.
- Step-by-step:
  - Compute framework mode with `isAgencySwarmFrameworkMode()`.
  - Filter auth to supported providers.
  - Hide `/editor`, `/variants`, `/init`, `/review`, and some model controls while framework mode stays active.
  - Route prompts through the Agency provider.
  - Let agent selection discover agencies and recipient agents from the backend.
  - Offer `/connect` when discovery fails.
- End state: The TUI behaves as a connected Agency run surface instead of a local Agent Builder-only surface.
- Notable error paths:
  - Reopen `/connect` on reachability or server-authorization failures.
  - Reopen `/auth` on provider-credential failures.

### Browser OAuth In Framework Mode

- Name: Launch browser OAuth for supported providers.
- When it triggers: Pick an OAuth-capable auth method from `DialogAuth` while framework mode is active.
- Preconditions: The provider exposes an OAuth auth method. The OS can launch the default browser.
- Step-by-step:
  - Start the provider OAuth authorization flow.
  - Try to open the default browser automatically.
  - Watch the spawned browser-open subprocess for failure.
  - Show inline error text and a warning toast if browser launch fails.
  - Keep the auth dialog open so the user can continue manually from the link.
- End state: The OAuth flow continues in the browser, or the user gets a visible manual fallback.
- Notable error paths:
  - Surface browser-launch failures directly instead of failing silently.
  - Keep the sign-in URL visible even when automatic browser open fails.

### GitHub PR Deep Link

- Name: Check out a PR and reopen its linked session.
- When it triggers: Run `agentswarm pr <number>`.
- Preconditions: Run inside a git repo. Have `gh` installed and authenticated. The PR body may contain an `https://opncd.ai/s/<id>` link.
- Step-by-step:
  - Run `gh pr checkout`.
  - Add a fork remote when the PR head is cross-repo.
  - Read the PR body.
  - If the PR body has a share link, run `agentswarm import <url>`.
  - Parse the imported session id from the import output.
  - Relaunch `agentswarm -s <session-id>` when import succeeded.
  - Otherwise relaunch plain `agentswarm`.
- End state: The checked-out PR branch opens in the TUI, optionally on the imported shared session.
- Notable error paths:
  - Abort if `gh pr checkout` fails.
  - Ignore a failed share import and continue without `-s`.

### Backend Management Command Group

- Name: Configure the backend without opening the TUI.
- When it triggers: Run `agentswarm agency ...` or `agentswarm agencii ...`.
- Preconditions: The user wants to manage backend state from the CLI.
- Step-by-step:
  - `connect`: normalize the base URL, optionally store a bearer token, set the default model to `agency-swarm/default`, and write provider config globally.
  - `agencies`: discover agencies from the configured or overridden backend.
  - `use`: pin a default agency id in config.
  - `agent`: manage Agency recipient-agent helpers.
- End state: Later TUI launches inherit the stored Agency backend settings.
- Notable error paths:
  - Fail URL normalization or discovery directly in the CLI path.
  - Preserve the legacy `agencii` name as an alias for `agency`.

## Source Of Truth Map

- Agent Swarm terminal TUI e2e coverage: `e2e/agent-swarm-tui/QA_COVERAGE.md`
- Wrapper resolution and launcher env: `packages/opencode/bin/agentswarm-npx:8-40`; `packages/opencode/bin/agentswarm:9-196`; `packages/opencode/src/index.ts:66-176`
- Default TUI entry and arg-to-launch handoff: `packages/opencode/src/cli/cmd/tui/thread.ts:84-176`; `packages/opencode/src/cli/cmd/tui/thread.ts:226-290`
- Launcher gating and project/session auto-resolution: `packages/opencode/src/agency-swarm/npx.ts:47-139`
- Project detection and onboarding branches: `packages/opencode/src/agency-swarm/npx.ts:242-545`
- Python, venv recovery, and bridge startup: `packages/opencode/src/agency-swarm/npx.ts:548-861`
- Run-session persistence for resume recovery: `packages/opencode/src/agency-swarm/run-session.ts:5-52`
- Session navigation for `--session`, `--continue`, and `--fork`: `packages/opencode/src/cli/cmd/tui/app.tsx:403-450`
- Home prompt seeding and auto-submit: `packages/opencode/src/cli/cmd/tui/routes/home.tsx:19-52`
- First-send prompt path and auth-failure rollback: `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:693-830`
- Framework-mode gating and startup auth decisions: `packages/opencode/src/cli/cmd/tui/session-error.ts:144-230`; `packages/opencode/src/cli/cmd/tui/app.tsx:452-677`; `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:306-323`
- Auth dialog, provider filtering, and removable credentials: `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx:43-120`; `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx:245-289`
- `/connect` dialog and local-server polling: `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx:339-667`
- Browser OAuth launch monitoring: `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx:669-730`
- Session-error recovery back into `/connect` or `/auth`: `packages/opencode/src/cli/cmd/tui/app.tsx:853-885`
- Agent picker behavior in framework mode: `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx:31-260`
- Footer and tip surfaces that steer users toward `/auth`: `packages/opencode/src/cli/cmd/tui/routes/session/footer.tsx:9-89`; `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx:62-69`
- `agency.tui()` Run-mode handoff note: `README.md:100-115`
- PR checkout and share-link reopen path: `packages/opencode/src/cli/cmd/pr.ts:8-126`
- Backend management alias and commands: `packages/opencode/src/cli/cmd/agencii.ts:11-120`

## Open Questions / Gaps

- `agency.tui()` Python-side trigger: silent launch with `--model agency-swarm/default`, which bypasses `shouldRunNpxOnboarding()` and may rely on `AGENTSWARM_LAUNCHER=1` when the argv basename is not `agentswarm` (e.g. custom spawn wrapper). The env var stays in the fork as the defensive path for that case.
- `agency.tui()` is external to this repo. The README documents the handoff into Run mode, but the Python-side trigger and its preconditions do not live here.
- Run mode is config-driven, not transport-driven. `isAgencySwarmFrameworkMode()` can hide `/editor`, `/models`, or `/variants` before the repo has live proof that an Agency bridge is reachable.
- `agentswarm pr <number>` only scans PR bodies for `https://opncd.ai/s/<id>` share links. The deep-link import path still carries the old share domain.
