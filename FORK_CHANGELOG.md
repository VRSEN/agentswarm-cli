# FORK_CHANGELOG

This file records the live fork-only features in `vrsen/dev` relative to `origin/dev`.
Each entry below covers one current fork feature, what it does, where it lives, and what added it.

## Upstream Baseline Anchor

- Upstream baseline: `origin/dev` at `8043cfa68dcf97547ede3e26a9325af55583e1e4`
- Fork baseline: `vrsen/dev` at `e0259d7fd`
- Ahead/behind count: `origin/dev...vrsen/dev` = `757 247`

## Branding/Packaging

- **Agent Swarm CLI name and `agentswarm` command**
  - Intent: make the fork install and launch under the Agent Swarm name instead of the upstream OpenCode name.
  - Behavior: users install `@agentswarm/agentswarm-cli` and run it with the `agentswarm` command.
  - Implementation: `bin.agentswarm` in `packages/opencode/package.json` and `AgencyProduct.cmd` in `packages/opencode/src/agency-swarm/product.ts` define the shipped package name and CLI command.
  - Added by: `95a39a7e`

- **One-command launcher npm package**
  - Intent: let users start the fork with one npm package instead of setting up the Python side by hand first.
  - Behavior: installing the package also ships the launcher entry that boots the fork-specific Agency Swarm flow.
  - Implementation: `roots` in `packages/opencode/script/publish.ts` publishes the fork package set that includes the launcher package.
  - Added by: `772db106`

- **Scoped platform wrapper for shipped binaries**
  - Intent: make postinstall binary setup use the fork package layout instead of the upstream package layout.
  - Behavior: installs resolve the right packaged binary from the fork's scoped npm artifacts.
  - Implementation: `findBinary` in `packages/opencode/script/postinstall.mjs` maps the current platform to the fork binary package names.
  - Added by: `725ac8ec`

- **Built source installs fall back to the local `agentswarm` binary**
  - Intent: keep source-install QA working when the source install path does not ship publish-time binary dependencies.
  - Behavior: local source installs can fall back to a built `agentswarm` binary instead of failing on missing optional packages.
  - Implementation: the local wrapper path in `packages/opencode/bin/agentswarm` falls back to `dist/agentswarm-cli-<target>/bin/agentswarm` for built source installs.
  - Added by: `PR #50`

- **Fork tips strip upstream-only OpenCode commands**
  - Intent: stop the fork from telling users to run commands that only make sense in upstream OpenCode.
  - Behavior: startup and home tips drop upstream-only OpenCode commands and replace them with fork paths like `/auth`, `/connect`, and `/agents`.
  - Implementation: `AgencyProduct.tips` in `packages/opencode/src/agency-swarm/product.ts` filters the upstream tip list, rewrites command names, and adds fork-specific guidance.
  - Added by: `fd2f678b`

## Agency Swarm Integration

- **Agency Swarm backend adapter**
  - Intent: connect the fork runtime to Agency Swarm agents instead of only upstream model providers.
  - Behavior: the app can discover agents, read their metadata, stream their runs, and cancel active work through the Agency Swarm bridge.
  - Implementation: `AgencySwarmAdapter.discover`, `getMetadata`, `streamRun`, and `cancel` in `packages/opencode/src/agency-swarm/adapter.ts` implement the bridge to the Agency Swarm backend.
  - Added by: `fd2f678b`

- **Upstream credential bridge for agency runs**
  - Intent: reuse provider credentials the user already set in the fork when an Agency Swarm run needs them.
  - Behavior: agency runs can inherit configured provider keys instead of asking for a separate second setup path.
  - Implementation: `resolveClientConfig` and `buildAuthClientConfig` in `packages/opencode/src/session/agency-swarm.ts` translate fork provider auth into the Agency Swarm client config.
  - Added by: `79b55ab8`

