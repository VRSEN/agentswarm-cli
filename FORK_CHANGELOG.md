# FORK_CHANGELOG

This file is the authoritative map of intentional fork-specific differences from upstream.
It should contain all intentional Agent Swarm / fork changes needed to reconstruct this fork from upstream. It should not list ordinary upstream commits merely because they exist in the fork.
By default, upstream changes should be merged into the fork. After that, Agent Swarm-specific differences are reapplied. If an upstream change adds or modifies user-facing behavior, it needs product review before being accepted as Agent Swarm behavior.
When a change is suspicious, unproven, not clearly fork-specific, or not clearly intentional, move it to Review for Removal until verified. Do not silently delete uncertain items.

## Fork Product Frame

- OpenCode naming and branding should be removed from user-facing surfaces. Source paths, package structure, and repository layout stay only where needed for upstream merge compatibility.
- Run mode means connected Agent Swarm / Agency Swarm mode. The TUI starts its own Agency Swarm server by default and connects to it.
- `/connect` is the flow for connecting to an external FastAPI / Agency Swarm server.
- `/auth` is the credentials flow.
- Agent Builder and Plan still exist conceptually, but they are currently hidden or disabled in Run mode and continue to rely on the native OpenCode backbone plus fork-specific instructions.
- Bug-like changes are not product features. Compare them against upstream, find the root cause, reduce divergence, and avoid fork-only workarounds.
- Install, launcher, and package behavior count as user experience and belong in this file when they are intentional fork behavior.
- `USER_FLOWS.md` is the single source of truth for full QA before every release.
- Voice transcript note: "Turf UI" means terminal UI / TUI.

## Upstream Baseline Anchor

- Upstream baseline: `origin/dev` at `28935880169fc55eb6114402e3976b2a70f83ace`
- Fork baseline: `vrsen/dev` at `764f9033269ff096d2c9ac3511f7fa1baf11c718`
- Ahead/behind count: `origin/dev...vrsen/dev` = `914 281`

## Branding/Packaging

- **Agent Swarm CLI name and `agentswarm` command**
  - Intent: ship the fork under Agent Swarm branding instead of the upstream OpenCode product name.
  - Behavior: users install `@agentswarm/agentswarm-cli` and run `agentswarm`.
  - Implementation: `bin.agentswarm` in `packages/opencode/package.json` and `AgencyProduct.cmd` in `packages/opencode/src/agency-swarm/product.ts`.
  - Added by: `95a39a7e`

- **One-command launcher npm package**
  - Intent: let users start the fork through one npm package instead of setting up the Python side first.
  - Behavior: the published fork package set includes the launcher entry that starts the fork-specific Agency Swarm flow.
  - Implementation: `roots` in `packages/opencode/script/publish.ts`.
  - Added by: `772db106`

- **Fork tips strip upstream-only OpenCode commands**
  - Intent: keep onboarding and startup guidance aligned with the fork instead of upstream OpenCode-only commands.
  - Behavior: tips point users to fork flows such as `/auth`, `/connect`, and `/agents` and stop advertising upstream-only commands.
  - Implementation: `AgencyProduct.tips` in `packages/opencode/src/agency-swarm/product.ts`.
  - Added by: `fd2f678b`

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

- **Persist handed-off recipient across turns**
  - Intent: keep the current handoff target active until the user changes it.
  - Behavior: the most recent assistant agent remains the preferred recipient candidate on later turns.
  - Implementation: `resolveSessionRecipient` in `packages/opencode/src/session/agency-swarm.ts`.
  - Added by: `708545a4`

- **Preserve caller agent during history compaction**
  - Intent: keep agency caller context intact when long sessions are compacted.
  - Behavior: compaction preserves the caller agent identity needed for later routing and display.
  - Implementation: `compactHistory` and `extractCallerAgent` in `packages/opencode/src/session/agency-swarm.ts`.
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
  - Implementation: `AgenciiCommand` in `packages/opencode/src/cli/cmd/agencii.ts`.
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

