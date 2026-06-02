# FORK_CHANGELOG

This file is the authoritative map of intentional fork-specific differences from upstream.
It should contain all intentional Agent Swarm / fork changes needed to reconstruct this fork from upstream. It should not list ordinary upstream commits merely because they exist in the fork.
By default, upstream changes should be merged into the fork. After that, Agent Swarm-specific differences are reapplied. If an upstream change adds or modifies user-facing behavior, it needs product review before being accepted as Agent Swarm behavior.
When a change is suspicious, unproven, not clearly fork-specific, or not clearly intentional, move it to the upstream alignment cleanup queue until verified and removed or approved. Do not silently delete uncertain items.

## Fork Product Frame

- OpenCode naming and branding should be removed from user-facing surfaces. Source paths, package structure, and repository layout stay only where needed for upstream merge compatibility.
- Run mode is the Agent Swarm user-facing mode for Agency Swarm-backed work. The TUI starts its own Agency Swarm server by default and connects to it.
- `/connect` is the flow for connecting to an external FastAPI / Agency Swarm server.
- `/auth` is the credentials flow, not a product mode switch.
- `/models` chooses the LLM config passed to Agency Swarm, not a product mode switch.
- Upstream OpenCode provider/model state may still exist internally for auth and LLM choice, but it must not pull the user out of Run mode by accident.
- Agent Builder and Plan still exist conceptually, but they are currently hidden or disabled in Run mode and continue to rely on the native OpenCode backbone plus fork-specific instructions.
- Bug-like changes are not product features. Compare them against upstream, find the root cause, reduce divergence, and avoid fork-only workarounds.
- Install, launcher, and package behavior count as user experience and belong in this file when they are intentional fork behavior.
- `USER_FLOWS.md` is the single source of truth for full QA before every release.
- Voice transcript note: "Turf UI" means terminal UI / TUI.

## Upstream Baseline Anchor

- Last upstream sync target: OpenCode `v1.14.51` at `a462b1c1011860f65dcb496a8451c550478cc6a7`.
- Upstream commit already present before this sync: `35734b42fe3094c41b09ec81d3836944a8dd1d89`.
- Prior fork merge commit carrying that upstream commit: `8c24d21569620713c438b68e38a6a53fbbc66b68`.
- Current fork merge commit: `2bee78661ca44489811ad6a5366d054156d81795`.
- Fork base parent for the current merge: `ca1936470e71d436cbf793592bad46f4897bf131`.

## Branding/Packaging

- **Agent Swarm CLI name and `agentswarm` command**
  - Intent: ship the fork under Agent Swarm branding instead of the upstream OpenCode product name.
  - Behavior: the command is `agentswarm`.
  - Behavior: the npx launcher is `npx @vrsen/agentswarm`.
  - Behavior: CLI help and uninstall copy use Agent Swarm naming.
  - Behavior: mDNS defaults and service names use Agent Swarm naming.
  - Behavior: uninstall copy does not invent unsupported package-manager commands.
  - Implementation: `bin.agentswarm` in `packages/opencode/package.json`, `AgencyProduct.cmd` and `AgencyProduct.mdnsDomain` in `packages/opencode/src/agency-swarm/product.ts`, CLI network/mDNS helpers, and `UninstallCommand`.
  - Added by: `95a39a7e`

- **Downstream product profile inputs**
  - Intent: let downstream wrappers and release workflows build on this TUI foundation without hard-coding downstream product values into the Agent Swarm fork.
  - Behavior: `AGENTSWARM_PRODUCT_*` inputs can override command copy, package metadata, release repository, mDNS default, docs and issue links, starter template, starter folder, and detected entry files.
  - Behavior: Agent Swarm defaults remain unchanged when no downstream product inputs are set.
  - Behavior: release builds can use `AGENTSWARM_PRODUCT_VERSION` so direct downstream binaries report the downstream package version.
  - Behavior: downstream profiles can set `AGENTSWARM_PRODUCT_SKIP_POST_AUTH_MODEL_SELECTION` to skip the model prompt after auth. `/models` stays available unless `AGENTSWARM_PRODUCT_HIDE_MODEL_SELECTION` explicitly hides it.
  - Behavior: downstream profiles can set `AGENTSWARM_PRODUCT_PYTHON_ENVIRONMENT=standalone` so launcher-created or repaired project `.venv` environments use standalone Python instead of Conda-family Python. The Agent Swarm default remains `any`.
  - Behavior: downstream profiles can set `AGENTSWARM_PRODUCT_ADDONS` to a JSON add-ons list to expose the native `/addons` command and post-auth add-ons setup flow. The Agent Swarm default keeps `/addons` hidden.
  - Behavior: downstream profiles can set `AGENTSWARM_PRODUCT_STATE_ROOT` so the product project, launcher logs, and add-on `.env` reads and writes live under a fixed product state root. The Agent Swarm default still uses the caller project and temporary launcher logs.
  - Implementation: `AgencyProduct` in `packages/opencode/src/agency-swarm/product.ts`, launcher detection in `packages/opencode/src/agency-swarm/npx.ts`, add-on env storage in `packages/opencode/src/cli/cmd/tui/util/env-file.ts`, the FastAPI server launcher module argument, installation distribution metadata, native TUI provider dialogs, and `packages/opencode/script/build.ts`.