- **Respect explicit Agency Swarm base URL**
  - Intent: let users point the fork at a chosen Agency Swarm server instead of always using the default loopback address.
  - Behavior: when a base URL is configured, agency requests use that URL for session and run traffic.
  - Implementation: `optionsFromProvider` and `readConfiguredBaseURL` in `packages/opencode/src/session/agency-swarm.ts` load the configured Agency Swarm base URL into each client request.
  - Added by: `635833ef`

- **Persist handed-off recipient across turns**
  - Intent: keep a handoff target active on the next turn so the user does not have to reopen agent selection after each handoff.
  - Behavior: the most recent assistant agent in the session is reused as a recipient candidate on later turns, which can also keep a stale handoff target alive.
  - Implementation: `resolveSessionRecipient` in `packages/opencode/src/session/agency-swarm.ts` scans `Session.messages` and inserts the result into the priority array used by `resolveRecipientAgent`.
  - Added by: `708545a4`

- **Preserve caller agent during history compaction**
  - Intent: keep agency caller context intact when long sessions are compacted.
  - Behavior: after compaction, the session keeps the caller agent identity needed for later routing and display.
  - Implementation: `compactHistory` and `extractCallerAgent` in `packages/opencode/src/session/agency-swarm.ts` copy caller metadata into the compacted history payload.
  - Added by: `06ad1be4`

- **Recover loopback agency history across port changes**
  - Intent: stop local loopback history from disappearing when the Agency Swarm server comes back on a new port.
  - Behavior: session history is recovered from prior loopback state even after the local server address changes.
  - Implementation: `loadRecoveredLoopback` in `packages/opencode/src/agency-swarm/history.ts` reloads saved loopback history by workspace and project identity instead of only by one port.
  - Added by: `d82126c2`

- **Bridge error frames surface as real session errors**
  - Intent: show backend bridge failures as real session errors instead of hiding them inside a broken stream.
  - Behavior: when the bridge emits an error frame, the session fails with a visible error state that the UI can surface.
  - Implementation: the `kind === "error"` branches inside `fullStream` in `packages/opencode/src/session/agency-swarm.ts` convert bridge error frames into thrown session errors.
  - Added by: `ad0cc2c1`

- **Filter Codex OAuth to OpenAI-based LiteLLM runs**
  - Intent: avoid sending Codex OAuth credentials to non-OpenAI agency backends that cannot use them.
  - Behavior: LiteLLM agency runs only keep Codex OAuth auth when the target model is OpenAI-based.
  - Implementation: `shouldStripCodexOAuth` and `stripCodexOAuthForNonOpenAI` in `packages/opencode/src/session/agency-swarm.ts` remove Codex OAuth auth from unsupported agency requests.
  - Added by: `6e36ccac`

- **Tool outputs follow wrapper `call_id`**
  - Intent: keep tool result events tied to the correct wrapper call when Agency Swarm wraps tool traffic.
  - Behavior: tool outputs land on the right tool call instead of attaching to the wrong item or going missing.
  - Implementation: `findCallID` and the `tool_output` branch in `handleRunItemEvent` in `packages/opencode/src/session/agency-swarm.ts` resolve wrapper `call_id` values before the fork records tool results.
  - Added by: `e28e3a02`

## CLI/TUI UX

- **`/auth` is separate from `/connect`**
  - Intent: split provider authentication from Agency Swarm server connection so each flow is clearer.
  - Behavior: `/auth` opens provider login and key setup, while `/connect` stays focused on Agency Swarm server connection.
  - Implementation: slash command registration in `packages/opencode/src/cli/cmd/tui/app.tsx` routes provider auth to `DialogAuth` and server connection to `DialogAgencySwarmConnect`.
  - Added by: `42bda058`

