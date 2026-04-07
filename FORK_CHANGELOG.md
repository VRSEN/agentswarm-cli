# Fork Changelog: `origin/dev` -> `vrsen/dev`

This document records the fork delta from upstream OpenCode.

## Baseline

- Upstream baseline: `origin/dev` at `7afb517a1a22`
- Functional fork anchor: `vrsen/dev` at `847ce4d21aa2` (`docs: codify clean-fork branch policy`)
- Remote parity: `vrsen/dev` == `private/dev`
- Current divergence can be rechecked with: `git rev-list --left-right --count origin/dev...vrsen/dev`

## Scope Summary

- Functional delta (`origin/dev..847ce4d21`): 15 commits
- Functional file delta: 63 files changed
- Functional diff size: 6,946 insertions / 657 deletions
- Functional name-status mix: 18 added, 45 modified

## Functional Fork Commits (Oldest -> Newest)

```text
fd2f678ba Rebuild agentswarm-cli on upstream dev
02a39d3f9 Fix release workflow repo gate
5a2b87495 Fix release workspace dependency
cbcbe79b0 fix(opencode): repair release packaging regressions
09fe1aa81 fix(opencode): restore provider dialog behavior
d98ff114a fix(opencode): tighten release and cli regressions
bedc977e2 fix(opencode): finish rebuild validation fixes
8208a554b fix(opencode): restore agencii and release flows
3e58a0b52 fix(ci): cap windows e2e workers
7c7b88dd5 Fix agency rebuild regressions and stabilize CI
d2070ec31 tui: enforce dark-only theme
6bb0fac58 tui: lock built-in dark palette
5962ebc46 release: cut 1.3.16
556a1c9e3 merge: sync fork dev with upstream dev
847ce4d21 docs: codify clean-fork branch policy
```

## Functional Change Areas

## 1) Branding, Packaging, Release

- CLI/package identity is whitelabeled:
  - package name uses `agentswarm-cli`
  - runtime command uses `agentswarm`
  - launcher binary `packages/opencode/bin/agency` is added
- Fork release path retargeted to fork repo/workflow:
  - `.github/workflows/publish-npm-on-release.yml` added
  - release/install scripts adjusted (`install`, `script/build.ts`, `script/postinstall.mjs`, `script/publish.ts`)
- Distribution/build touch points updated:
  - `packages/opencode/Dockerfile`
  - `packages/opencode/src/installation/index.ts`
  - `packages/opencode/src/cli/cmd/upgrade.ts`
  - `packages/opencode/src/cli/cmd/uninstall.ts`
- Current fork version line is `1.3.16` in fork-owned package manifests.

## 2) Agency Swarm Integration

- New integration modules:
  - `packages/opencode/src/agency-swarm/adapter.ts`
  - `packages/opencode/src/agency-swarm/history.ts`
  - `packages/opencode/src/agency-swarm/product.ts`
  - `packages/opencode/src/agency-swarm/tui.ts`
  - `packages/opencode/src/session/agency-swarm.ts`
  - `packages/opencode/src/session/agency-swarm-utils.ts`
- Provider/session flow extended to support Agency Swarm metadata + stream processing.
- Session pipeline integration updated in:
  - `packages/opencode/src/session/prompt.ts`
  - `packages/opencode/src/session/processor.ts`
  - `packages/opencode/src/provider/provider.ts`

## 3) CLI/TUI UX Changes

- New command surface:
  - `packages/opencode/src/cli/cmd/agencii.ts`
- Agency-focused connect/agent dialogs and sidebar/footer/session updates in TUI components.
- Session error handling path added:
  - `packages/opencode/src/cli/cmd/tui/session-error.ts`
- Theme behavior changed to dark-only policy and locked built-in palette:
  - `packages/opencode/src/cli/cmd/tui/context/theme.tsx`
  - `packages/opencode/src/config/tui.ts`
  - `packages/opencode/src/config/tui-migrate.ts`
  - `packages/opencode/src/config/tui-schema.ts`

## 4) Tests Added/Updated

- New Agency integration tests added under:
  - `packages/opencode/test/agency-swarm/*`
  - `packages/opencode/test/session/agency-swarm*.test.ts`
  - `packages/opencode/test/provider/agency-swarm-provider.test.ts`
  - `packages/opencode/test/cli/agencii.test.ts`
  - `packages/opencode/test/cli/tui/session-error.test.ts`