- **Tab cycles recipient agents in Run mode**
  - Intent: speed up recipient switching during run sessions.
  - Behavior: pressing Tab in Run mode cycles through available recipient agents.
  - Implementation: `cycleAgencyRunTarget` in `packages/opencode/src/cli/cmd/tui/app.tsx` and `cycleAgencyTargetSelection` in `packages/opencode/src/cli/cmd/tui/util/agency-target.ts`.
  - Added by: `d6b9ed38`

- **Run-mode `/models` is limited to Agency-supported providers**
  - Intent: keep Run mode on the provider set that the Agency Swarm path actually supports.
  - Behavior: `/models` in Run mode shows Agency-supported providers only; Builder and Plan should keep native model support when those modes are re-enabled.
  - Implementation: `DialogModel` in `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`.
  - Added by: `828986fb`

- **Configured `agency-swarm/default` beats stale stored model state in Run mode**
  - Intent: stop stale remembered model state from pulling a Run mode session out of Agent Swarm behavior by accident.
  - Behavior: `agency-swarm/default` stays active in Run mode until the user explicitly chooses another intended model.
  - Implementation: model selection logic in `packages/opencode/src/cli/cmd/tui/context/local.tsx`.
  - Added by: `PR #51`

- **Run mode hides native OpenCode editor menus and limits model selection**
  - Intent: keep Run mode on the connected Agency Swarm surface while preserving native OpenCode menus for Builder and Plan when those modes are available again.
  - Behavior: Run mode hides native `/editor`; model-selection surfaces remain but are limited to intended Agent Swarm / Agency Swarm models.
  - Implementation: framework-mode command gating in `packages/opencode/src/cli/cmd/tui/app.tsx`.
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

## Install/Upgrade

- **One-command launcher onboarding and project detection**
  - Intent: help `npx` users land in the right Agency Swarm project with less setup guesswork.
  - Behavior: the launcher detects the target project and runs onboarding before starting the fork when needed.
  - Implementation: `shouldRunNpxOnboarding` and `resolveNpxAutoProject` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `772db106`

- **Launcher bootstraps or repairs the project Python env**
  - Intent: make the launcher fix missing or broken project Python setup instead of failing early.
  - Behavior: startup can create or repair the project `.venv` and install the Python side before the fork continues.
  - Implementation: `ensureProjectPython`, `installProjectDependencies`, and `venvCanaryPasses` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `f10d9d84`

- **Launcher refreshes `agency-swarm` inside the project `.venv`**
  - Intent: keep the project backend package fresh enough for the launcher path to work.
  - Behavior: the launcher upgrades the project `agency-swarm` install inside `.venv` before running when needed.
  - Implementation: `ensureLatestAgencySwarm` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `a77de00c`

- **Run-mode session resumes recover the last local Agency project**
  - Intent: reopen a Run mode session in the right local Agency project without asking the user to pick it again.
  - Behavior: session resumes can recover the saved local Agency project before the TUI opens.
  - Implementation: `AgencySwarmRunSession.get` in `packages/opencode/src/agency-swarm/run-session.ts` and `resolveRunProject` in `packages/opencode/src/agency-swarm/npx.ts`.
  - Added by: `f5ff56b0`

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

- **Artifact-aware requirement ledger**
  - Intent: keep active work tied to the branches, PRs, files, and other artifacts it creates.
  - Behavior: the ledger workflow records artifact lists on active requirements instead of leaving them implicit.
  - Implementation: `command_add` and `command_update` in `.agentswarm/skills/requirement-ledger/scripts/requirement_ledger.py`.
  - Added by: `41f624ab`

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

- **End-user proof gate for bug fixes**
  - Intent: stop bug fixes from being marked done without proof from the real user flow.
  - Behavior: bug-fix work is not complete until the same user-visible flow is rerun and checked.
  - Implementation: the proof rules under `## Safety Protocols` in `AGENTS.md`.
  - Added by: `537df24c`