- **Startup auth gating only checks Agency-supported providers**
  - Intent: stop startup auth prompts from blocking runs because of providers that the current Agency Swarm setup does not support.
  - Behavior: the startup auth dialog only blocks for providers that matter to the active Agency Swarm flow.
  - Implementation: `isSupportedAgencyAuthProvider`, `shouldOpenStartupAuthDialog`, and `shouldBlockAgencyPromptSubmit` in `packages/opencode/src/cli/cmd/tui/session-error.ts` filter auth gating to Agency-supported providers.
  - Added by: `804d1806`

- **Auth hints say missing vs rejected key**
  - Intent: help users tell the difference between a missing credential and a bad credential.
  - Behavior: auth error copy explains whether a key was not set or was rejected by the backend.
  - Implementation: `describeStreamAuthError` in `packages/opencode/src/cli/cmd/tui/session-error.ts` maps auth failures to the fork's user-facing error text.
  - Added by: `662654b6`

- **Auth modal blocks prompt input and closes on Esc**
  - Intent: stop users from typing into the main prompt while an auth blocker is still open.
  - Behavior: the auth modal owns input focus until it closes, and pressing Esc closes it cleanly.
  - Implementation: `closeDialogAuthOnEscape` in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` and the auth guard in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` keep prompt input behind the modal.
  - Added by: `2cc6e94a`

- **Manage provider auth can remove stored credentials**
  - Intent: let users remove a saved provider credential from the same TUI flow they use to add one.
  - Behavior: `/auth` can remove saved credentials, and the auth command surface exposes management instead of a one-way login only.
  - Implementation: `DialogAuth` and related slash-command metadata in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` wire the remove-credential action and `logout` alias.
  - Added by: `PR #31`

- **Browser-auth launch failures surface in the TUI**
  - Intent: stop browser OAuth from failing silently when the default browser cannot be launched.
  - Behavior: the auth dialog shows the launch failure in the TUI and warns the user instead of appearing to do nothing.
  - Implementation: browser-launch error handling in `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` watches the browser-open subprocess and surfaces launch failures.
  - Added by: `PR #57`

- **Dead agency server detection opens reconnect**
  - Intent: recover faster when the local Agency Swarm server dies during a fork session.
  - Behavior: the TUI notices a dead server and opens the reconnect flow instead of leaving the user in a broken session.
  - Implementation: `createAgencySwarmConnectionMonitor` in `packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx` watches the bridge health and opens reconnect handling when it fails.
  - Added by: `92ef7ee2`

- **Agency backend management commands**
  - Intent: give users a direct CLI for installing, starting, and maintaining the Agency Swarm backend.
  - Behavior: the fork exposes `agencii` subcommands for backend setup and management tasks.
  - Implementation: `AgenciiCommand` in `packages/opencode/src/cli/cmd/agencii.ts` defines the fork-only backend management command tree.
  - Added by: `14abd070`

- **Agent Builder instructions are retuned for Agency Swarm repos**
  - Intent: make the local build agent write fork-specific Agency Swarm changes instead of upstream OpenCode defaults.
  - Behavior: when the local build agent is active, it follows Agent Swarm builder rules and handoff wording.
  - Implementation: `agentBuilderInstructions` in `packages/opencode/src/session/agent-builder.ts` injects `packages/opencode/src/session/prompt/agent-builder.txt`.
  - Added by: `d93fd0f4`

- **Plan agent instructions are retuned for Agency Swarm handoffs**
  - Intent: make the local plan agent write handoff plans for the fork instead of upstream OpenCode plans.
  - Behavior: when the local plan agent is active, it writes an Agency Swarm plan file the next build turn can use.
  - Implementation: `agentPlannerInstructions` in `packages/opencode/src/session/agent-planner.ts` injects `packages/opencode/src/session/prompt/agent-planner.txt`.
  - Added by: `7643fcde`

