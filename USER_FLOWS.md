# Agent Swarm CLI User Flows

This is the fork-specific release QA source for the `VRSEN/agentswarm-cli` repository.
Use it with `FORK_CHANGELOG.md`: the changelog records approved fork divergence, and this file turns that divergence into flows to test one by one before each release.

Do not document upstream-only OpenCode behavior here. Generic session navigation, prompt submission, PR checkout mechanics, native provider/model management, and ordinary `gh` behavior belong upstream unless the fork changes the user outcome.

## Scope

- Launcher and install behavior for `npx @vrsen/agentswarm`, installed `agentswarm`, the direct fork binary, and `agentswarm pr`.
- Downstream package builds that reuse this TUI foundation through generic product profile inputs.
- Local Agency Swarm project detection, starter creation, Python environment repair, uv setup, bridge startup, resume recovery, and external Agency server connection.
- TUI Run mode routing, `/auth`, `/connect`, run-target selection, attachments, history, handoffs, dead-server recovery, and hidden upstream-native commands.
- Fork branding, tips, theme, config precedence, upgrade channel limits, share carry-forward, and developer/debug `agentswarm agency` commands.
- Trust-safe telemetry metrics, event-list docs, derived dashboard metrics, opt-out behavior, and privacy proof for fork-owned Agent Swarm flows.
- Out of scope: Python-side `agency.tui()` invocation before control reaches this repo.

## Release QA Matrix

Test each flow independently.
For each failure scenario, capture the visible user result and cite the source pointer that explains the expected behavior.

### Launcher, Install, And Local Project Setup

#### Launcher bootstrap

- **Trigger:** Start from `npx @vrsen/agentswarm`, an installed `agentswarm`, or the direct fork binary.
- **Happy-path proof:** Launcher mode can be inferred from the `agentswarm` command shape or `AGENTSWARM_LAUNCHER=1`.
- **Happy-path proof:** The wrapper finds the fork package or platform binary, sets or preserves `AGENTSWARM_LAUNCHER=1`, and opens the default TUI command with Agent Swarm branding.
- **Failure scenarios to test:** Missing fork package or platform binary fails before the TUI opens.
- **Failure scenarios to test:** The end-user path does not rely on the unapproved local `dist/` fallback.
- **Owner/source:** `packages/opencode/bin/agentswarm-npx`, `packages/opencode/bin/agentswarm`, `packages/opencode/package.json`, `packages/opencode/script/postinstall.mjs`, `packages/opencode/script/publish.ts`.

#### Downstream product profile

- **Trigger:** Start from a downstream wrapper or release binary that sets `AGENTSWARM_PRODUCT_*` values.
- **Happy-path proof:** Help, upgrade, mDNS, release repository, docs, issue links, and package copy use the configured downstream values.
- **Happy-path proof:** The launcher detects configured entry files; the default Agent Swarm profile still detects only `agency.py`.
- **Happy-path proof:** A missing local project creates the configured starter repository in the configured starter folder.
- **Happy-path proof:** A release-built binary reports `AGENTSWARM_PRODUCT_VERSION` when it is set.
- **Happy-path proof:** A downstream profile can provide `AGENTSWARM_PRODUCT_ADDONS` to expose `/addons`, while the default Agent Swarm profile keeps `/addons` hidden.
- **Happy-path proof:** With `AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT=standalone`, launcher setup creates or repairs project `.venv` environments with standalone Python 3.12+ and rebuilds existing Conda-family `.venv` environments.
- **Happy-path proof:** With `AGENTSWARM_PRODUCT_STATE_ROOT`, the product project, launcher logs, and add-on `.env` reads and writes stay under the fixed product state root.
- **Failure scenarios to test:** Missing custom product values fall back to Agent Swarm defaults instead of inventing a downstream product.
- **Failure scenarios to test:** The default Agent Swarm profile does not expose `/addons`.
- **Failure scenarios to test:** With standalone Python required, a machine without standalone Python 3.12+ fails visibly instead of silently using Conda-family Python.
- **Owner/source:** `packages/opencode/src/agency-swarm/product.ts`, `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/src/cli/cmd/tui/util/env-file.ts`, `packages/opencode/src/agency-swarm/server-launcher.ts`, `packages/opencode/src/installation/distribution.ts`, and `packages/opencode/script/build.ts`.

#### Detected local project, venv, and uv