- **Screenshot proof gate for TUI and visual fixes**
  - Intent: stop visual and TUI fixes from closing without a real image check.
  - Behavior: TUI and visual bug fixes need screenshot proof from the installed or user-visible build.
  - Implementation: the TUI proof rule under `## Safety Protocols` in `AGENTS.md`.
  - Added by: `80f8fa36`

- **Codex pre-release review gate**
  - Intent: stop release work from shipping before the fork's required Codex review is complete.
  - Behavior: release work stays open until the release gate has a clean Codex review and no unresolved PR state.
  - Implementation: the release-gate rules in `AGENTS.md`.
  - Added by: `f143e53d`

## Review for Removal

- **Scoped platform wrapper for shipped binaries**
  - Reason for review: packaging plumbing may be implementation detail rather than durable fork product behavior.
  - Current implementation: `findBinary` in `packages/opencode/script/postinstall.mjs`.
  - Added by: `725ac8ec`

- **Built source installs fall back to the local `agentswarm` binary**
  - Reason for review: source-install fallback may be QA or packaging convenience rather than approved product intent.
  - Current implementation: `packages/opencode/bin/agentswarm`.
  - Added by: `PR #50`

- **Upgrade command rejects unsupported package-manager channels**
  - Reason for review: upgrade-channel guard needs product confirmation before it stays as intentional fork UX.
  - Current implementation: `latestImpl` and `upgradeImpl` in `packages/opencode/src/installation/index.ts` with `UpgradeCommand` in `packages/opencode/src/cli/cmd/upgrade.ts`.
  - Added by: `9d86d959`

- **First prompt reaches the conversation screen without freezing**
  - Reason for review: bug fix or root-cause work is not a product feature and should not stay in approved sections.
  - Current implementation: `submit` in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.
  - Added by: `adab6532`

- **Composer clears as soon as a prompt is sent**
  - Reason for review: this was bug/root-cause work, and the composer-clearing behavior was not actually fixed as approved product intent.
  - Current implementation: prompt submit flow in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.
  - Added by: `PR #99`

- **Shared session web pages import fork session types**
  - Reason for review: package wiring may be merge-compatibility detail rather than user-facing fork behavior.
  - Current implementation: `packages/web/package.json`, `packages/web/src/components/Share.tsx`, `packages/web/src/components/share/part.tsx`, and `packages/web/src/pages/s/[id].astro`.
  - Added by: `bedc977e`

- **Agency Swarm integration regression suite**
  - Reason for review: test coverage is useful, but it is not product intent by itself.
  - Current implementation: `packages/opencode/test/session/agency-swarm.test.ts` and `packages/opencode/test/provider/agency-swarm-provider.test.ts`.
  - Added by: `fd2f678b`

- **Browser E2E helpers harden session and status checks**
  - Reason for review: test harness stability work is not approved product behavior by itself.
  - Current implementation: `withSession`, `openStatusPopover`, and `openStatusTab` in `packages/app/e2e/actions.ts`.
  - Added by: `825641267`

- **Package scripts such as `random`, `docs`, and `deploy`**
  - Reason for review: command surface needs case-by-case product approval before it belongs in the intentional fork delta.
  - Current implementation: package scripts across the repo.
  - Added by: unverified

## Maintenance Protocol

1. Refresh the upstream anchor with fresh `git rev-parse` and `git rev-list --left-right --count` output before you edit this file.
2. Rebuild the live fork delta from fresh `git log` and `git diff` output before you add, remove, or rewrite entries.
3. Record exactly one intentional fork-specific difference per entry. Do not bundle separate user-visible behaviors or separate technical mechanisms into one entry.
4. Keep each `Implementation` line to one sentence that names the file path and the key function or symbol that a rebuilder would need on top of upstream.
5. If a change is suspicious, unproven, not clearly fork-specific, not clearly intentional, or bug-like rather than product intent, move it to `## Review for Removal` until verified.
6. If a feature no longer exists on `vrsen/dev` HEAD, remove it instead of keeping historical noise here.
7. If you cannot prove a concrete commit SHA, PR number, or release tag for a live feature, move it to `## Review for Removal` with a one-line reason.