- **Builder and Plan switching are hidden in framework mode**
  - Intent: keep the Agency Swarm TUI on a run-only surface instead of exposing local Builder and Plan mode switching.
  - Behavior: in framework mode, the agent picker becomes a run-target picker and agent cycling stays on agency recipients.
  - Implementation: `frameworkMode` and `cycleAgencyRunTarget` in `packages/opencode/src/cli/cmd/tui/app.tsx` plus `DialogAgent` in `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` replace local agent switching with run-target controls.
  - Added by: `d6b9ed38`

- **Tab cycles recipient agents in Run mode**
  - Intent: speed up agent switching during run sessions without reopening a picker.
  - Behavior: pressing Tab in Run mode cycles through available recipient agents.
  - Implementation: `cycleAgencyRunTarget` in `packages/opencode/src/cli/cmd/tui/app.tsx` and `cycleAgencyTargetSelection` in `packages/opencode/src/cli/cmd/tui/util/agency-target.ts` advance the active recipient target.
  - Added by: `d6b9ed38`

- **Framework-mode `/models` only shows Agency-supported providers**
  - Intent: keep the model picker from advertising provider choices that the Agency Swarm flow cannot use.
  - Behavior: `/models` in framework mode only lists providers that the active Agency path supports.
  - Implementation: `DialogModel` in `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` filters provider choices against the Agency-supported set.
  - Added by: `828986fb`

- **Configured `agency-swarm/default` beats stale stored model state**
  - Intent: stop stale remembered model state from pulling a session out of Agent Swarm mode by accident.
  - Behavior: the configured `agency-swarm/default` mode stays active until the user explicitly chooses a different model.
  - Implementation: model selection logic in `packages/opencode/src/cli/cmd/tui/context/local.tsx` keeps configured `agency-swarm/default` ahead of stale stored model state.
  - Added by: `PR #51`

- **Run mode hides `/editor`, but Builder and Plan keep local tools**
  - Intent: hide model and editor tools only when the connected agency owns them, not in local modes.
  - Behavior: `/models` and `/editor` stay available in Builder and Plan, but disappear in Run mode.
  - Implementation: framework-mode command gating in `packages/opencode/src/cli/cmd/tui/app.tsx` keeps local modes on the normal command set and hides those commands only while connected to an agency.
  - Added by: `PR #81`

- **First prompt reaches the conversation screen without freezing**
  - Intent: stop the first submitted prompt from hanging before the conversation view opens.
  - Behavior: the first prompt transitions into the live conversation screen instead of freezing the TUI.
  - Implementation: `submit` in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` clears the first prompt and hands control to the session screen in the right order.
  - Added by: `adab6532`

- **Composer clears as soon as a prompt is sent**
  - Intent: keep prompt submit behavior close to upstream so the composer does not look stuck after send.
  - Behavior: the composer clears right away on send, and error handling restores the saved prompt only when the send actually fails.
  - Implementation: prompt submit flow in `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` restores fire-and-forget send behavior with saved-prompt recovery on error.
  - Added by: `PR #99`

- **Run-target labels use live agency names**
  - Intent: show the names users know from Agency Swarm instead of stale or generic labels.
  - Behavior: agent pickers and run-target labels reflect the current live agency names.
  - Implementation: `resolveAgencyTargetSelection` in `packages/opencode/src/cli/cmd/tui/util/agency-target.ts` and `DialogAgent` in `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` render live agency names in the UI.
  - Added by: `a798a402`

- **Agent Swarm theme is locked to the built-in dark palette**
  - Intent: keep the fork on one supported dark theme instead of letting the TUI drift across light and theme-picker paths.
  - Behavior: the TUI starts in the Agent Swarm dark palette and ignores built-in theme changes outside the allowed path.
  - Implementation: `ThemeProvider` in `packages/opencode/src/cli/cmd/tui/context/theme.tsx` sets `draft.lock = "dark"` and only lets `canSelectBuiltInThemeName` keep the fixed built-in theme.
  - Added by: `d2070ec3`