- **One-command launcher npm package**
  - Intent: let users start the fork through one npm package instead of setting up the Python side first.
  - Behavior: the published fork package set includes the launcher entry that starts the fork-specific Agency Swarm flow.
  - Implementation: `roots` in `packages/opencode/script/publish.ts`.
  - Added by: `772db106`

- **Scoped `@vrsen` platform-package resolution for published binaries**
  - Intent: make published `agentswarm-cli` installs resolve the fork's scoped platform packages instead of upstream platform packages.
  - Behavior: postinstall and the `agentswarm` wrapper find `@vrsen/agentswarm-cli-*` binaries for the current platform and architecture.
  - Implementation: `platformScope` in `packages/opencode/package.json`, `findBinary` in `packages/opencode/script/postinstall.mjs`, and package lookup in `packages/opencode/bin/agentswarm`.
  - Added by: `c645fbf4`

- **Fork tips strip upstream-only OpenCode commands**
  - Intent: keep onboarding and startup guidance aligned with the fork instead of upstream OpenCode-only commands.
  - Behavior: tips point users to fork flows such as `/auth`, `/connect`, and `/agents` and stop advertising upstream-only commands.
  - Implementation: `AgencyProduct.tips` in `packages/opencode/src/agency-swarm/product.ts`.
  - Added by: `fd2f678b`

- **Branded `agentswarm` config and `.agentswarm` workspace win over same-level legacy `opencode` files**
  - Intent: keep Agent Swarm config canonical when legacy `opencode` files coexist at the same level, so migrating users do not silently keep stale settings.
  - Behavior: at the same project directory level, `agentswarm.json` overrides `opencode.json`; at the same workspace level, `.agentswarm/agentswarm.json` and `.agentswarm/tui.json` override sibling `.opencode/opencode.json` and `.opencode/tui.json`. Legacy files still load when branded ones are absent. Cross-level (parent/child) precedence is unchanged from upstream.
  - Implementation: target order in `ConfigPaths.files` in `packages/opencode/src/config/paths.ts`, plus same-parent adjacent-pair swaps in `Config.loadInstanceState` in `packages/opencode/src/config/config.ts` and `TuiConfig.loadState` in `packages/opencode/src/cli/cmd/tui/config/tui.ts`.
  - Added by: `a6e60a80`, `490baa06`, `4e35d3e4`

## Agency Swarm Integration

- **Agency Swarm backend adapter**
  - Intent: connect the fork runtime to Agency Swarm agents rather than only upstream model providers.
  - Behavior: the app discovers agents, reads metadata, streams runs, and cancels active work through the Agency Swarm bridge.
  - Implementation: `AgencySwarmAdapter.discover`, `getMetadata`, `streamRun`, and `cancel` in `packages/opencode/src/agency-swarm/adapter.ts`.
  - Added by: `fd2f678b`

- **Upstream credential bridge for agency runs**
  - Intent: reuse provider credentials already configured in the fork when an Agency Swarm run needs them.
  - Behavior: agency runs inherit compatible provider credentials instead of forcing a second auth path.
  - Implementation: `resolveClientConfig` and `buildAuthClientConfig` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `79b55ab8`

- **Respect explicit Agency Swarm base URL**
  - Intent: let users target a chosen Agency Swarm server instead of always using the default loopback address.
  - Behavior: when a base URL is configured, agency session and run traffic use that URL.
  - Implementation: `optionsFromProvider` and `readConfiguredBaseURL` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `635833ef`

