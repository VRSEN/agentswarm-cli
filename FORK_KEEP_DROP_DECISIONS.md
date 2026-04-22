# FORK_KEEP_DROP_DECISIONS

This is step 2 for issue `#123`. It scores the 46 fork features from `FORK_CHANGELOG.md` on `vrsen/docs/fork-changelog-feature-audit` against current `vrsen/dev` (`e0259d7fd`) and current `origin/dev` (`97f3c746f`).

Summary: `keep` 7, `drop` 6, `re-port` 32, `fold-upstream` 1.

| Feature name | Category | Recommendation | Why | Upstream evidence |
| --- | --- | --- | --- | --- |
| Agent Swarm CLI name and `agentswarm` command | Branding/Packaging | re-port | The fork still needs its own name and command, but upstream packaging keeps moving. | `origin/dev:packages/opencode/package.json` |
| One-command launcher npm package | Branding/Packaging | re-port | One-command launch is core fork UX, but the publish pipeline changed upstream. | `origin/dev:packages/opencode/script/publish.ts` |
| Scoped platform wrapper for shipped binaries | Branding/Packaging | re-port | Fork installs still need fork binary names, but the postinstall path is shared upstream code. | `origin/dev:packages/opencode/script/postinstall.mjs` |
| Fork tips strip upstream-only OpenCode commands | Branding/Packaging | re-port | Fork tips cannot send users to upstream-only commands after the merge. | `origin/dev:packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` |
| Agency Swarm backend adapter | Agency Swarm Integration | re-port | This is the core fork bridge, and upstream has no drop-in Agency Swarm adapter. | `origin/dev:packages/opencode/src/provider/provider.ts` |
| Upstream credential bridge for agency runs | Agency Swarm Integration | re-port | Agency runs still need to reuse stored provider auth, but upstream auth code changed. | `origin/dev:packages/opencode/src/provider/auth.ts` |
| Respect explicit Agency Swarm base URL | Agency Swarm Integration | re-port | Users still need a real server URL override, but upstream provider config moved on. | `origin/dev:packages/opencode/src/provider/provider.ts` |
| Persist handed-off recipient across turns | Agency Swarm Integration | drop | This keeps stale targets alive and is not worth carrying into the merge. | none |
| Preserve caller agent during history compaction | Agency Swarm Integration | re-port | Compaction still needs to keep caller identity for agency routing to stay correct. | `origin/dev:packages/opencode/src/session/compaction.ts` |
| Recover loopback agency history across port changes | Agency Swarm Integration | re-port | Local agency sessions should survive port churn, but the upstream session layer changed. | `origin/dev:packages/opencode/src/session/session.ts` |
| Bridge error frames surface as real session errors | Agency Swarm Integration | re-port | Broken bridge runs must fail loudly, not die inside a half-broken stream. | `origin/dev:packages/opencode/src/session/processor.ts` |
| Filter Codex OAuth to OpenAI-based LiteLLM runs | Agency Swarm Integration | re-port | The fork still needs this safety filter when Codex OAuth meets mixed LiteLLM providers. | `origin/dev:packages/opencode/src/provider/provider.ts` |
| Tool outputs follow wrapper `call_id` | Agency Swarm Integration | re-port | Tool output matching is correctness work and must keep following wrapper call IDs. | `origin/dev:packages/opencode/src/provider/sdk/copilot/responses/openai-responses-api-types.ts` |
| `/auth` is separate from `/connect` | CLI/TUI UX | re-port | Agency server connect and provider auth are still two different user jobs. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` |
| Startup auth gating only checks Agency-supported providers | CLI/TUI UX | re-port | Run mode should only block on providers that the agency path can really use. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` |
| Auth hints say missing vs rejected key | CLI/TUI UX | drop | Better auth copy is nice, but it is not core merge value. | none |
| Auth modal blocks prompt input and closes on Esc | CLI/TUI UX | fold-upstream | Current upstream dialog flow already owns Esc handling and prompt focus correctly. | `origin/dev:packages/opencode/src/cli/cmd/tui/app.tsx`; `origin/dev:packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` |
| Dead agency server detection opens reconnect | CLI/TUI UX | re-port | Run mode still needs a clean reconnect path when the agency server dies. | `origin/dev:packages/opencode/src/cli/cmd/tui/app.tsx` |
| Agency backend management commands | CLI/TUI UX | re-port | Fork users still need backend setup commands, but the command tree changed upstream. | `origin/dev:packages/opencode/src/cli/cmd/cmd.ts` |
| Agent Builder instructions are retuned for Agency Swarm repos | CLI/TUI UX | re-port | The build agent still needs fork rules instead of upstream OpenCode defaults. | `origin/dev:packages/opencode/src/session/prompt.ts` |
| Plan agent instructions are retuned for Agency Swarm handoffs | CLI/TUI UX | re-port | The plan agent still needs fork handoff rules after the merge. | `origin/dev:packages/opencode/src/session/prompt.ts` |
| Builder and Plan switching are hidden in framework mode | CLI/TUI UX | re-port | Framework mode still needs a run-first surface, not raw upstream agent switching. | `origin/dev:packages/opencode/src/cli/cmd/tui/app.tsx` |
| Tab cycles recipient agents in Run mode | CLI/TUI UX | re-port | Fast target switching is part of the fork's daily run flow. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` |
| Framework-mode `/models` only shows Agency-supported providers | CLI/TUI UX | re-port | The model picker still needs to hide providers the agency path cannot use. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` |
| First prompt reaches the conversation screen without freezing | CLI/TUI UX | re-port | The first send still must mount the conversation view before auth refresh work blocks. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` |
| Run-target labels use live agency names | CLI/TUI UX | re-port | Run mode should show the real agency names users picked, not stale labels. | `origin/dev:packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx` |
| Agent Swarm theme is locked to the built-in dark palette | CLI/TUI UX | drop | One fixed dark theme is branding drift, not core fork value. | none |
| Agent Swarm wordmark replaces the OpenCode logo | CLI/TUI UX | re-port | Fork branding still matters, but upstream logo code keeps changing. | `origin/dev:packages/opencode/src/cli/logo.ts` |
| One-command launcher onboarding and project detection | Install/Upgrade | re-port | The launcher still needs to find the right Agency Swarm project with less setup guesswork. | `origin/dev:packages/opencode/src/cli/cmd/run.ts` |
| Launcher bootstraps or repairs the project Python env | Install/Upgrade | re-port | One-command launch still needs a self-heal path for broken project Python setup. | `origin/dev:packages/opencode/src/cli/cmd/run.ts` |
| Launcher refreshes `agency-swarm` inside the project `.venv` | Install/Upgrade | drop | Silent package self-updates add risk and are not worth carrying into merge prep. | none |
| Run-mode session resumes recover the last local Agency project | Install/Upgrade | re-port | Resume should still land in the right local agency project after the merge. | `origin/dev:packages/opencode/src/cli/cmd/tui/app.tsx` |
| Upgrade command rejects unsupported package-manager channels | Install/Upgrade | re-port | The fork still needs honest upgrade errors for channels it does not ship. | `origin/dev:packages/opencode/src/installation/index.ts` |
| README mode overview for Agent Builder, Plan, and Run | Web/App Surface | keep | The fork still needs one short mode map in the top-level docs. | none |
| Canonical flow map for fork entry points | Web/App Surface | keep | The fork still needs one stable flow map while merge cleanup is in flight. | none |
| Shared session web pages import fork session types | Web/App Surface | re-port | The share page still needs to compile against the fork package name after the merge. | `origin/dev:packages/web/src/pages/s/[id].astro` |
| Agency Swarm integration regression suite | Tests | re-port | The Agency Swarm bridge needs tests, but the upstream test harness moved. | `origin/dev:packages/opencode/test/session/session.test.ts` |
| Browser E2E helpers harden session and status checks | Tests | drop | Upstream removed this E2E tree, so the fork should not drag it through the merge. | none |
| Release-blocking auth smoke workflow | Release/CI | re-port | The fork should keep a real auth release gate, but upstream workflows changed. | `origin/dev:.github/workflows/publish.yml` |
| GitHub release publishes fork npm packages | Release/CI | re-port | Fork releases still need fork package publishing on top of the new upstream release flow. | `origin/dev:packages/opencode/script/publish.ts` |
| Artifact-aware requirement ledger | Policy | keep | The fork already uses this to track work and release artifacts cleanly. | none |
| Fork divergence substantiation log | Policy | drop | This is merge-prep scaffolding and should not live forever. | none |
| Upstream comparison before fork edits | Policy | keep | The fork still needs this guard after it rebases onto new upstream. | none |
| End-user proof gate for bug fixes | Policy | keep | This rule stays useful and does not depend on old fork code. | none |
| Screenshot proof gate for TUI and visual fixes | Policy | keep | This is still a good proof rule for terminal and UI fixes. | none |
| Codex pre-release review gate | Policy | keep | Release work still needs one final review gate after the merge. | none |