- **Agent Swarm wordmark replaces the OpenCode logo**
  - Intent: show fork branding in the CLI and TUI instead of the upstream OpenCode mark.
  - Behavior: startup and TUI logo panels render the Agent Swarm ASCII wordmark with fork colors.
  - Implementation: `logo` in `packages/opencode/src/cli/logo.ts` defines the Agent Swarm wordmark and `Logo` in `packages/opencode/src/cli/cmd/tui/component/logo.tsx` renders it with fork theme colors.
  - Added by: `fd2f678b`

- **Tool-use turns stop without duplicate user resends**
  - Intent: stop Agency Swarm tool turns from re-sending the same user prompt after the assistant already finished.
  - Behavior: after a tool-output turn completes, the session loop exits instead of posting the same user message again.
  - Implementation: agency-aware loop-exit handling in the session message/runtime flow treats finished tool-output turns as complete Agency Swarm assistant turns.
  - Added by: `PR #62`

## Install/Upgrade

- **One-command launcher onboarding and project detection**
  - Intent: let `npx` users start inside the right Agency Swarm project with less setup guesswork.
  - Behavior: the launcher can detect the target project and run its onboarding flow before starting the fork.
  - Implementation: `shouldRunNpxOnboarding` and `resolveNpxAutoProject` in `packages/opencode/src/agency-swarm/npx.ts` decide when to onboard and which project to open.
  - Added by: `772db106`

- **Launcher bootstraps or repairs the project Python env**
  - Intent: make the launcher fix missing or broken project Python setup instead of failing early.
  - Behavior: startup can create or repair the project `.venv` and install the Python side before the fork continues.
  - Implementation: `ensureProjectPython`, `installProjectDependencies`, and `venvCanaryPasses` in `packages/opencode/src/agency-swarm/npx.ts` rebuild the project Python environment when needed.
  - Added by: `f10d9d84`

- **Launcher refreshes `agency-swarm` inside the project `.venv`**
  - Intent: keep the project backend package fresh enough for the launcher path to work.
  - Behavior: the launcher upgrades the project `agency-swarm` install inside `.venv` before running when it is too old.
  - Implementation: `ensureLatestAgencySwarm` in `packages/opencode/src/agency-swarm/npx.ts` checks and upgrades the project `agency-swarm` package inside the selected virtualenv.
  - Added by: `a77de00c`

- **Run-mode session resumes recover the last local Agency project**
  - Intent: reopen a run-mode session in the right local Agency project without asking the user to pick it again.
  - Behavior: explicit session resumes can recover the saved local project before the TUI opens.
  - Implementation: `AgencySwarmRunSession.get` in `packages/opencode/src/agency-swarm/run-session.ts` and `resolveRunProject` in `packages/opencode/src/agency-swarm/npx.ts` map session ids back to saved local projects.
  - Added by: `f5ff56b0`

- **Upgrade command rejects unsupported package-manager channels**
  - Intent: stop the upgrade flow from pretending it can update installs that were done through unsupported package-manager paths.
  - Behavior: `upgrade` exits with a clear message when the current install channel is not one the fork knows how to update safely.
  - Implementation: `latestImpl` and `upgradeImpl` in `packages/opencode/src/installation/index.ts` with `UpgradeCommand` in `packages/opencode/src/cli/cmd/upgrade.ts` gate upgrade support by install channel.
  - Added by: `9d86d959`

## Runtime Carry-Forward

- **Effect runtime migration carry-forward**
  - Intent: keep the fork on the newer Effect and `InstanceState` service shape that later runtime work depends on.
  - Behavior: account, auth, command, permission, file, and session services use the newer Effect-based runtime wiring instead of older facade-heavy paths.
  - Implementation: `packages/opencode/src/account/index.ts`, `src/auth/index.ts`, `src/command/index.ts`, `src/permission/index.ts`, `src/session/index.ts`, and related `specs/effect-*` files carry the migrated service shape.
  - Added by: `38e0dc9c`, plus related carry-forward commits in the same runtime family.