- **Persist handed-off agent across turns**
  - Intent: keep Agency Swarm handoff control active until the user changes it.
  - Behavior: a `transfer_to_*` handoff switches control to the handed-off agent for later turns. This is not delegation; control does not return to the original agent unless the user or swarm changes it. If metadata refresh is unavailable during a later turn, an explicit prompt recipient is still sent best-effort instead of dropping routing.
  - Implementation: `resolveSessionRecipient` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `708545a4`

- **Preserve caller agent during history compaction**
  - Intent: keep agency caller context intact when long sessions are compacted.
  - Behavior: compaction preserves the caller agent identity needed for later routing and display. Internal flat Agency metadata is not replayed as AI SDK provider metadata.
  - Implementation: `compactHistory` and `extractCallerAgent` in `packages/opencode/src/session/agency-swarm.ts`, and Agency metadata replay filtering in `packages/opencode/src/session/message-v2.ts`.
  - Added by: `06ad1be4`

- **Recover loopback history across Agency server URL or port changes**
  - Intent: avoid data loss when the local Agency Swarm server comes back on a different loopback URL or port.
  - Behavior: local history is recovered by workspace and project identity, and session metadata is updated after the URL or port change.
  - Implementation: `loadRecoveredLoopback` in `packages/opencode/src/agency-swarm/history.ts`.
  - Added by: `d82126c2`

- **Bridge error frames surface as real session errors**
  - Intent: show backend bridge failures as real session failures instead of hiding them inside a broken stream.
  - Behavior: when the bridge emits an error frame, the session fails with visible error state the UI can surface.
  - Implementation: the `kind === "error"` branches inside `fullStream` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `ad0cc2c1`

- **Filter Codex OAuth to OpenAI-based LiteLLM runs**
  - Intent: avoid sending Codex OAuth credentials to non-OpenAI agency backends that cannot use them.
  - Behavior: LiteLLM agency runs keep Codex OAuth only when the target model is OpenAI-based.
  - Implementation: `shouldStripCodexOAuth` and `stripCodexOAuthForNonOpenAI` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `6e36ccac`

- **Tool outputs preserve wrapper call metadata**
  - Intent: keep Agency Swarm tool results attached to the correct wrapped call and preserve the extra metadata needed for tracing.
  - Behavior: tool outputs stay tied to the right `call_id` and keep related metadata such as hierarchy, parent run IDs, agent names, and execution metadata on the normal OpenCode model path.
  - Implementation: `findCallID` and the `tool_output` branch in `handleRunItemEvent` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `e28e3a02`

## CLI/TUI UX

- **`/auth` is separate from `/connect`**
  - Intent: keep credentials management separate from Agency Swarm server connection.
  - Behavior: `/auth` handles provider login and key setup, while `/connect` handles Agency Swarm server connection.
  - Implementation: slash command registration in `packages/opencode/src/cli/cmd/tui/app.tsx` routes provider auth to `DialogAuth` and server connection to `DialogAgencySwarmConnect`.
  - Added by: `42bda058`

- **Startup auth gating blocks only when no credentials exist**
  - Intent: stop startup auth prompts from blocking a run when usable credentials already exist.
  - Behavior: startup auth gating blocks only when the user has no credentials at all for the needed flow.
  - Implementation: `isSupportedAgencyAuthProvider`, `shouldOpenStartupAuthDialog`, and `shouldBlockAgencyPromptSubmit` in `packages/opencode/src/cli/cmd/tui/session-error.ts`.
  - Added by: `804d1806`

- **Auth hints distinguish missing credentials from rejected credentials**
  - Intent: make auth recovery clearer.
  - Behavior: auth error copy tells the user whether a credential is missing or was rejected by the backend.
  - Implementation: `describeStreamAuthError` in `packages/opencode/src/cli/cmd/tui/session-error.ts`.
  - Added by: `662654b6`

- **Auth modal blocks prompt input and closes on Esc**
  - Intent: stop users from typing into the main prompt while an auth blocker is still open.
  - Behavior: the auth modal owns input focus until it closes, and Esc dismisses it.
  - Implementation: `closeDialogAuthOnEscape` in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` and the auth guard in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.
  - Added by: `2cc6e94a`

- **Manage provider auth can remove stored credentials**
  - Intent: let users remove a saved provider credential from the same TUI flow they use to add one.
  - Behavior: `/auth` supports both adding and removing stored credentials.
  - Implementation: `DialogAuth` and related slash-command metadata in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`.
  - Added by: `PR #31`