- **Trigger:** Launch from a directory containing `agency.py` with `def create_agency` and an `agency_swarm` import.
- **Happy-path proof:** Onboarding offers `Use detected Agency Swarm project` first.
- **Happy-path proof:** A healthy `.venv` is reused.
- **Happy-path proof:** A broken `.venv` is rebuilt when Python 3.12+ is available.
- **Happy-path proof:** Launcher-managed uv is installed or repaired inside `.venv`.
- **Happy-path proof:** `requirements.txt` or `pyproject.toml` pins are respected with local uv.
- **Happy-path proof:** No second unpinned `agency-swarm` upgrade runs after manifest install.
- **Happy-path proof:** Launcher-managed `agency-swarm[fastapi,litellm]` is used only when no manifest exists.
- **Happy-path proof:** Local `.venv` uv is used for launcher-managed fallback installs into `.venv`.
- **Failure scenarios to test:** Missing Python 3.12+ produces a visible launcher failure.
- **Failure scenarios to test:** Failed imports produce a visible launcher failure.
- **Failure scenarios to test:** uv install or repair failure produces a visible launcher failure.
- **Failure scenarios to test:** Dependency setup failure produces a visible launcher failure.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### Prompt, agent, and agency-swarm model auto project launch

- **Trigger:** Launch from a detected Agency project with `--prompt`, `--agent`, or an explicit `agency-swarm/...` model.
- **Boundary:** Generic upstream prompt submission stays upstream.
- **Boundary:** This row covers only fork-owned project detection and Run-mode setup before that prompt runs.
- **Happy-path proof:** Prompt, agent, and `agency-swarm/...` model starts use the auto-project path rather than interactive onboarding.
- **Happy-path proof:** The detected project is prepared before the TUI opens.
- **Happy-path proof:** The local bridge and session-scoped Agency config are ready before the TUI opens.
- **Happy-path proof:** `--agent` and `agency-swarm/...` model args are applied.
- **Happy-path proof:** One-shot `--prompt` submits after sync and model state are ready.
- **Failure scenarios to test:** Non-Agency explicit models do not trigger fork auto-project setup.
- **Failure scenarios to test:** Missing or broken detected projects fail through the local project setup failure path before prompt launch.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/src/cli/cmd/tui/thread.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/routes/home.tsx`.

#### Starter project

- **Trigger:** Launch without a detected project and choose `Create a new starter project`.
- **Happy-path proof:** Empty, unsafe, or already-used project names are rejected.
- **Happy-path proof:** The starter uses `agency-ai-solutions/agency-starter-template`.
- **Happy-path proof:** GitHub template creation is used only when `gh` is present and authenticated.
- **Happy-path proof:** Local clone mode is used when GitHub template creation is unavailable.
- **Happy-path proof:** The new project then enters the local project setup flow.
- **Failure scenarios to test:** Clone failure is visible and does not leave the user in a partial TUI launch.
- **Failure scenarios to test:** Template creation failure is visible and does not leave the user in a partial TUI launch.
- **Failure scenarios to test:** Later local setup failure is visible and does not leave the user in a partial TUI launch.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### Resume local Agency session

- **Trigger:** Start the fork with an upstream-owned resume or continue entry that references an Agency run session.
- **Happy-path proof:** Upstream-owned session or continue entries skip onboarding.
- **Happy-path proof:** The saved local Agency project is recovered only when the run-session directory still matches the session directory.
- **Happy-path proof:** Legacy local Agency history is recovered only for loopback local-agency sessions.
- **Happy-path proof:** The recovered project is prepared before the TUI opens.
- **Failure scenarios to test:** Stale run-session records are ignored.
- **Failure scenarios to test:** Non-Agency sessions stay on the upstream resume path without fork project recovery.
- **Owner/source:** `packages/opencode/src/agency-swarm/run-session.ts`, `packages/opencode/src/agency-swarm/npx.ts`.

### Connect, Bridge, And Server Failures

#### Onboarding connect to existing agency

- **Trigger:** Launch without a detected project and choose `Connect to an existing agency`.
- **Happy-path proof:** The launcher prompts for Agency Swarm base URL and optional bearer token.
- **Happy-path proof:** The launcher normalizes and validates the URL.
- **Happy-path proof:** The launcher discovers agencies.
- **Happy-path proof:** The launcher auto-picks one agency or asks for an agency id when several exist.
- **Happy-path proof:** The launcher builds session-scoped config for the selected server.
- **Failure scenarios to test:** Invalid URL blocks continue.
- **Failure scenarios to test:** Discovery failure falls back to manual agency id instead of aborting.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`.

#### In-TUI `/connect`