- **Branded IDs flow through runtime schema**
  - Intent: keep runtime and transport IDs strongly typed across the fork.
  - Behavior: workspace, session, provider, model, part, permission, pty, question, and tool IDs stay branded through schema, server, and session code.
  - Implementation: `packages/opencode/src/control-plane/schema.ts`, `src/provider/provider.ts`, `src/server/routes/session.ts`, and `src/session/compaction.ts` carry the branded ID rollout.
  - Added by: `16a6d6fe`, plus related ID-branding carry-forward commits.

- **TUI plugin runtime carry-forward**
  - Intent: keep the fork on the newer plugin-driven TUI surface instead of older hardwired panels.
  - Behavior: the TUI loads home, session, and plugin runtime features through the newer plugin runtime paths.
  - Implementation: `packages/opencode/src/cli/cmd/tui/plugin/**`, `src/plugin/**`, and `specs/tui-plugins.md` define the plugin-driven TUI surface.
  - Added by: `6274b067`

- **Permission rework carry-forward**
  - Intent: keep the fork on the newer permission request and review flow.
  - Behavior: permission prompts, session permission views, and local prompt state use the reworked permission model.
  - Implementation: `packages/opencode/src/permission/**`, `src/cli/cmd/tui/routes/session/permission.tsx`, and `src/cli/cmd/tui/context/local.tsx` carry the reworked permission flow.
  - Added by: `351ddeed`

- **Multi-instance and sync runtime carry-forward**
  - Intent: keep the fork on the newer multi-instance and sync model that later session work expects.
  - Behavior: the runtime tracks multiple instances, workspace sync state, and related bus/server updates through the newer control-plane paths.
  - Implementation: `packages/opencode/src/bus/**`, `src/effect/instance-*`, `src/server/routes/**`, and `src/cli/cmd/tui/context/sync.tsx` carry the multi-instance and sync plumbing.
  - Added by: `f993541e`, plus follow-on sync carry-forward commits.

- **Type-aware lint cleanup carry-forward**
  - Intent: keep the fork on the newer lint rule rollout and cleanup passes that touched wide parts of the tree.
  - Behavior: large parts of the repo follow newer promise, spread, unused import, and formatter cleanup rules introduced after the fork drift widened.
  - Implementation: root lint config plus broad cleanups under `packages/app`, `packages/opencode`, `packages/console`, and `.opencode` carry the lint rollout.
  - Added by: `80f1f1b5`, plus related lint-cleanup carry-forward commits.

- **Upstream sync carry-forward**
  - Intent: keep the fork buildable by carrying upstream commits that landed through sync merges instead of treating them as fork-specific features.
  - Behavior: these commits exist in the fork delta because of sync merges; they do not encode intentional fork value and should rejoin upstream on the next merge.
  - Implementation: `/tmp/codex_tasks/fork_escalations_dropped.md` records the auto-classified upstream-only escalation set; typical examples are `chore: generate`, `sync`, `wip: zen`, and upstream SST-numbered PRs.
  - Added by: none (upstream-inherited during sync).

## Web/App Surface

- **README mode overview for Agent Builder, Plan, and Run**
  - Intent: explain the fork's main working modes in the top-level docs instead of leaving users to infer them from the UI.
  - Behavior: the README describes Agent Builder, Plan, and Run as the fork's main user-facing modes.
  - Implementation: the `### Agents` section in `README.md` documents the fork-specific mode model.
  - Added by: `1df2f455`

- **Canonical flow map for fork entry points**
  - Intent: give users one place to see the fork's supported paths through the product.
  - Behavior: `USER_FLOWS.md` lays out the main fork flows for onboarding, auth, agency runs, and related entry points.
  - Implementation: the named flow sections in `USER_FLOWS.md` define the fork's canonical user-flow map.
  - Added by: `b591c478`