## Drift disposition strategy

- Runtime/session: re-audit `packages/opencode/src/agency-swarm/*` and `packages/opencode/src/session/agency-swarm.ts` against only the kept Agency Swarm rows, especially the named buckets `Agency Swarm backend adapter` (665 lines) and `Filter Codex OAuth to OpenAI-based LiteLLM runs` (392 lines), then delete anything outside that set.
- Runtime/session: drop the stale-target behavior from `Persist handed-off recipient across turns` early so the merge branch does not keep a known routing risk.
- Launcher/install: split `packages/opencode/src/agency-swarm/npx.ts`, `packages/opencode/script/publish.ts`, `packages/opencode/script/postinstall.mjs`, and `bun.lock` into cleanup PRs around the big named buckets `One-command launcher npm package` (1490 lines), `One-command launcher onboarding and project detection` (792 lines), and `Upgrade command rejects unsupported package-manager channels` (616 lines).
- Launcher/install: remove the dropped `.venv` self-update behavior before the merge, then rebuild only the launcher pieces marked `re-port`.
- Tests/app surface: do not carry the old app E2E tree into the merge branch; PR `#124` marks `packages/app/e2e/actions.ts` (1063 lines), `packages/app/e2e/fixtures.ts` (604 lines), and `packages/app/e2e/projects/workspaces.spec.ts` (368 lines) as drift or unclassified, and upstream already deleted that surface.
- Tests/app surface: keep only the named `Agency Swarm integration regression suite` bucket (7426 lines) and rebuild it on the new upstream test harness after the merge base is in place.
- Release/CI: keep only the fork release deltas tied to `Release-blocking auth smoke workflow` (359 lines) and fork npm publish, then reset unrelated workflow drift in `.github/workflows/deploy.yml`, `publish.yml`, `test.yml`, `typecheck.yml`, `nix-eval.yml`, and `pr-management.yml` back to upstream.
- Policy/docs: rewrite `AGENTS.md` from the small kept rule set instead of dragging the full mixed drift block; PR `#124` marks `AGENTS.md` as `+462/-97` drift, so the safe path is a clean minimal rewrite plus the kept ledger skill.
- Repo-level metadata: reset unclassified repo drift in `package.json`, `nix/hashes.json`, `nix/node_modules.nix`, `github/index.ts`, `infra/console.ts`, and `infra/enterprise.ts` unless one of the kept packaging or release features proves it still needs that line.