- **Browser-auth launch failures surface in the TUI when upstream does not cover them**
  - Intent: stop browser OAuth from failing silently when the default browser cannot be launched, while staying close to upstream if upstream already handles this cleanly.
  - Behavior: the auth dialog shows browser-launch failures in the TUI and warns the user instead of appearing to do nothing.
  - Implementation: browser-launch error handling in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`.
  - Added by: `PR #57`

- **Dead agency server detection opens reconnect**
  - Intent: recover faster when the local Agency Swarm server dies during a fork session.
  - Behavior: the TUI detects the dead server and opens the reconnect flow instead of leaving the user in a broken session.
  - Implementation: `createAgencySwarmConnectionMonitor` in `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx`.
  - Added by: `92ef7ee2`

- **Agency backend management commands are debugging and development tools**
  - Intent: keep backend lifecycle commands available for debugging and development without treating them as the main end-user path.
  - Behavior: the fork exposes backend install and maintenance commands, but they are debugging and development tools rather than core product surface.
  - Implementation: `AgencyCommand` in `packages/opencode/src/cli/cmd/agency.ts`.
  - Added by: `14abd070`

- **Agent Builder instructions are retuned for Agency Swarm repos**
  - Intent: keep Builder behavior aligned with the fork when those flows are used again.
  - Behavior: the Builder prompt uses fork-specific Agency Swarm instructions rather than upstream OpenCode defaults.
  - Implementation: `agentBuilderInstructions` in `packages/opencode/src/session/agent-builder.ts` with `packages/opencode/src/session/prompt/agent-builder.txt`.
  - Added by: `d93fd0f4`

- **Plan instructions are retuned for Agency Swarm handoffs**
  - Intent: keep Plan behavior aligned with the fork when those flows are used again.
  - Behavior: the Plan prompt writes Agency Swarm handoff plans instead of upstream OpenCode plans.
  - Implementation: `agentPlannerInstructions` in `packages/opencode/src/session/agent-planner.ts` with `packages/opencode/src/session/prompt/agent-planner.txt`.
  - Added by: `7643fcde`

- **Builder and Plan switching are hidden in Run mode**
  - Intent: keep Run mode focused on connected Agency Swarm execution while Builder and Plan stay conceptually preserved but currently hidden.
  - Behavior: in Run mode, the picker becomes a run-target picker instead of a Builder or Plan mode switcher.
  - Implementation: `frameworkMode` and `cycleAgencyRunTarget` in `packages/opencode/src/cli/cmd/tui/app.tsx` plus `DialogAgent` in `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`.
  - Added by: `d6b9ed38`

- **Tab switches agents in Run mode**
  - Intent: speed up agent switching during run sessions.
  - Behavior: pressing Tab in Run mode cycles through available agents.
  - Implementation: `cycleAgencyRunTarget` in `packages/opencode/src/cli/cmd/tui/app.tsx` and `cycleAgencyTargetSelection` in `packages/opencode/src/cli/cmd/tui/util/agency-target.ts`.
  - Added by: `d6b9ed38`

- **Run-mode `/models` is limited to Agency-supported LLM choices**
  - Intent: let users choose the LLM config passed to Agency Swarm without treating provider/model selection as a product mode switch.
  - Behavior: `/models` in Run mode shows Agency-supported providers only; choosing one updates the LLM config for Agency Swarm and keeps the user in Run mode.
  - Implementation: `DialogModel` in `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`.
  - Added by: `828986fb`

- **Configured `agency-swarm/default` beats stale stored model state in Run mode**
  - Intent: stop stale remembered provider/model state from pulling a Run mode session out of Agent Swarm behavior by accident.
  - Behavior: `agency-swarm/default` stays active in Run mode until the user explicitly chooses another LLM model.
  - Implementation: model selection logic in `packages/opencode/src/cli/cmd/tui/context/local.tsx`.
  - Added by: `PR #51`