- **Shared session web pages import fork session types**
  - Intent: keep the fork's share page wired to the `agentswarm-cli` package instead of upstream package names.
  - Behavior: the web share surface reads session and message types from the fork package when it renders shared runs.
  - Implementation: `packages/web/package.json` plus imports in `packages/web/src/components/Share.tsx`, `packages/web/src/components/share/part.tsx`, and `packages/web/src/pages/s/[id].astro` wire the share surface to `agentswarm-cli`.
  - Added by: `bedc977e`

- **Desktop app workspace and session shell carry-forward**
  - Intent: keep the fork on the newer app shell for workspaces, review flows, prompt input, and session side panels.
  - Behavior: the app carries newer session tabs, review panels, composer flows, and workspace switching behavior on top of the fork runtime.
  - Implementation: `packages/app/src/pages/session.tsx`, `src/pages/session/**`, `src/components/prompt-input.tsx`, and `src/context/global-sync/**` hold the carried-forward app shell.
  - Added by: `35350b1d`, plus related app-shell carry-forward commits.

- **Desktop app settings and titlebar surface carry-forward**
  - Intent: keep the fork on the newer desktop app settings, titlebar, and localized app surface.
  - Behavior: the app carries newer settings panels, titlebar tools, progress-bar preferences, and localized strings.
  - Implementation: `packages/app/src/components/settings-general.tsx`, `src/context/settings.tsx`, `src/components/titlebar.tsx`, and `src/i18n/**` define the carried-forward app settings surface.
  - Added by: `811a7e9a`, plus related app-settings carry-forward commits.

- **Desktop Electron packaging and stability carry-forward**
  - Intent: keep the fork on the newer Electron release, packaging, and desktop stability work.
  - Behavior: desktop builds keep current electron release targets, context-isolation work, and related packaging and stability updates.
  - Implementation: `packages/desktop-electron/**` plus desktop-related workflow and package files carry the Electron surface.
  - Added by: `5cf235fa`, plus related desktop carry-forward commits.

- **Localized web docs and model catalog carry-forward**
  - Intent: keep the fork on the newer translated docs and model catalog pages that ship with the current docs surface.
  - Behavior: web docs across locales carry the newer navigation copy plus the current Go and Zen catalog text.
  - Implementation: `packages/web/src/content/docs/**` carries the translated CLI, modes, permissions, tools, Go, and Zen docs pages.
  - Added by: `dc53086c`, plus related docs and model-catalog carry-forward commits.

## Tests

- **Agency Swarm integration regression suite**
  - Intent: keep fork-only Agency Swarm behavior covered by tests instead of relying on manual checks.
  - Behavior: the repo has regression tests for session and provider behavior that upstream does not ship.
  - Implementation: `packages/opencode/test/session/agency-swarm.test.ts` and `packages/opencode/test/provider/agency-swarm-provider.test.ts` hold the fork's Agency Swarm integration coverage.
  - Added by: `fd2f678b`

- **Browser E2E helpers harden session and status checks**
  - Intent: keep the fork's browser checks stable around its session and status flows.
  - Behavior: app E2E tests can open status tabs reliably and create or clean up temporary sessions without flaky leftovers.
  - Implementation: `withSession`, `openStatusPopover`, and `openStatusTab` in `packages/app/e2e/actions.ts` harden the fork's session and status browser checks.
  - Added by: `825641267`

- **Desktop app E2E suite and harness carry-forward**
  - Intent: keep the fork on the newer desktop app E2E harness instead of a smoke-only test layer.
  - Behavior: the repo carries a broad app E2E suite for prompts, workspaces, settings, terminal, and session flows.
  - Implementation: `packages/app/e2e/actions.ts`, `fixtures.ts`, `selectors.ts`, and the spec files under `packages/app/e2e/**` define the carried-forward app E2E harness.
  - Added by: `c3ef69c8`, plus related app E2E carry-forward commits.

