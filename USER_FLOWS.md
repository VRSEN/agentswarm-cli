# Agent Swarm CLI User Flows

This is the fork-specific release QA source for the `VRSEN/agentswarm-cli` repository. Use it with `FORK_CHANGELOG.md`: the changelog records approved fork divergence, and this file turns that divergence into flows to test one by one before v1.4.32 and later releases.

Do not document upstream-only OpenCode behavior here. Generic session navigation, prompt submission, PR checkout mechanics, native provider/model management, and ordinary `gh` behavior belong upstream unless the fork changes the user outcome.

## Scope

- Launcher and install behavior for `npx @vrsen/agentswarm`, installed `agentswarm`, the direct fork binary, and `agentswarm pr`.
- Local Agency Swarm project detection, starter creation, Python environment repair, uv setup, bridge startup, resume recovery, and external Agency server connection.
- TUI Run mode routing, `/auth`, `/connect`, run-target selection, attachments, history, handoffs, dead-server recovery, and hidden upstream-native commands.
- Fork branding, tips, theme, config precedence, upgrade channel limits, share carry-forward, and developer/debug `agentswarm agency` commands.
- Out of scope: Python-side `agency.tui()` invocation before control reaches this repo.

## Release QA Matrix

Test each flow independently. For each failure scenario, capture the visible user result and cite the source pointer that explains the expected behavior.

### Launcher, Install, And Local Project Setup

#### Launcher bootstrap

- **Trigger:** Start from `npx @vrsen/agentswarm`, an installed `agentswarm`, or the direct fork binary.
- **Happy-path proof:** The wrapper finds the fork package or platform binary, sets or preserves `AGENTSWARM_LAUNCHER=1`, and opens the default TUI command with Agent Swarm branding.
- **Failure scenarios to test:** Missing fork package or platform binary fails before the TUI opens; the end-user path does not rely on the unapproved local `dist/` fallback.
- **Owner/source:** `packages/opencode/bin/agentswarm-npx`, `packages/opencode/bin/agentswarm`, `packages/opencode/package.json`, `packages/opencode/script/postinstall.mjs`, `packages/opencode/script/publish.ts`.

#### Detected local project, venv, and uv

- **Trigger:** Launch from a directory containing `agency.py` with `def create_agency` and an `agency_swarm` import.
- **Happy-path proof:** Onboarding offers `Use detected Agency Swarm project` first, reuses a healthy `.venv`, rebuilds a broken `.venv` when Python 3.12+ is available, installs or repairs launcher-managed uv inside `.venv`, respects `requirements.txt` or `pyproject.toml` pins with local uv, avoids a second unpinned `agency-swarm` upgrade, and uses launcher-managed `agency-swarm[fastapi,litellm]` only when no manifest exists.
- **Failure scenarios to test:** Missing Python 3.12+, failed imports, uv install or repair failure, and dependency setup failure produce a visible launcher failure.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### Prompt, agent, and agency-swarm model auto project launch

- **Trigger:** Launch from a detected Agency project with `--prompt`, `--agent`, or an explicit `agency-swarm/...` model. Generic upstream prompt submission stays upstream; this row covers only fork-owned project detection and Run-mode setup before that prompt runs.
- **Happy-path proof:** Interactive onboarding is skipped, the detected project is prepared, the local bridge and session-scoped Agency config are ready before the TUI opens, `--agent` and `agency-swarm/...` model args are applied, and one-shot `--prompt` submits after sync and model state are ready.
- **Failure scenarios to test:** Non-Agency explicit models do not trigger fork auto-project setup; missing or broken detected projects fail through the local project setup failure path before prompt launch.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/src/cli/cmd/tui/thread.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/routes/home.tsx`.

#### Starter project

- **Trigger:** Launch without a detected project and choose `Create a new starter project`.
- **Happy-path proof:** Empty, unsafe, or already-used project names are rejected; the starter uses `agency-ai-solutions/agency-starter-template`; GitHub template creation is used only when `gh` is present and authenticated; otherwise local clone mode is used; the new project then enters the local project setup flow.
- **Failure scenarios to test:** Clone failure, template creation failure, or later local setup failure is visible and does not leave the user in a partial TUI launch.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### Resume local Agency session

- **Trigger:** Start the fork with an upstream-owned resume or continue entry that references an Agency run session.
- **Happy-path proof:** The saved local Agency project is recovered only when the run-session directory still matches the session directory; legacy local Agency history is recovered only for loopback local-agency sessions; the recovered project is prepared before the TUI opens.
- **Failure scenarios to test:** Stale run-session records are ignored; non-Agency sessions stay on the upstream resume path without fork project recovery.
- **Owner/source:** `packages/opencode/src/agency-swarm/run-session.ts`, `packages/opencode/src/agency-swarm/npx.ts`.

### Connect, Bridge, And Server Failures

#### Onboarding connect to existing agency

- **Trigger:** Launch without a detected project and choose `Connect to an existing agency`.
- **Happy-path proof:** The launcher prompts for Agency Swarm base URL and optional bearer token, normalizes and validates the URL, discovers agencies, auto-picks one agency or asks for an agency id when several exist, and builds session-scoped config for the selected server.
- **Failure scenarios to test:** Invalid URL blocks continue; discovery failure falls back to manual agency id instead of aborting.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### In-TUI `/connect`

- **Trigger:** Run `/connect`, choose connect from the command palette, or hit a connect-class session error.
- **Happy-path proof:** The dialog shows known local servers, manual local-port entry, token set, and token clear options; it persists base URL, selected agency, selected agent, token state, and local-server memory in the intended stores; sync reboots after the selected connection changes.
- **Failure scenarios to test:** Invalid local-port input and unavailable selected servers are visible; agent discovery failures keep `/connect` available.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`.