- Existing TUI/config/plugin tests updated for fork behavior.

## 5) Web/App Surface

- Web package metadata and share components adjusted to fork naming/runtime:
  - `packages/web/package.json`
  - `packages/web/src/components/Share.tsx`
  - `packages/web/src/components/share/part.tsx`
  - `packages/web/src/pages/s/[id].astro`
- App shell entry touched:
  - `packages/app/src/app.tsx`

## Policy Changes in This Fork

- `AGENTS.md` now codifies clean-fork branch policy:
  - fork remotes must stay SHA-aligned
  - `dev` must be append-only (no rewrite/force-push)
  - upstream sync uses merge-based flow
  - rewrite exceptions require backup refs + `range-diff` proof

## Full Functional File Inventory (`origin/dev..847ce4d21`)

```text
A	.github/workflows/publish-npm-on-release.yml
M	.github/workflows/test.yml
M	AGENTS.md
M	bun.lock
M	install
M	packages/app/src/app.tsx
M	packages/opencode/Dockerfile
A	packages/opencode/bin/agency
M	packages/opencode/package.json
M	packages/opencode/script/build.ts
M	packages/opencode/script/postinstall.mjs
M	packages/opencode/script/publish.ts
A	packages/opencode/src/agency-swarm/adapter.ts
A	packages/opencode/src/agency-swarm/history.ts
A	packages/opencode/src/agency-swarm/product.ts
A	packages/opencode/src/agency-swarm/tui.ts
A	packages/opencode/src/cli/cmd/agencii.ts
M	packages/opencode/src/cli/cmd/pr.ts
M	packages/opencode/src/cli/cmd/run.ts
M	packages/opencode/src/cli/cmd/serve.ts
M	packages/opencode/src/cli/cmd/tui/app.tsx
M	packages/opencode/src/cli/cmd/tui/attach.ts
M	packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx
M	packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx
M	packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx
M	packages/opencode/src/cli/cmd/tui/context/theme.tsx
M	packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx
M	packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx
M	packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
M	packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx
A	packages/opencode/src/cli/cmd/tui/session-error.ts
M	packages/opencode/src/cli/cmd/tui/thread.ts
M	packages/opencode/src/cli/cmd/uninstall.ts
M	packages/opencode/src/cli/cmd/upgrade.ts
M	packages/opencode/src/cli/cmd/web.ts
M	packages/opencode/src/cli/logo.ts
M	packages/opencode/src/config/config.ts
M	packages/opencode/src/config/tui-migrate.ts
M	packages/opencode/src/config/tui-schema.ts
M	packages/opencode/src/config/tui.ts
M	packages/opencode/src/effect/cross-spawn-spawner.ts
M	packages/opencode/src/index.ts
M	packages/opencode/src/installation/index.ts
M	packages/opencode/src/provider/provider.ts
A	packages/opencode/src/session/agency-swarm-utils.ts
A	packages/opencode/src/session/agency-swarm.ts
M	packages/opencode/src/session/processor.ts
M	packages/opencode/src/session/prompt.ts
A	packages/opencode/test/agency-swarm/adapter.test.ts
A	packages/opencode/test/agency-swarm/history.test.ts
A	packages/opencode/test/agency-swarm/tui.test.ts
A	packages/opencode/test/cli/agencii.test.ts
M	packages/opencode/test/cli/tui/plugin-loader.test.ts
A	packages/opencode/test/cli/tui/session-error.test.ts
M	packages/opencode/test/cli/tui/theme-store.test.ts
M	packages/opencode/test/config/tui.test.ts
A	packages/opencode/test/provider/agency-swarm-provider.test.ts
A	packages/opencode/test/session/agency-swarm-utils.test.ts
A	packages/opencode/test/session/agency-swarm.test.ts
M	packages/web/package.json
M	packages/web/src/components/Share.tsx
M	packages/web/src/components/share/part.tsx
M	packages/web/src/pages/s/[id].astro
```

## Regeneration Commands

```bash
git fetch --all --prune
# current fork snapshot
git rev-list --left-right --count origin/dev...vrsen/dev
git log --oneline --reverse origin/dev..vrsen/dev
git diff --stat origin/dev..vrsen/dev
git diff --name-status origin/dev..vrsen/dev
# stable functional anchor used in this document
git log --oneline --reverse origin/dev..847ce4d21
git diff --stat origin/dev..847ce4d21
git diff --name-status origin/dev..847ce4d21
```