## Release/CI

- **Release-blocking auth smoke workflow**
  - Intent: stop broken auth releases before fork packages are published.
  - Behavior: GitHub Actions runs an auth smoke check as a release gate.
  - Implementation: `jobs.smoke` in `.github/workflows/auth-smoke.yml` runs `packages/opencode/script/auth-smoke-test.py` as the fork's auth release gate.
  - Added by: `4acd5f33`

- **GitHub release publishes fork npm packages**
  - Intent: publish the fork package set from the fork release workflow instead of the upstream package set.
  - Behavior: release automation pushes the fork npm packages when a GitHub release runs.
  - Implementation: `jobs.publish` in `.github/workflows/publish-npm-on-release.yml` runs `packages/opencode/script/publish.ts` to publish the fork package set.
  - Added by: `fd2f678b`

## Policy

- **Artifact-aware requirement ledger**
  - Intent: keep active work tied to the branches, PRs, files, and other artifacts it creates.
  - Behavior: the ledger workflow records artifact lists on active requirements instead of leaving them implicit.
  - Implementation: `command_add` and `command_update` in `.agentswarm/skills/requirement-ledger/scripts/requirement_ledger.py` enforce artifact tracking in the ledger data.
  - Added by: `41f624ab`

- **Fork divergence substantiation log**
  - Intent: keep a durable proof list of why the fork is different from upstream.
  - Behavior: `FORK_CHANGELOG.md` tracks the current fork-only feature set against the upstream baseline.
  - Implementation: `## Upstream Baseline Anchor` and the category sections in `FORK_CHANGELOG.md` define the fork divergence record.
  - Added by: `0e9d311d`

- **Upstream comparison before fork edits**
  - Intent: force fork edits to justify themselves against upstream before they land.
  - Behavior: the standing rules require an upstream read before non-trivial edits to shared files.
  - Implementation: `## Fork Context` in `AGENTS.md` defines the required upstream comparison step for fork edits.
  - Added by: `27e66122`

- **End-user proof gate for bug fixes**
  - Intent: stop bug fixes from being marked done without proof from the real user flow.
  - Behavior: bug-fix work is not complete until the same user-visible flow is rerun and checked.
  - Implementation: the proof rules under `## Safety Protocols` in `AGENTS.md` require end-user reproduction and end-user verification for bug fixes.
  - Added by: `537df24c`

- **Screenshot proof gate for TUI and visual fixes**
  - Intent: stop visual and TUI fixes from closing without a real image check.
  - Behavior: TUI and visual bug fixes need screenshot proof from the installed or user-visible build.
  - Implementation: the TUI proof rule under `## Safety Protocols` in `AGENTS.md` requires screenshot evidence for TUI and visual fixes.
  - Added by: `80f8fa36`

- **Codex pre-release review gate**
  - Intent: stop release work from shipping before the fork's required Codex review is complete.
  - Behavior: release work stays open until the release gate has a clean Codex review and no unresolved PR state.
  - Implementation: the release-gate rules in `AGENTS.md` require a clean Codex review artifact and resolved PR state before release-complete status.
  - Added by: `f143e53d`

## Review for Removal

- None.

## Maintenance Protocol

1. Refresh the upstream anchor with fresh `git rev-parse` and `git rev-list --left-right --count` output before you edit this file.
2. Rebuild the live fork delta from fresh `git log` and `git diff` output before you add, remove, or rewrite entries.
3. Record exactly one live fork feature per entry, and never bundle separate user-visible behaviors or separate technical mechanisms into one entry.
4. Keep each `Implementation` line to one sentence that names the file path and the key function or symbol that a rebuilder would need on top of upstream.
5. If a feature no longer exists on `vrsen/dev` HEAD, remove it instead of keeping historical noise here.
6. If you cannot prove a concrete commit SHA, PR number, or release tag for a live feature, move it to `## Review for Removal` with a one-line reason.