#### Local bridge and server recovery

- **Trigger:** A prepared local project starts the FastAPI bridge, or a Run mode session loses its Agency server.
- **Happy-path proof:** The local bridge starts, the TUI opens in Run mode against `local-agency`, bridge error frames surface as real session errors, and the connection monitor opens reconnect when a local server dies.
- **Failure scenarios to test:** Bridge exit or bridge timeout is visible; server reachability or server-authorization failure opens `/connect`; agent discovery failure offers `/connect`.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`.

### Auth And Credential Failures

#### Startup `/auth`

- **Trigger:** Startup reaches Run mode without usable credentials for the needed Agency flow, or the user runs `/auth`.
- **Happy-path proof:** `/auth` stays separate from `/connect`; Run mode shows only Agency-supported provider auth options; explicit `client_config` credentials are accepted; removable stored credentials can be removed; prompt input is blocked while the auth modal owns focus; Esc closes the modal.
- **Failure scenarios to test:** Bearer tokens for the Agency server do not satisfy upstream provider auth; unsupported provider auth methods stay hidden in Run mode.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.

#### Runtime auth recovery

- **Trigger:** An Agency run fails because provider credentials are missing, rejected, or unusable.
- **Happy-path proof:** The error is classified as provider auth, copy distinguishes missing credentials from rejected credentials, and `/auth` reopens so the user can repair credentials and retry.
- **Failure scenarios to test:** Non-auth failures do not open `/auth`; connect-class failures route to `/connect`.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/session/agency-swarm.ts`.

#### Browser OAuth in Run mode

