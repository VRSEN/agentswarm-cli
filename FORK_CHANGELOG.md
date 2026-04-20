# Fork Divergence Changelog

This file records the intentional, maintainable fork delta carried on `vrsen/dev` relative to the local `origin/dev` baseline. It is a feature-level substantiation log for AGENTS.md §6.6.2, built from the current `git log --oneline origin/dev..vrsen/dev` and `git diff --stat origin/dev..vrsen/dev` snapshot rather than a raw per-file dump.

## Upstream Baseline Anchor

- `origin/dev`: `a26d53151b11151a5580f11790b768ac334fa6a8`
- `vrsen/dev`: `27e661224`
- `git rev-list --left-right --count origin/dev...vrsen/dev`: `639 173`
- Interpretation: local `vrsen/dev` is 639 commits behind upstream and 173 commits ahead with fork-only changes
- Snapshot sources: `git log --oneline origin/dev..vrsen/dev` and `git diff --stat origin/dev..vrsen/dev`

## Divergence Categories

### Branding/Packaging

- `README.md`, `install`, `package.json`, `packages/opencode/package.json`, `packages/web/package.json`, `packages/opencode/src/cli/logo.ts`
  Motivation: rename the distributed product from OpenCode to Agent Swarm CLI, rename the primary command to `agentswarm`, and point install/docs flows at fork-owned repo and docs URLs.
  Upstream-merge impact: `high` because upstream release/version metadata and public docs change often, so these files conflict on most merges.

- `packages/opencode/script/build.ts`, `packages/opencode/script/postinstall.mjs`, `packages/opencode/script/publish.ts`, `packages/opencode/bin/agency`, `script/publish.ts`, `script/version.ts`, `nix/opencode.nix`, `nix/hashes.json`, `nix/node_modules.nix`
  Motivation: publish fork-owned binaries and npm packages, including scoped platform packages and the fork launcher layout that upstream does not ship.
  Upstream-merge impact: `high` because build and release plumbing is operationally sensitive and upstream packaging changes regularly.

- `packages/util/**`, removed `packages/shared/**`, workspace manifest updates in `package.json`, `packages/app/package.json`, `packages/opencode/package.json`, `packages/ui/package.json`
  Motivation: keep the fork buildable on its current dependency graph while Agency Swarm-specific patches and imports are carried locally.
  Upstream-merge impact: `high` because package-graph changes ripple across many imports and create broad textual conflicts.

### Agency Swarm Integration

- `packages/opencode/src/agency-swarm/*`, `packages/opencode/src/index.ts`, `packages/opencode/src/config/config.ts`
  Motivation: add a first-class Agency Swarm adapter layer for backend discovery, metadata parsing, stream transport, branded config discovery, and fork product identity.
  Upstream-merge impact: `high` because upstream core has no equivalent Agency Swarm abstraction, so these files carry fork-only concepts.

- `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/session/agency-swarm-utils.ts`, `packages/opencode/src/session/prompt.ts`, `packages/opencode/src/session/processor.ts`, `packages/opencode/src/provider/provider.ts`
  Motivation: route prompt execution, structured output, cancellation, history compaction, and session resume through Agency Swarm runs instead of only upstream provider flows.
  Upstream-merge impact: `high` because these are hot core paths with frequent upstream edits and non-trivial behavioral divergence.

- `packages/opencode/src/session/agency-swarm.ts` (`resolveClientConfig`) + `packages/opencode/src/agency-swarm/litellm-provider.ts` (`isOpenAIBasedLitellmModel`)
  Motivation: scope the stored ChatGPT OAuth triplet (`base_url` = `chatgpt.com/backend-api/codex`, matching `api_key`, `ChatGPT-Account-Id` header) to OpenAI-based LiteLLM providers only. Without this, agency-swarm's upstream `_apply_client_to_agent` applies `config.base_url` to every LiteLLM agent regardless of provider, so an Anthropic/Gemini session would route Messages API calls through Codex and 404 with `{"detail":"Not Found"}`.
  Upstream-merge impact: `low` because the filter is additive and keeps pre-existing OAuth behavior for OpenAI sessions; tracked upstream as the `_is_openai_based_litellm_provider` base_url fix in agency-swarm.
  Known tradeoff: until upstream agency-swarm scopes `client_config.base_url` per-provider (tracked separately), an OpenAI-only agency run may lose its Codex OAuth `base_url`/`api_key` if the user also has a non-OpenAI LiteLLM credential stored (anthropic/gemini/etc.). Workaround: clear the unused credential from `~/.local/share/agentswarm/auth.json`, or configure an explicit OpenAI-based `client_config.base_url`.