- **Trigger:** Run `/connect`, choose connect from the command palette, or hit a connect-class session error.
- **Happy-path proof:** The dialog shows known local servers, manual local-port entry, token set, and token clear options.
- **Happy-path proof:** It persists base URL, selected agency, selected agent, token state, and local-server memory in the intended stores.
- **Happy-path proof:** Sync reboots after the selected connection changes.
- **Failure scenarios to test:** Invalid local-port input is visible.
- **Failure scenarios to test:** Unavailable selected servers are visible.
- **Failure scenarios to test:** Agent discovery failures keep `/connect` available.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`.

#### Local bridge and server recovery

- **Trigger:** A prepared local project starts the FastAPI bridge, or a Run mode session loses its Agency server.
- **Happy-path proof:** The local bridge starts.
- **Happy-path proof:** The TUI opens in Run mode against `local-agency`.
- **Happy-path proof:** Bridge error frames surface as real session errors.
- **Happy-path proof:** The connection monitor opens reconnect when a local server dies.
- **Failure scenarios to test:** Bridge exit or bridge timeout is visible.
- **Failure scenarios to test:** Server reachability or server-authorization failure opens `/connect`.
- **Failure scenarios to test:** Agent discovery failure offers `/connect`.
- **Owner/source:** `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`.

### Auth And Credential Failures

#### Startup `/auth`

- **Trigger:** Startup reaches Run mode without usable credentials for the needed Agency flow, or the user runs `/auth`.
- **Happy-path proof:** `/auth` stays separate from `/connect`.
- **Happy-path proof:** Run mode shows only Agency-supported provider auth options.
- **Happy-path proof:** Explicit `client_config` credentials are accepted.
- **Happy-path proof:** Removable stored credentials can be removed.
- **Happy-path proof:** Prompt input is blocked while the auth modal owns focus.
- **Happy-path proof:** Esc closes the modal.
- **Failure scenarios to test:** Bearer tokens for the Agency server do not satisfy upstream provider auth.
- **Failure scenarios to test:** Unsupported provider auth methods stay hidden in Run mode.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.

#### Runtime auth recovery

- **Trigger:** An Agency run fails because provider credentials are missing, rejected, or unusable.
- **Happy-path proof:** The error is classified as provider auth.
- **Happy-path proof:** Copy distinguishes missing credentials from rejected credentials.
- **Happy-path proof:** `/auth` reopens so the user can repair credentials and retry.
- **Failure scenarios to test:** Non-auth failures do not open `/auth`.
- **Failure scenarios to test:** Connect-class failures route to `/connect`.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/session/agency-swarm.ts`.

#### Browser OAuth in Run mode

- **Trigger:** Choose an OAuth auth method from `/auth` while Run mode is active.
- **Happy-path proof:** Provider OAuth starts.
- **Happy-path proof:** The default browser is attempted.
- **Happy-path proof:** The sign-in URL remains visible.
- **Failure scenarios to test:** Browser-launch failure shows inline error text and a warning toast.
- **Failure scenarios to test:** Browser-launch failure does not silently close or strand the auth dialog.
- **Owner/source:** `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`.

### Run-Mode Routing, Attachments, History, And Handoff

#### Run-mode routing and command limits

- **Trigger:** The user starts an Agent Swarm Run-mode session, including sessions whose config or agent default still points at `agency-swarm/...`.
- **Happy-path proof:** Prompts route through the Agency Swarm adapter.
- **Happy-path proof:** Swarms and agents are discovered from the backend.
- **Happy-path proof:** Selecting a swarm routes through the default agency path without a stale explicit recipient.
- **Happy-path proof:** Selecting an agent routes the next prompt to that agent.
- **Happy-path proof:** Compatible configured provider credentials pass through the credential bridge.
- **Happy-path proof:** Provider auth stays a credential flow and does not act as a Run-mode switch.
- **Happy-path proof:** `/models` selects the LLM config passed to Agency Swarm and does not act as a product mode switch.
- **Happy-path proof:** In-flight Agency runs cancel through the bridge.
- **Happy-path proof:** Codex OAuth is stripped from non-OpenAI LiteLLM agency runs.
- **Happy-path proof:** Run mode hides Builder, Plan, `/editor`, `/variants`, `/init`, `/review`, and other disabled upstream-native surfaces.
- **Happy-path proof:** `/models` and `/auth` are limited to Agency-supported providers.
- **Happy-path proof:** Upstream provider/model state used for auth or LLM choice does not pull the user out of Run mode by accident.
- **Happy-path proof:** `agency-swarm/default` stays active over stale stored model state until the user explicitly chooses another model.
- **Happy-path proof:** Live agency names appear in run-target labels.
- **Happy-path proof:** Tab cycles run targets.
- **Failure scenarios to test:** Agent discovery failure offers `/connect`.
- **Failure scenarios to test:** Server reachability or authorization failure opens `/connect`.
- **Failure scenarios to test:** Provider credential failure opens `/auth`.
- **Failure scenarios to test:** Non-OpenAI LiteLLM agency runs do not receive Codex OAuth credentials while OpenAI-based LiteLLM runs still keep them.
- **Owner/source:** `packages/opencode/src/agency-swarm/adapter.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`, `packages/opencode/src/cli/cmd/tui/context/local.tsx`, `packages/opencode/src/cli/cmd/tui/util/agency-target.ts`.