- **Trigger:** Choose an OAuth auth method from `/auth` while Run mode is active.
- **Happy-path proof:** Provider OAuth starts, the default browser is attempted, and the sign-in URL remains visible.
- **Failure scenarios to test:** Browser-launch failure shows inline error text and a warning toast, and does not silently close or strand the auth dialog.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`.

### Run-Mode Routing, Attachments, History, And Handoff

#### Run-mode routing and command limits

- **Trigger:** The current provider, model, config, or agent defaults resolve to Agency Swarm framework mode.
- **Happy-path proof:** Prompts route through the Agency Swarm adapter; swarms and agents are discovered from the backend; selecting a swarm routes through the default agency path without a stale explicit recipient; selecting an agent routes the next prompt to that agent; compatible configured provider credentials are passed through the credential bridge; in-flight Agency runs cancel through the bridge; Codex OAuth is stripped from non-OpenAI LiteLLM agency runs; Run mode hides Builder, Plan, `/editor`, `/variants`, `/init`, `/review`, and other disabled upstream-native surfaces; `/models` and `/auth` are limited to Agency-supported providers; `agency-swarm/default` stays active over stale stored model state until the user changes it; live agency names appear in run-target labels; Tab cycles run targets.
- **Failure scenarios to test:** Agent discovery failure offers `/connect`; server reachability or authorization failure opens `/connect`; provider credential failure opens `/auth`; non-OpenAI LiteLLM agency runs do not receive Codex OAuth credentials while OpenAI-based LiteLLM runs still keep them.
- **Owner/source:** `packages/opencode/src/agency-swarm/adapter.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`, `packages/opencode/src/cli/cmd/tui/context/local.tsx`, `packages/opencode/src/cli/cmd/tui/util/agency-target.ts`.

#### Builder and Plan instruction preservation

- **Trigger:** Builder or Plan flows are exercised outside the current Run-mode hiding.
- **Happy-path proof:** Builder still uses fork-specific Agency Swarm repo instructions, and Plan still writes Agency Swarm handoff plans instead of upstream OpenCode defaults.
- **Failure scenarios to test:** Run mode keeps Builder and Plan switching hidden, and any re-enabled Builder or Plan path keeps the fork-specific prompt instructions.
- **Owner/source:** `packages/opencode/src/session/agent-builder.ts`, `packages/opencode/src/session/agent-planner.ts`, `packages/opencode/src/session/prompt/agent-builder.txt`, `packages/opencode/src/session/prompt/agent-planner.txt`.

#### Attachments, history, and handoff

- **Trigger:** A Run mode prompt includes attached files or pasted images, a backend handoff changes control, session history compacts, a local Agency server URL or port changes, or Agency tool outputs return.
- **Happy-path proof:** Structured-capable Agency runs receive files and images as structured `message` content; older backends receive legacy `file_urls` payloads; attached file and image context stays available across follow-up prompts without requiring reattachment; manual history replay may resend inline attachment content or references; handoff-selected recipient agents persist across turns; ordinary `SendMessage` delegation does not change user control; caller agent identity survives history compaction; loopback history recovers across local server URL or port changes; Agency tool-output metadata stays attached to the correct wrapper call.
- **Failure scenarios to test:** Structured-capability mismatch uses the legacy payload instead of dropping attachments; history compaction does not lose caller agent identity; local loopback URL or port changes do not strand prior history.
- **Owner/source:** `packages/opencode/src/session/agency-swarm-utils.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/agency-swarm/history.ts`.

### Sharing, PR Reopen, And Backend Management

#### Share carry-forward and PR reopen

- **Trigger:** Share or unshare a session, or run `agentswarm pr <number>` on a PR body containing `https://opncd.ai/s/<id>`.
- **Happy-path proof:** `/share` remains available through the approved upstream-compatible `https://opncd.ai` service; README-level user docs warn not to share sessions containing secrets, private code, private customer data, or credentials; PR checkout relaunches `agentswarm`, not `opencode`; PR share import uses the fork command and resumes the imported session when import succeeds.
- **Failure scenarios to test:** Failed share import does not block opening the checked-out PR branch.
- **Owner/source:** `packages/opencode/src/share/share-next.ts`, `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, `packages/opencode/src/cli/cmd/pr.ts`, `README.md`.

#### Backend management commands

- **Trigger:** Run `agentswarm agency ...`.
- **Happy-path proof:** The command group is treated as developer/debug surface, not primary end-user onboarding; `connect` stores normalized backend config and optional bearer token; `agencies` discovers available agencies; `use` pins a default agency id; `agent` provides Agent Builder scaffold helpers.
- **Failure scenarios to test:** URL normalization and discovery failures surface in the CLI command; `agentswarm agency agent new` fails visibly when `agency-swarm create-agent-template` fails.
- **Owner/source:** `packages/opencode/src/cli/cmd/agency.ts`.

### Branding, Config, Upgrade, And Visual Checks

#### Branding, config, upgrade, and release visuals

- **Trigger:** Any release candidate build.
- **Happy-path proof:** User-facing surfaces use Agent Swarm naming, `agentswarm`, fork tips, and the Agent Swarm wordmark; mDNS help/defaults use `agentswarm.local` and publish `agentswarm-<port>` service names; uninstall help uses Agent Swarm wording and does not claim Homebrew, Chocolatey, Scoop, Yarn, pnpm, or Bun uninstall support; the TUI starts on the supported dark palette and does not expose unsupported theme changes; same-level `agentswarm` config files win over same-level legacy `opencode` files; legacy files still load when branded files are absent; upgrade supports npm only.
- **Failure scenarios to test:** Yarn, pnpm, Bun, Homebrew, Chocolatey, Scoop, and curl upgrade paths return clear unsupported upgrade method messages.
- **Owner/source:** `packages/opencode/src/agency-swarm/product.ts`, `packages/opencode/src/cli/logo.ts`, `packages/opencode/src/cli/ui.ts`, `packages/opencode/src/cli/network.ts`, `packages/opencode/src/server/mdns.ts`, `packages/opencode/src/cli/cmd/uninstall.ts`, `packages/opencode/src/cli/cmd/tui/component/logo.tsx`, `packages/opencode/src/cli/cmd/tui/context/theme.tsx`, `packages/opencode/src/config/paths.ts`, `packages/opencode/src/config/config.ts`, `packages/opencode/src/cli/cmd/tui/config/tui.ts`, `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/upgrade.ts`.

## Related Evidence

- Approved fork scope: `FORK_CHANGELOG.md`.
- Terminal E2E coverage notes: `e2e/agent-swarm-tui/QA_COVERAGE.md`.

## Tracked Gaps

- `agency.tui()` is an external Python-side trigger. This repo owns the TUI behavior after Agency Swarm framework mode is selected, but Python invocation details must be verified in the Python package before this file promises them.