- `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/run.ts`, `packages/opencode/src/cli/cmd/uninstall.ts`, `packages/opencode/src/cli/cmd/upgrade.ts`
  Motivation: manage local Agency Swarm bootstrap, credential forwarding, project venv upgrade and self-heal behavior, and branded startup flows.
  Upstream-merge impact: `high` because install and upgrade code is operationally fragile and the fork adds extra side effects upstream does not want.

### CLI/TUI UX

- `packages/opencode/src/cli/cmd/agencii.ts`, `packages/opencode/src/cli/cmd/serve.ts`, `packages/opencode/src/cli/cmd/run.ts`
  Motivation: add `agency` / `agencii` management commands, fork-specific server text, and launcher behaviors needed to discover and drive Agency Swarm backends.
  Upstream-merge impact: `medium` because the command surface is clearly scoped, but it sits in files upstream also edits.

- `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`, `packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`, `packages/opencode/src/cli/cmd/tui/session-error.ts`, `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx`
  Motivation: add Run mode connect and auth flows, agency selection, startup recovery, and framework-vs-run command gating for daily Agency Swarm use.
  Upstream-merge impact: `high` because upstream TUI routing, dialogs, and session flows are active areas with repeated churn.

- `packages/opencode/src/cli/cmd/tui/context/theme.tsx`, `packages/opencode/src/config/tui.ts`, `packages/opencode/src/config/tui-migrate.ts`, `packages/opencode/src/config/tui-schema.ts`
  Motivation: force the Agent Swarm palette and dark-theme defaults, including Apple Terminal fallback handling and migration out of legacy config keys.
  Upstream-merge impact: `medium` because the forked behavior is contained, but it intentionally diverges from upstream theme policy.

- `packages/ui/src/components/*`, `packages/opencode/src/cli/cmd/tui/component/prompt/*`, `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx`
  Motivation: keep tool rendering, reasoning text, footer/status affordances, and session transitions aligned with Agent Builder and Run mode expectations.
  Upstream-merge impact: `medium` because the changes are mostly presentation-level, but they span shared UI components that upstream also evolves.

### Tests

- `packages/opencode/test/agency-swarm/*`, `packages/opencode/test/session/agency-swarm*.test.ts`, `packages/opencode/test/provider/agency-swarm-provider.test.ts`, `packages/opencode/test/cli/agencii.test.ts`, `packages/opencode/test/cli/tui/session-error.test.ts`
  Motivation: lock down Agency Swarm transport, auth, session resume, and CLI/TUI bridge behavior that upstream tests do not cover.
  Upstream-merge impact: `medium` because these tests mirror fork-only APIs and will need updates whenever the integration layer moves.

- `packages/app/e2e/**`, `packages/app/src/testing/*`, `packages/app/test/e2e/*`, `packages/app/script/e2e-local.ts`
  Motivation: add a dedicated browser E2E harness for branded app/session flows, prompt controls, sidebar behavior, and regression reproduction.
  Upstream-merge impact: `medium` because the harness is large and app testing is changing upstream, but the risk is mostly maintenance overhead.

- Broad test refactors across `packages/opencode/test/**`, including new utility coverage such as `packages/opencode/test/util/flock.test.ts`
  Motivation: keep the forked core refactors and package-graph changes covered instead of relying on upstream test layout and imports.
  Upstream-merge impact: `medium` because the changes follow code movement, but they widen the fork diff in already-busy test directories.

### Web/App Surface

- `packages/app/src/app.tsx`, `packages/app/src/pages/layout.tsx`, `packages/app/src/pages/session.tsx`, `packages/app/src/components/prompt-input.tsx`, `packages/app/src/components/session/session-header.tsx`, `packages/app/src/context/global-sync/bootstrap.ts`, `packages/app/src/context/local.tsx`, `packages/ui/src/components/*`
  Motivation: support Agent Builder and Run mode, session review variants, prompt/model controls, project/workspace management, and stability fixes required by the fork’s daily workflow.
  Upstream-merge impact: `high` because upstream app shell and session work is active and these files are frequently touched.