#### Builder and Plan instruction preservation

- **Trigger:** Builder or Plan flows are exercised outside Run-mode hiding.
- **Happy-path proof:** Builder still uses fork-specific Agency Swarm repo instructions.
- **Happy-path proof:** Plan still writes Agency Swarm handoff plans instead of upstream OpenCode defaults.
- **Failure scenarios to test:** Run mode keeps Builder and Plan switching hidden.
- **Failure scenarios to test:** Any re-enabled Builder or Plan path keeps the fork-specific prompt instructions.
- **Owner/source:** `packages/opencode/src/session/agent-builder.ts`, `packages/opencode/src/session/agent-planner.ts`, `packages/opencode/src/session/prompt/agent-builder.txt`, `packages/opencode/src/session/prompt/agent-planner.txt`.

#### Attachments, history, and handoff

- **Trigger:** A Run mode prompt includes attached files or pasted images, a backend handoff changes control, session history compacts, a local Agency server URL or port changes, or Agency tool outputs return.
- **Happy-path proof:** Structured-capable Agency runs receive files and images as structured `message` content.
- **Happy-path proof:** Older backends receive legacy `file_urls` payloads.
- **Happy-path proof:** Attached file and image context stays available across follow-up prompts without requiring reattachment.
- **Happy-path proof:** Manual history replay may resend inline attachment content or references.
- **Happy-path proof:** Handoff-selected recipient agents persist across turns.
- **Happy-path proof:** Explicit current-prompt handoff recipients persist across metadata-refresh outages.
- **Happy-path proof:** Ordinary `SendMessage` delegation does not change user control.
- **Happy-path proof:** Caller agent identity survives history compaction.
- **Happy-path proof:** History compaction ignores internal Agency metadata that is not valid model provider metadata.
- **Happy-path proof:** Loopback history recovers across local server URL or port changes.
- **Happy-path proof:** Agency tool-output metadata stays attached to the correct wrapper call.
- **Failure scenarios to test:** Structured-capability mismatch uses the legacy payload instead of dropping attachments.
- **Failure scenarios to test:** History compaction does not lose caller agent identity.
- **Failure scenarios to test:** A metadata outage after an explicit current-prompt handoff recipient does not drop the next prompt back to the coordinator.
- **Failure scenarios to test:** Flat Agency metadata on text, reasoning, or tool parts does not break compaction.
- **Failure scenarios to test:** Local loopback URL or port changes do not strand prior history.
- **Owner/source:** `packages/opencode/src/session/agency-swarm-utils.ts`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/session/message-v2.ts`, `packages/opencode/src/agency-swarm/history.ts`.

### Sharing, PR Reopen, And Backend Management

#### Share carry-forward and PR reopen

- **Trigger:** Share or unshare a session, or run `agentswarm pr <number>` on a PR body containing `https://opncd.ai/s/<id>`.
- **Happy-path proof:** `/share` remains available through the approved upstream-compatible `https://opncd.ai` service.
- **Happy-path proof:** README-level user docs warn not to share sessions containing secrets, private code, private customer data, or credentials.
- **Happy-path proof:** PR checkout relaunches `agentswarm`, not `opencode`.
- **Happy-path proof:** PR share import uses the fork command and resumes the imported session when import succeeds.
- **Failure scenarios to test:** Failed share import does not block opening the checked-out PR branch.
- **Owner/source:** `packages/opencode/src/share/share-next.ts`, `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, `packages/opencode/src/cli/cmd/pr.ts`, `README.md`.

#### Backend management commands

- **Trigger:** Run `agentswarm agency ...`.
- **Happy-path proof:** The command group is treated as developer/debug surface, not primary end-user onboarding.
- **Happy-path proof:** `connect` stores normalized backend config and optional bearer token.
- **Happy-path proof:** `agencies` discovers available agencies.
- **Happy-path proof:** `use` pins a default agency id.
- **Happy-path proof:** `agent` provides Agent Builder scaffold helpers.
- **Failure scenarios to test:** URL normalization and discovery failures surface in the CLI command.
- **Failure scenarios to test:** `agentswarm agency agent new` fails visibly when `agency-swarm create-agent-template` fails.
- **Owner/source:** `packages/opencode/src/cli/cmd/agency.ts`.

### Trust-Safe Telemetry

#### Telemetry metrics and privacy contract

- **Trigger:** A release build with telemetry enabled exercises supported fork-owned flows: provider demand, provider auth start or failure, normal TUI prompt task success or failure, project initialization, and integration request.
- **Boundary:** Telemetry events outside the listed supported flows are not supported.
- **Boundary:** Agent run internals, artifacts generated, crashes, build or release failures, signup, demo, book-demo, and the Agent Swarm connect funnel are deferred.
- **Happy-path proof:** Provider demand records only the safe provider family or `custom`; raw model IDs are not sent.
- **Happy-path proof:** Provider auth start and failure events record only safe flow fields such as provider family, auth method, source, and outcome; credential material and raw error text are not sent.
- **Happy-path proof:** Normal TUI prompt task success and failure metrics record only safe task shape and outcome fields; prompt text, conversation text, source content, tool inputs, and tool outputs are not sent.
- **Happy-path proof:** Project initialized and integration requested metrics record the user action without project IDs, file paths, source data, tokens, secrets, environment variables, or external account identifiers.
- **Happy-path proof:** Event-list docs enumerate the supported telemetry events, allowed properties, opt-out controls, deferred metrics, and privacy red lines.
- **Happy-path proof:** Dashboard metrics are derived from supported events or existing safe events instead of adding separate raw-content collection.
- **Failure scenarios to test:** Telemetry opt-out blocks capture.
- **Failure scenarios to test:** Installing the package alone does not send install phone-home telemetry.
- **Failure scenarios to test:** Privacy tests fail when a payload contains raw model IDs, project IDs, file paths, prompt text, error text, source or content data, secrets, environment variables, conversation text, tool inputs, or tool outputs.
- **Failure scenarios to test:** Only supported metrics appear in event-list docs or emitted telemetry.
- **Owner/source:** `packages/opencode/src/telemetry/telemetry.ts`, TUI telemetry hooks, project setup and integration request hooks, telemetry tests, README telemetry copy, and event-list docs.

### Branding, Config, Upgrade, And Visual Checks

#### Branding, config, upgrade, and release visuals

- **Trigger:** Any release candidate build.
- **Happy-path proof:** User-facing surfaces use Agent Swarm naming, `agentswarm`, fork tips, and the Agent Swarm wordmark.
- **Happy-path proof:** mDNS help/defaults use `agentswarm.local` and publish `agentswarm-<port>` service names.
- **Happy-path proof:** Uninstall help uses Agent Swarm wording and does not claim Homebrew, Chocolatey, Scoop, Yarn, pnpm, or Bun uninstall support.
- **Happy-path proof:** The TUI starts on the supported dark palette and does not expose unsupported theme changes.
- **Happy-path proof:** Same-level `agentswarm` config files win over same-level legacy `opencode` files.
- **Happy-path proof:** Legacy files still load when branded files are absent.
- **Happy-path proof:** Upgrade supports npm only.
- **Failure scenarios to test:** Yarn, pnpm, Bun, Homebrew, Chocolatey, Scoop, and curl upgrade paths return clear unsupported upgrade method messages.
- **Owner/source:** `packages/opencode/src/agency-swarm/product.ts`, `packages/opencode/src/cli/logo.ts`, `packages/opencode/src/cli/ui.ts`, `packages/opencode/src/cli/network.ts`, `packages/opencode/src/server/mdns.ts`, `packages/opencode/src/cli/cmd/uninstall.ts`, `packages/opencode/src/cli/cmd/tui/component/logo.tsx`, `packages/opencode/src/cli/cmd/tui/context/theme.tsx`, `packages/opencode/src/config/paths.ts`, `packages/opencode/src/config/config.ts`, `packages/opencode/src/cli/cmd/tui/config/tui.ts`, `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/upgrade.ts`.

## Related Evidence

- Approved fork scope: `FORK_CHANGELOG.md`.
- Terminal E2E coverage notes: `e2e/agent-swarm-tui/QA_COVERAGE.md`.

## Tracked Gaps

- `agency.tui()` is an external Python-side trigger. This repo owns the TUI behavior after control reaches an Agent Swarm Run-mode session, but Python invocation details must be verified in the Python package before this file promises them.