- **Run mode hides native OpenCode menus and limits model selection**
  - Intent: keep Run mode on the connected Agency Swarm surface while preserving native OpenCode menus for Builder and Plan when those modes are available again.
  - Behavior: Run mode hides native `/editor`, `/variants`, `/init`, and `/review`; model-selection and provider-auth surfaces remain as support flows for LLM choice and credentials, and are limited to intended Agent Swarm / Agency Swarm providers.
  - Implementation: framework-mode command gating in `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx`, `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`, and `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`.
  - Added by: `PR #81`

- **Run-target labels use live agency names**
  - Intent: show the names users know from Agency Swarm instead of stale or generic labels.
  - Behavior: agent pickers and run-target labels reflect current live agency names.
  - Implementation: `resolveAgencyTargetSelection` in `packages/opencode/src/cli/cmd/tui/util/agency-target.ts` and `DialogAgent` in `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`.
  - Added by: `a798a402`

- **Agent Swarm theme stays on the dark palette**
  - Intent: keep the fork on one supported dark theme instead of exposing the full upstream theme surface.
  - Behavior: the TUI starts in the Agent Swarm dark palette and ignores built-in theme changes outside the allowed path.
  - Implementation: `ThemeProvider` in `packages/opencode/src/cli/cmd/tui/context/theme.tsx`.
  - Added by: `d2070ec3`

- **Agent Swarm wordmark replaces the OpenCode logo**
  - Intent: show fork branding in the CLI and TUI instead of the upstream OpenCode mark.
  - Behavior: startup and TUI logo panels render the Agent Swarm ASCII wordmark with fork colors.
  - Implementation: `logo` in `packages/opencode/src/cli/logo.ts` and `Logo` in `packages/opencode/src/cli/cmd/tui/component/logo.tsx`.
  - Added by: `fd2f678b`

- **Privacy-safe product telemetry for TUI feature usage**
  - Intent: learn which Agent Swarm TUI features users use and which setup paths need support without collecting prompts, command arguments, file paths, session content, raw workspace data, raw content, or raw IDs.
  - Behavior: npm release builds can send PostHog events for provider demand, provider auth started/failed outcomes, task success/failure for normal TUI prompts, supported slash command usage, docs clicks, and integration requested when the release build includes the PostHog capture key. Users can disable this with `OPEN_SWARM_TELEMETRY=0`, `AGENTSWARM_TELEMETRY=0`, or `--no-telemetry`.
  - Privacy: telemetry uses strict event and property allowlists; unknown events or properties are dropped or bucketed, provider and integration values are allowlisted, and captured properties exclude raw prompts, slash command arguments, command bodies, credentials, paths, project IDs, session IDs, message IDs, raw model IDs, source content, environment values, raw error text, tool inputs, and tool outputs.
  - Documentation: `README.md` lists the supported events and properties and the derived dashboard metrics for first run, retention, sessions per user, first task, first successful task, time to first success, completed tasks, docs clicks, and provider demand.
  - Implementation: `Telemetry` in `packages/opencode/src/telemetry/telemetry.ts`, command value allowlists in `packages/opencode/src/telemetry/command-values.ts`, TUI auth/prompt/add-on hooks, README event documentation, and release-time `POSTHOG_API_KEY`/`POSTHOG_HOST` injection in `.github/workflows/publish-npm-on-release.yml`.

## Install/Upgrade

- **One-command launcher onboarding and project detection**
  - Intent: help `npx` users land in the right Agency Swarm project with less setup guesswork.
  - Behavior: the launcher runs onboarding for default starts.
  - Behavior: a downstream starter profile can detect configured entry files and create the configured starter repository in the configured starter folder.
  - Behavior: `--prompt`, `--agent`, and explicit `agency-swarm/...` model launches skip onboarding.
  - Behavior: auto-project launch requires a detected Agency project.
  - Behavior: non-Agency explicit models do not trigger fork auto-project setup.
  - Implementation: `shouldRunNpxOnboarding` and `resolveNpxAutoProject` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `772db106`

- **Launcher bootstraps or repairs the project Python env**
  - Intent: make the launcher fix missing or broken project Python setup instead of failing early.
  - Behavior: startup can create or repair the project `.venv` and install the Python side before the fork continues.
  - Implementation: `ensureProjectPython`, `installProjectDependencies`, and `venvCanaryPasses` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `f10d9d84`