- `packages/web/src/components/Share.tsx`, `packages/web/src/components/share/part.tsx`, `packages/web/src/pages/s/[id].astro`, `packages/web/src/content/docs/**`, `README.md`
  Motivation: rebrand public docs and share pages, document Agent Builder / Plan / Run mode, and describe the fork’s supported providers and tools.
  Upstream-merge impact: `medium` because docs are easier to refresh than runtime code, but the localization footprint is large.

- `packages/console/app/**`, `packages/console/core/**`, `packages/enterprise/**`, `packages/desktop-electron/**`, `packages/desktop/**`, `sdks/vscode/**`
  Motivation: carry fork-specific naming, download paths, provider assumptions, and launch behavior through every shipped surface that still presents or launches the product.
  Upstream-merge impact: `high` because this spreads the fork delta across multiple products with independent upstream churn.

### Release/CI

- `.github/workflows/publish-npm-on-release.yml`, `.github/workflows/publish.yml`, `.github/workflows/deploy.yml`, `.github/workflows/test.yml`, `.github/workflows/typecheck.yml`, `.github/workflows/nix-eval.yml`, `.github/workflows/pr-management.yml`
  Motivation: route release and CI through fork-owned repos, runners, secrets, and guardrails instead of anomalyco infrastructure.
  Upstream-merge impact: `medium` because workflow files are isolated, but they conflict whenever upstream CI policy changes.

- `.github/workflows/auth-smoke.yml`, `packages/opencode/script/auth-smoke-test.py`, related auth-smoke wiring in CI
  Motivation: add a release-blocking real-auth smoke gate for OpenAI and Anthropic happy paths before shipping fork releases.
  Upstream-merge impact: `medium` because the workflow is intentionally fork-specific and secret-sensitive, but the touched surface is limited.

- `AGENTS.md`, `CLAUDE.md`, `.agentswarm/skills/requirement-ledger/*`, `FORK_CHANGELOG.md`
  Motivation: enforce clean-fork operating rules, symlinked policy distribution, durable requirement tracking, and explicit divergence substantiation.
  Upstream-merge impact: `medium` because these files are mostly fork-local, but policy churn is continuous and must stay synchronized inside the fork.

## Future Reconciliation Targets

- Collapse packaging drift back toward upstream once Agency Swarm naming and publish needs can be expressed as configuration instead of hard-forked manifests and scripts.
- Reduce core-path Agency Swarm hooks by upstreaming generic provider and session extension points; keep only the Agency Swarm adapter layer fork-local.
- Shrink the dark-palette and theme fork to a branded preset if upstream theme APIs can express the same behavior.
- Upstream or neutralize the large app E2E harness pieces that are not inherently brand-specific.
- Replace repeated web/docs/console brand edits with shared brand tokens or templating so new upstream docs do not require mass manual merges.
- Revisit the `packages/util` / `packages/shared` graph drift and dependency pins; restore upstream layout where Agency Swarm behavior does not depend on the forked shape.

## Maintenance Protocol

1. Refresh the anchor block with `git rev-parse origin/dev`, `git rev-parse --short vrsen/dev`, `git rev-list --left-right --count origin/dev...vrsen/dev`, `git log --oneline origin/dev..vrsen/dev`, and `git diff --stat origin/dev..vrsen/dev`.
2. Before editing any file that also exists in `origin/dev`, compare the upstream version first and record the intended behavior delta, per AGENTS.md §6.6.1.
3. If the edit creates or preserves a fork-only divergence, add or update the matching entry in this file with files/features, observed motivation, and upstream-merge impact, satisfying AGENTS.md §6.6.2.
4. If the divergence is no longer strictly required for the fork directive, remove it and restore the upstream shape instead of documenting more drift, per AGENTS.md §6.6.3.
5. Keep entries feature-level and human-readable; use raw `git diff --name-status origin/dev..vrsen/dev` only when a reviewer needs the full file inventory.