- **Launcher manages Python dependency setup with uv**
  - Intent: keep the project backend package ready for the launcher path without overriding user dependency manifests.
  - Behavior: the launcher creates or repairs `.venv` with Python, installs uv into that project `.venv` with pip, then uses launcher-managed local uv for fast `requirements.txt`, `pyproject.toml`, and fallback `agency-swarm[fastapi,litellm]` installs.
  - Implementation: `ensureLocalUv`, `installProjectDependencies`, and `ensureLatestAgencySwarm` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `a77de00c`

- **Run-mode attachments use structured Agency Swarm messages**
  - Intent: send user-attached file context through the Agency Swarm FastAPI `message` contract instead of routing normal attachments through OpenAI Files API upload paths.
  - Behavior: Run mode forwards file and image parts as structured Responses `message` content for structured-capable backends, uses legacy `file_urls` payloads for older backends, and keeps attachments available across follow-up prompts by replaying manual history, which may resend inline attachment content or references.
  - Implementation: `buildStructuredOutgoingMessage` in `packages/opencode/src/session/agency-swarm-utils.ts` and `SessionAgencySwarm.stream` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `2c88f1e1d`, `d08e55e2d`, PR #187.

- **Run-mode session resumes recover the last local Agency project**
  - Intent: reopen a Run mode session in the right local Agency project without asking the user to pick it again.
  - Behavior: session resumes can recover the saved local Agency project before the TUI opens.
  - Implementation: `AgencySwarmRunSession.get` in `packages/opencode/src/agency-swarm/run-session.ts` and `resolveRunProject` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `f5ff56b0`

- **Upgrade only supports npm for `agentswarm-cli`**
  - Intent: prevent upgrade flows from claiming support for unsupported upgrade methods.
  - Behavior: upgrade supports npm only.
  - Behavior: Yarn, pnpm, Bun, Homebrew, Chocolatey, Scoop, and curl return a clear unsupported upgrade method message.
  - Implementation: `latestImpl` and `upgradeImpl` in `packages/opencode/src/installation/index.ts` with `UpgradeCommand` in `packages/opencode/src/cli/cmd/upgrade.ts`.
  - Implementation: `/global/upgrade` error handling in `packages/opencode/src/server/routes/global.ts`.
  - Added by: `9d86d959`

## Web/App Surface

- **README mode overview explains Builder, Plan, and Run**
  - Intent: document the fork's mode model clearly at the top level.
  - Behavior: the README explains Agent Builder, Plan, and Run, with Run as the connected Agency Swarm path and Builder or Plan preserved conceptually even if hidden in current Run mode.
  - Implementation: the `### Agents` section in `README.md`.
  - Added by: `1df2f455`

- **Canonical flow map and QA source of truth**
  - Intent: keep one canonical map of the fork's supported entry points and one canonical QA checklist.
  - Behavior: `USER_FLOWS.md` defines the main onboarding, auth, connection, and agency-run flows and serves as the full release QA source of truth.
  - Implementation: the named flow sections in `USER_FLOWS.md`.
  - Added by: `b591c478`

- **Upstream OpenCode share service carry-forward**
  - Intent: keep session sharing usable while the fork does not yet host its own share backend.
  - Behavior: `/share` remains available and posts to the upstream-compatible `https://opncd.ai` share service; users must not share sessions containing secrets, private code, private customer data, or credentials.
  - Implementation: `ShareNext.share` in `packages/opencode/src/share/share-next.ts`, session share command registration in `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, and PR share import in `packages/opencode/src/cli/cmd/pr.ts`.
  - Added by: upstream carry-forward, approved as intentional fork behavior on 2026-04-28.

## Release/CI

- **Release-blocking auth smoke workflow**
  - Intent: stop broken auth releases before fork packages are published.
  - Behavior: GitHub Actions runs an auth smoke check as a release gate.
  - Implementation: `jobs.smoke` in `.github/workflows/auth-smoke.yml` runs `packages/opencode/script/auth-smoke-test.py`.
  - Added by: `4acd5f33`

- **GitHub release publishes fork npm packages**
  - Intent: publish the fork package set from the fork release workflow instead of the upstream package set.
  - Behavior: release automation publishes the fork npm packages when a GitHub release runs.
  - Implementation: `jobs.publish` in `.github/workflows/publish-npm-on-release.yml` runs `packages/opencode/script/publish.ts`.
  - Added by: `fd2f678b`

## Policy

- **Fork divergence substantiation log**
  - Intent: keep durable proof of why the fork differs from upstream.
  - Behavior: `FORK_CHANGELOG.md` tracks the current intentional fork-only feature set against the upstream baseline.
  - Implementation: `## Upstream Baseline Anchor`, the product frame, and the category sections in `FORK_CHANGELOG.md`.
  - Added by: `0e9d311d`

- **Upstream comparison before fork edits**
  - Intent: force fork edits to justify themselves against upstream before they land.
  - Behavior: standing rules require an upstream read before non-trivial edits to shared files.
  - Implementation: `## Fork Context` in `AGENTS.md`.
  - Added by: `27e66122`

- **Codex pre-release review gate**
  - Intent: stop release work from shipping before the fork's required Codex review is complete.
  - Behavior: release work stays open until the release gate has a clean Codex review and no unresolved PR state.
  - Implementation: the release-gate rules in `AGENTS.md`.
  - Added by: `f143e53d`

## Upstream Alignment Cleanup Queue

These items were checked with `git blame`, source PRs/issues, `origin/dev`, and upstream release `v1.14.25` on 2026-04-26. They are not intentional fork product behavior and should be aligned with upstream in cleanup PRs.

- **Built source installs can fall back to local dist binaries during global source installs**
  - Decision: align with upstream. Upstream `origin/dev` and `v1.14.25` do not have an equivalent local `dist` fallback, and this is not approved product behavior.
  - Evidence: VRSEN PR #50 and issue #49 say this was a developer source-install QA fallback for `npm install -g .` from `packages/opencode`, not an end-user feature.
  - Blame/intent check: added by bonk1t in `725ac8ec0` (`fix(install): support built source global installs`).
  - Current implementation: `findBuiltBinary` in `packages/opencode/bin/agentswarm` and `packages/opencode/test/installation/source-install-wrapper.test.ts`.

- **Prompt submit flow has fork-only retry/error handling instead of clean upstream fire-and-forget submit**
  - Decision: align with upstream. Immediate composer clearing is upstream behavior, not a fork feature, and waiting for model completion was not intentional.
  - Evidence: VRSEN PR #42 introduced the original regression by changing upstream fire-and-forget `sdk.client.session.prompt(...).catch(() => {})` into `await sdk.client.session.prompt(...)`; issue #103 names that exact root cause. VRSEN PR #88 was mostly intentional, but it carried this bug forward. VRSEN PR #99 tried to restore upstream behavior, but later follow-up code still left extra prompt-task waiting and retry/error-restoration logic instead of the clean upstream shape.
  - Blame/intent check: original regression line is `f977cea74b` (`fix: harden agent swarm auth onboarding`); current follow-up machinery is mainly `8a18f7bb`, `9e73b5f7`, and `2ad600b64`.
  - Current implementation: prompt submit flow in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.

- **Spurious package scripts remain from upstream junk**
  - Decision: align with upstream. These scripts are not fork intent and should not be treated as Agent Swarm functionality.
  - Evidence: upstream OpenCode PR #22160 and issue #22159 identify `random`, `clean`, `lint`, `format`, `docs`, and `deploy` as accidental junk and remove them with no logic change.
  - Blame/intent check: local blame points to upstream/historical commits `9fdbe193cd` and `6d95f0d14c`, not bonk1t fork product work.
  - Current implementation: `packages/opencode/package.json`.

## Maintenance Protocol

1. Refresh the upstream anchor with fresh `git rev-parse` and `git rev-list --left-right --count` output before you edit this file.
2. Rebuild the live fork delta from fresh `git log` and `git diff` output before you add, remove, or rewrite entries.
3. Record exactly one intentional fork-specific difference per entry. Do not bundle separate user-visible behaviors or separate technical mechanisms into one entry.
4. Keep each `Implementation` line to one sentence that names the file path and the key function or symbol that a rebuilder would need on top of upstream.
5. If a change is suspicious, unproven, not clearly fork-specific, not clearly intentional, or bug-like rather than product intent, move it to `## Upstream Alignment Cleanup Queue` until verified.
6. If a feature no longer exists on `vrsen/dev` HEAD, remove it instead of keeping historical noise here.
7. If you cannot prove a concrete commit SHA, PR number, or release tag for a live feature, move it to `## Upstream Alignment Cleanup Queue` with a one-line reason.
