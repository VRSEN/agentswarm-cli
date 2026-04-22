# FORK_LINE_CLASSIFICATION

- Files processed: 1211
- Changed lines classified: 175707
- Top buckets by changed lines:

| Bucket | Lines |
| --- | ---: |
| Agency Swarm integration regression suite | 7426 |
| One-command launcher npm package | 1490 |
| One-command launcher onboarding and project detection | 792 |
| Agency Swarm backend adapter | 665 |
| Upgrade command rejects unsupported package-manager channels | 616 |
| Artifact-aware requirement ledger | 475 |
| Filter Codex OAuth to OpenAI-based LiteLLM runs | 392 |
| Release-blocking auth smoke workflow | 359 |
| Canonical flow map for fork entry points | 346 |
| Agent Swarm CLI name and `agentswarm` command | 337 |
- Drift/Unclassified lines: 159399
- Escalations: 1161

## Method

- The bucket labels come from `FORK_CHANGELOG.md` on local `vrsen/docs/fork-changelog-feature-audit`. I re-read that file at the start of each top-level directory pass.
- Files are ordered by top-level directory, then path. Each file gets one section.
- Exact line ranges use current `vrsen/dev` line numbers when the changed content exists in the fork tree. Mixed modified files use `All changed lines (+A/-D)` when a clean current-file range would be misleading.
- Bulk mechanical files keep one line when they are lockfiles or generated artifacts.
- Any assignment below 80% confidence stays in `Drift/Unclassified` and is repeated in the appendix as a numbered question.

## .agentswarm

### .agentswarm/.gitignore

- **Artifact-aware requirement ledger** — lines 1-1 (ledger support file)

### .agentswarm/skills/requirement-ledger/SKILL.md

- **Artifact-aware requirement ledger** — lines 1-101 (ledger skill instructions)

### .agentswarm/skills/requirement-ledger/scripts/requirement_ledger.py

- **Artifact-aware requirement ledger** — lines 1-373 (ledger CLI implementation)

## .github

### .github/VOUCHED.td

- **Drift/Unclassified** — All changed lines (+0/-4) (repo workflow or metadata drift)

### .github/workflows/auth-smoke.yml

- **Release-blocking auth smoke workflow** — lines 1-56 (auth smoke release gate workflow)

### .github/workflows/deploy.yml

- **Drift/Unclassified** — All changed lines (+1/-0) (repo workflow or metadata drift)

### .github/workflows/nix-eval.yml

- **Drift/Unclassified** — All changed lines (+7/-1) (repo workflow or metadata drift)

### .github/workflows/pr-management.yml

- **Drift/Unclassified** — All changed lines (+1/-1) (repo workflow or metadata drift)

### .github/workflows/publish-npm-on-release.yml

- **GitHub release publishes fork npm packages** — lines 1-58 (fork npm publish workflow)

### .github/workflows/publish.yml

- **Drift/Unclassified** — All changed lines (+1/-2) (repo workflow or metadata drift)

### .github/workflows/test.yml

- **Drift/Unclassified** — All changed lines (+12/-18) (repo workflow or metadata drift)

### .github/workflows/typecheck.yml

- **Drift/Unclassified** — All changed lines (+7/-1) (repo workflow or metadata drift)

## .opencode

### .opencode/.gitignore

- **Drift/Unclassified** — All changed lines (+1/-2) (local app config or tool drift)

### .opencode/agent/translator.md

- **Drift/Unclassified** — All changed lines (+1/-0) (local app config or tool drift)

### .opencode/opencode.jsonc

- **Drift/Unclassified** — All changed lines (+5/-1) (local app config or tool drift)

### .opencode/skills/effect/SKILL.md

- **Drift/Unclassified** — All changed lines (+0/-21) (local app config or tool drift)

### .opencode/themes/mytheme.json

- **Agent Swarm palette is the safe default** — All changed lines (+2/-2) (fork theme token changes)

### .opencode/tool/github-pr-search.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (local app config or tool drift)

### .opencode/tool/github-triage.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (local app config or tool drift)

## (root)

### .oxlintrc.json

- **Drift/Unclassified** — All changed lines (+0/-51) (repo-level fork drift)

### AGENTS.md

- **Drift/Unclassified** — All changed lines (+462/-97) (mixed policy rewrite spanning named and unnamed rule changes)

### CLAUDE.md

- **Drift/Unclassified** — All changed lines (+1/-0) (mixed policy rewrite spanning named and unnamed rule changes)

### FORK_CHANGELOG.md

- **Fork divergence substantiation log** — lines 1-123 (fork feature audit source of truth)

### README.md

- **README mode overview for Agent Builder, Plan, and Run** — All changed lines (+5/-3) (top-level mode overview docs)

### USER_FLOWS.md

- **Canonical flow map for fork entry points** — lines 1-346 (fork user-flow map)

### bun.lock

- **One-command launcher npm package** — All changed lines (+480/-661) (derived lockfile for fork packaging changes)

## github

### github/index.ts

- **Drift/Unclassified** — All changed lines (+6/-6) (repo-level fork drift)

## infra

### infra/console.ts

- **Drift/Unclassified** — All changed lines (+1/-0) (repo-level fork drift)

### infra/enterprise.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (repo-level fork drift)

## (root)

### install

- **Agent Swarm CLI name and `agentswarm` command** — All changed lines (+32/-26) (shell installer branding and command rename)

## nix

### nix/hashes.json

- **Drift/Unclassified** — All changed lines (+4/-4) (repo-level fork drift)

### nix/node_modules.nix

- **Drift/Unclassified** — All changed lines (+0/-1) (repo-level fork drift)

## (root)

### package.json

- **Drift/Unclassified** — All changed lines (+6/-17) (repo-level fork drift)

## packages

### packages/app/README.md

- **Drift/Unclassified** — All changed lines (+3/-2) (fork app-surface divergence)

### packages/app/e2e/AGENTS.md

- **Drift/Unclassified** — lines 1-225 (fork app-surface divergence)

### packages/app/e2e/actions.ts

- **Drift/Unclassified** — lines 1-1063 (fork app-surface divergence)

### packages/app/e2e/app/home.spec.ts

- **Drift/Unclassified** — lines 1-24 (fork app-surface divergence)

### packages/app/e2e/app/navigation.spec.ts

- **Drift/Unclassified** — lines 1-10 (fork app-surface divergence)

### packages/app/e2e/app/palette.spec.ts

- **Drift/Unclassified** — lines 1-20 (fork app-surface divergence)

### packages/app/e2e/app/server-default.spec.ts

- **Drift/Unclassified** — lines 1-48 (fork app-surface divergence)

### packages/app/e2e/app/session.spec.ts

- **Drift/Unclassified** — lines 1-16 (fork app-surface divergence)

### packages/app/e2e/app/titlebar-history.spec.ts

- **Drift/Unclassified** — lines 1-120 (fork app-surface divergence)

### packages/app/e2e/backend.ts

- **Drift/Unclassified** — lines 1-137 (fork app-surface divergence)

### packages/app/e2e/commands/input-focus.spec.ts

- **Drift/Unclassified** — lines 1-16 (fork app-surface divergence)

### packages/app/e2e/commands/panels.spec.ts

- **Drift/Unclassified** — lines 1-33 (fork app-surface divergence)

### packages/app/e2e/commands/tab-close.spec.ts

- **Drift/Unclassified** — lines 1-32 (fork app-surface divergence)

### packages/app/e2e/files/file-open.spec.ts

- **Drift/Unclassified** — lines 1-31 (fork app-surface divergence)

### packages/app/e2e/files/file-tree.spec.ts

- **Drift/Unclassified** — lines 1-56 (fork app-surface divergence)

### packages/app/e2e/files/file-viewer.spec.ts

- **Drift/Unclassified** — lines 1-156 (fork app-surface divergence)

### packages/app/e2e/fixtures.ts

- **Drift/Unclassified** — lines 1-604 (fork app-surface divergence)

### packages/app/e2e/models/model-picker.spec.ts

- **Drift/Unclassified** — lines 1-48 (fork app-surface divergence)

### packages/app/e2e/models/models-visibility.spec.ts

- **Drift/Unclassified** — lines 1-61 (fork app-surface divergence)

### packages/app/e2e/projects/project-edit.spec.ts

- **Drift/Unclassified** — lines 1-49 (fork app-surface divergence)

### packages/app/e2e/projects/projects-close.spec.ts

- **Drift/Unclassified** — lines 1-49 (fork app-surface divergence)

### packages/app/e2e/projects/projects-switch.spec.ts

- **Drift/Unclassified** — lines 1-94 (fork app-surface divergence)

### packages/app/e2e/projects/workspace-new-session.spec.ts

- **Drift/Unclassified** — lines 1-78 (fork app-surface divergence)

### packages/app/e2e/projects/workspaces.spec.ts

- **Drift/Unclassified** — lines 1-368 (fork app-surface divergence)

### packages/app/e2e/prompt/context.spec.ts

- **Drift/Unclassified** — lines 1-95 (fork app-surface divergence)

### packages/app/e2e/prompt/mock.ts

- **Drift/Unclassified** — lines 1-15 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-async.spec.ts

- **Drift/Unclassified** — lines 1-54 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-drop-file-uri.spec.ts

- **Drift/Unclassified** — lines 1-22 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-drop-file.spec.ts

- **Drift/Unclassified** — lines 1-30 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-footer-focus.spec.ts

- **Drift/Unclassified** — lines 1-88 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-history.spec.ts

- **Drift/Unclassified** — lines 1-146 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-mention.spec.ts

- **Drift/Unclassified** — lines 1-26 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-multiline.spec.ts

- **Drift/Unclassified** — lines 1-24 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-shell.spec.ts

- **Drift/Unclassified** — lines 1-74 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-slash-open.spec.ts

- **Drift/Unclassified** — lines 1-22 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-slash-share.spec.ts

- **Drift/Unclassified** — lines 1-66 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt-slash-terminal.spec.ts

- **Drift/Unclassified** — lines 1-18 (fork app-surface divergence)

### packages/app/e2e/prompt/prompt.spec.ts

- **Drift/Unclassified** — lines 1-28 (fork app-surface divergence)

### packages/app/e2e/selectors.ts

- **Drift/Unclassified** — lines 1-65 (fork app-surface divergence)

### packages/app/e2e/session/session-child-navigation.spec.ts

- **Drift/Unclassified** — lines 1-64 (fork app-surface divergence)

### packages/app/e2e/session/session-composer-dock.spec.ts

- **Drift/Unclassified** — lines 1-655 (fork app-surface divergence)

### packages/app/e2e/session/session-model-persistence.spec.ts

- **Drift/Unclassified** — lines 1-366 (fork app-surface divergence)

### packages/app/e2e/session/session-review.spec.ts

- **Drift/Unclassified** — lines 1-440 (fork app-surface divergence)

### packages/app/e2e/session/session-undo-redo.spec.ts

- **Drift/Unclassified** — lines 1-233 (fork app-surface divergence)

### packages/app/e2e/session/session.spec.ts

- **Drift/Unclassified** — lines 1-182 (fork app-surface divergence)

### packages/app/e2e/settings/settings-keybinds.spec.ts

- **Drift/Unclassified** — lines 1-389 (fork app-surface divergence)

### packages/app/e2e/settings/settings-models.spec.ts

- **Drift/Unclassified** — lines 1-122 (fork app-surface divergence)

### packages/app/e2e/settings/settings-providers.spec.ts

- **Drift/Unclassified** — lines 1-136 (fork app-surface divergence)

### packages/app/e2e/settings/settings.spec.ts

- **Drift/Unclassified** — lines 1-713 (fork app-surface divergence)

### packages/app/e2e/sidebar/sidebar-popover-actions.spec.ts

- **Drift/Unclassified** — lines 1-109 (fork app-surface divergence)

### packages/app/e2e/sidebar/sidebar-session-links.spec.ts

- **Drift/Unclassified** — lines 1-30 (fork app-surface divergence)

### packages/app/e2e/sidebar/sidebar.spec.ts

- **Drift/Unclassified** — lines 1-40 (fork app-surface divergence)

### packages/app/e2e/status/status-popover.spec.ts

- **Drift/Unclassified** — lines 1-67 (fork app-surface divergence)

### packages/app/e2e/terminal/terminal-init.spec.ts

- **Drift/Unclassified** — lines 1-28 (fork app-surface divergence)

### packages/app/e2e/terminal/terminal-reconnect.spec.ts

- **Drift/Unclassified** — lines 1-45 (fork app-surface divergence)

### packages/app/e2e/terminal/terminal-tabs.spec.ts

- **Drift/Unclassified** — lines 1-165 (fork app-surface divergence)

### packages/app/e2e/terminal/terminal.spec.ts

- **Drift/Unclassified** — lines 1-18 (fork app-surface divergence)

### packages/app/e2e/thinking-level.spec.ts

- **Drift/Unclassified** — lines 1-25 (fork app-surface divergence)

### packages/app/e2e/todo.spec.ts

- **Drift/Unclassified** — All changed lines (+0/-11) (fork app-surface divergence)

### packages/app/e2e/tsconfig.json

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/e2e/utils.ts

- **Drift/Unclassified** — lines 1-63 (fork app-surface divergence)

### packages/app/package.json

- **Drift/Unclassified** — All changed lines (+4/-4) (fork app-surface divergence)

### packages/app/public/assets/JetBrainsMonoNerdFontMono-Regular.woff2

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (fork app-surface divergence)

### packages/app/script/e2e-local.ts

- **Drift/Unclassified** — lines 1-180 (fork app-surface divergence)

### packages/app/src/addons/serialize.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/addons/serialize.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/app.tsx

- **Drift/Unclassified** — All changed lines (+37/-40) (fork app-surface divergence)

### packages/app/src/components/dialog-connect-provider.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/components/dialog-edit-project.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/dialog-fork.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/dialog-select-directory.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/dialog-select-file.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (fork app-surface divergence)

### packages/app/src/components/dialog-select-server.tsx

- **Drift/Unclassified** — All changed lines (+6/-6) (fork app-surface divergence)

### packages/app/src/components/file-tree.tsx

- **Drift/Unclassified** — All changed lines (+2/-1) (fork app-surface divergence)

### packages/app/src/components/prompt-input.tsx

- **Drift/Unclassified** — All changed lines (+124/-136) (fork app-surface divergence)

### packages/app/src/components/prompt-input/build-request-parts.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/prompt-input/context-items.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/prompt-input/slash-popover.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/prompt-input/submit.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/prompt-input/submit.ts

- **Drift/Unclassified** — All changed lines (+13/-16) (fork app-surface divergence)

### packages/app/src/components/session-context-usage.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/session/session-context-tab.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/components/session/session-header.tsx

- **Drift/Unclassified** — All changed lines (+45/-62) (fork app-surface divergence)

### packages/app/src/components/session/session-new-view.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/session/session-sortable-tab.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/session/session-sortable-terminal-tab.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/components/settings-general.tsx

- **Drift/Unclassified** — All changed lines (+0/-113) (fork app-surface divergence)

### packages/app/src/components/terminal.tsx

- **Drift/Unclassified** — All changed lines (+25/-14) (fork app-surface divergence)

### packages/app/src/components/titlebar.tsx

- **Drift/Unclassified** — All changed lines (+34/-43) (fork app-surface divergence)

### packages/app/src/context/file.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/context/global-sdk.tsx

- **Drift/Unclassified** — All changed lines (+1/-7) (fork app-surface divergence)

### packages/app/src/context/global-sync.tsx

- **Drift/Unclassified** — All changed lines (+53/-64) (fork app-surface divergence)

### packages/app/src/context/global-sync/bootstrap.ts

- **Drift/Unclassified** — All changed lines (+162/-188) (fork app-surface divergence)

### packages/app/src/context/global-sync/child-store.ts

- **Drift/Unclassified** — All changed lines (+3/-11) (fork app-surface divergence)

### packages/app/src/context/global-sync/event-reducer.ts

- **Drift/Unclassified** — All changed lines (+12/-17) (fork app-surface divergence)

### packages/app/src/context/global-sync/queue.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (fork app-surface divergence)

### packages/app/src/context/global-sync/session-cache.test.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (fork app-surface divergence)

### packages/app/src/context/global-sync/session-cache.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/context/global-sync/types.ts

- **Drift/Unclassified** — All changed lines (+3/-2) (fork app-surface divergence)

### packages/app/src/context/layout.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (fork app-surface divergence)

### packages/app/src/context/local.tsx

- **Drift/Unclassified** — All changed lines (+50/-2) (fork app-surface divergence)

### packages/app/src/context/notification.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/context/permission-auto-respond.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/context/permission-auto-respond.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/context/prompt.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (fork app-surface divergence)

### packages/app/src/context/settings.tsx

- **Drift/Unclassified** — All changed lines (+0/-57) (fork app-surface divergence)

### packages/app/src/context/sync.tsx

- **Drift/Unclassified** — All changed lines (+4/-5) (fork app-surface divergence)

### packages/app/src/context/terminal.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/env.d.ts

- **Drift/Unclassified** — All changed lines (+3/-2) (fork app-surface divergence)

### packages/app/src/i18n/ar.ts

- **Drift/Unclassified** — All changed lines (+1/-5) (fork app-surface divergence)

### packages/app/src/i18n/br.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/bs.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/da.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/de.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/en.ts

- **Drift/Unclassified** — All changed lines (+1/-17) (fork app-surface divergence)

### packages/app/src/i18n/es.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/fr.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/ja.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/ko.ts

- **Drift/Unclassified** — All changed lines (+6/-7) (fork app-surface divergence)

### packages/app/src/i18n/no.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/pl.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/ru.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/th.ts

- **Drift/Unclassified** — All changed lines (+1/-6) (fork app-surface divergence)

### packages/app/src/i18n/tr.ts

- **Drift/Unclassified** — All changed lines (+1/-7) (fork app-surface divergence)

### packages/app/src/i18n/zh.ts

- **Drift/Unclassified** — All changed lines (+1/-5) (fork app-surface divergence)

### packages/app/src/i18n/zht.ts

- **Drift/Unclassified** — All changed lines (+1/-5) (fork app-surface divergence)

### packages/app/src/index.css

- **Drift/Unclassified** — All changed lines (+0/-16) (fork app-surface divergence)

### packages/app/src/pages/directory-layout.tsx

- **Drift/Unclassified** — All changed lines (+7/-6) (fork app-surface divergence)

### packages/app/src/pages/error.tsx

- **Drift/Unclassified** — All changed lines (+9/-1) (fork app-surface divergence)

### packages/app/src/pages/home.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/pages/layout.tsx

- **Drift/Unclassified** — All changed lines (+190/-196) (fork app-surface divergence)

### packages/app/src/pages/layout/helpers.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/pages/layout/sidebar-items.tsx

- **Drift/Unclassified** — All changed lines (+2/-4) (fork app-surface divergence)

### packages/app/src/pages/layout/sidebar-project.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/pages/layout/sidebar-workspace.tsx

- **Drift/Unclassified** — All changed lines (+11/-11) (fork app-surface divergence)

### packages/app/src/pages/session.tsx

- **Drift/Unclassified** — All changed lines (+187/-80) (fork app-surface divergence)

### packages/app/src/pages/session/composer/session-composer-state.ts

- **Drift/Unclassified** — All changed lines (+53/-2) (fork app-surface divergence)

### packages/app/src/pages/session/composer/session-todo-dock.tsx

- **Drift/Unclassified** — All changed lines (+21/-1) (fork app-surface divergence)

### packages/app/src/pages/session/file-tabs.tsx

- **Drift/Unclassified** — All changed lines (+7/-1) (fork app-surface divergence)

### packages/app/src/pages/session/helpers.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/pages/session/message-timeline.tsx

- **Drift/Unclassified** — All changed lines (+6/-6) (fork app-surface divergence)

### packages/app/src/pages/session/review-tab.tsx

- **Drift/Unclassified** — All changed lines (+3/-5) (fork app-surface divergence)

### packages/app/src/pages/session/session-side-panel.tsx

- **Drift/Unclassified** — All changed lines (+86/-99) (fork app-surface divergence)

### packages/app/src/pages/session/terminal-panel.tsx

- **Drift/Unclassified** — All changed lines (+6/-0) (fork app-surface divergence)

### packages/app/src/pages/session/use-session-commands.tsx

- **Drift/Unclassified** — All changed lines (+7/-19) (fork app-surface divergence)

### packages/app/src/testing/model-selection.ts

- **Drift/Unclassified** — lines 1-109 (fork app-surface divergence)

### packages/app/src/testing/prompt.ts

- **Drift/Unclassified** — lines 1-83 (fork app-surface divergence)

### packages/app/src/testing/session-composer.ts

- **Drift/Unclassified** — lines 1-84 (fork app-surface divergence)

### packages/app/src/testing/terminal.ts

- **Drift/Unclassified** — lines 1-119 (fork app-surface divergence)

### packages/app/src/utils/base64.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (fork app-surface divergence)

### packages/app/src/utils/diffs.test.ts

- **Drift/Unclassified** — All changed lines (+0/-74) (fork app-surface divergence)

### packages/app/src/utils/diffs.ts

- **Drift/Unclassified** — All changed lines (+0/-49) (fork app-surface divergence)

### packages/app/src/utils/persist.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (fork app-surface divergence)

### packages/app/src/utils/runtime-adapters.test.ts

- **Drift/Unclassified** — All changed lines (+0/-2) (fork app-surface divergence)

### packages/app/src/utils/server.ts

- **Drift/Unclassified** — All changed lines (+1/-4) (fork app-surface divergence)

### packages/app/test/e2e/mock.test.ts

- **Drift/Unclassified** — lines 1-66 (fork app-surface divergence)

### packages/app/test/e2e/no-real-llm.test.ts

- **Drift/Unclassified** — lines 1-27 (fork app-surface divergence)

### packages/console/app/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/script/generate-sitemap.ts

- **Drift/Unclassified** — All changed lines (+2/-1) (package-level fork drift)

### packages/console/app/src/component/email-signup.tsx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/console/app/src/component/header.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/component/icon.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/src/component/spotlight.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/context/auth.session.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/console/app/src/i18n/ar.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/br.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/da.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/de.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/en.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/es.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/fr.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/it.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/ja.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/ko.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/no.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/pl.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/ru.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/th.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/tr.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/zh.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/i18n/zht.ts

- **Drift/Unclassified** — All changed lines (+7/-16) (package-level fork drift)

### packages/console/app/src/routes/api/enterprise.ts

- **Drift/Unclassified** — All changed lines (+2/-54) (package-level fork drift)

### packages/console/app/src/routes/auth/status.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/bench/[id].tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/black/subscribe/[plan].tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/debug/index.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/download/[channel]/[platform].ts

- **Drift/Unclassified** — All changed lines (+3/-12) (package-level fork drift)

### packages/console/app/src/routes/download/index.css

- **Drift/Unclassified** — All changed lines (+1/-2) (package-level fork drift)

### packages/console/app/src/routes/download/index.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/go/index.css

- **Drift/Unclassified** — All changed lines (+1/-68) (package-level fork drift)

### packages/console/app/src/routes/go/index.tsx

- **Drift/Unclassified** — All changed lines (+14/-70) (package-level fork drift)

### packages/console/app/src/routes/index.tsx

- **Drift/Unclassified** — All changed lines (+5/-2) (package-level fork drift)

### packages/console/app/src/routes/stripe/webhook.ts

- **Drift/Unclassified** — All changed lines (+0/-7) (package-level fork drift)

### packages/console/app/src/routes/temp.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/user-menu.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/workspace-picker.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/black-section.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/index.tsx

- **Drift/Unclassified** — All changed lines (+0/-2) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/monthly-limit-section.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/redeem-section.module.css

- **Drift/Unclassified** — All changed lines (+0/-61) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/redeem-section.tsx

- **Drift/Unclassified** — All changed lines (+0/-71) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/billing/reload-section.tsx

- **Drift/Unclassified** — All changed lines (+12/-12) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/go/lite-section.tsx

- **Drift/Unclassified** — All changed lines (+2/-5) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/keys/key-section.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/members/member-section.tsx

- **Drift/Unclassified** — All changed lines (+11/-11) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/model-section.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/provider-section.tsx

- **Drift/Unclassified** — All changed lines (+7/-10) (package-level fork drift)

### packages/console/app/src/routes/workspace/[id]/settings/settings-section.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/src/routes/zen/index.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/util/dataDumper.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/src/routes/zen/util/error.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/util/handler.ts

- **Drift/Unclassified** — All changed lines (+32/-59) (package-level fork drift)

### packages/console/app/src/routes/zen/util/keyRateLimiter.ts

- **Drift/Unclassified** — All changed lines (+0/-39) (package-level fork drift)

### packages/console/app/src/routes/zen/util/modelTpmLimiter.ts

- **Drift/Unclassified** — All changed lines (+0/-47) (package-level fork drift)

### packages/console/app/src/routes/zen/util/provider/anthropic.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/util/provider/google.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/util/provider/openai-compatible.ts

- **Drift/Unclassified** — All changed lines (+6/-9) (package-level fork drift)

### packages/console/app/src/routes/zen/util/provider/openai.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/util/rateLimiter.ts

- **Drift/Unclassified** — All changed lines (+8/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/v1/models.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/app/src/routes/zen/v1/models/[model].ts

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/console/app/test/rateLimiter.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/core/migrations/20260414235536_lame_wild_child/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-6) (generated migration snapshot drift)

### packages/console/core/migrations/20260414235536_lame_wild_child/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2515) (generated migration snapshot drift)

### packages/console/core/migrations/20260415002256_perpetual_karen_page/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-1) (generated migration snapshot drift)

### packages/console/core/migrations/20260415002256_perpetual_karen_page/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2515) (generated migration snapshot drift)

### packages/console/core/migrations/20260415002534_far_smasher/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-1) (generated migration snapshot drift)

### packages/console/core/migrations/20260415002534_far_smasher/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2515) (generated migration snapshot drift)

### packages/console/core/migrations/20260417071612_tidy_diamondback/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-6) (generated migration snapshot drift)

### packages/console/core/migrations/20260417071612_tidy_diamondback/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2567) (generated migration snapshot drift)

### packages/console/core/migrations/20260418195905_shocking_marvel_zombies/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-6) (generated migration snapshot drift)

### packages/console/core/migrations/20260418195905_shocking_marvel_zombies/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2619) (generated migration snapshot drift)

### packages/console/core/migrations/20260420184535_aromatic_molten_man/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-6) (generated migration snapshot drift)

### packages/console/core/migrations/20260420184535_aromatic_molten_man/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2671) (generated migration snapshot drift)

### packages/console/core/migrations/20260420185813_supreme_roxanne_simpson/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-3) (generated migration snapshot drift)

### packages/console/core/migrations/20260420185813_supreme_roxanne_simpson/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2657) (generated migration snapshot drift)

### packages/console/core/migrations/20260420191234_deep_scarecrow/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-1) (generated migration snapshot drift)

### packages/console/core/migrations/20260420191234_deep_scarecrow/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2605) (generated migration snapshot drift)

### packages/console/core/migrations/20260421020842_bizarre_living_tribunal/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-5) (generated migration snapshot drift)

### packages/console/core/migrations/20260421020842_bizarre_living_tribunal/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2657) (generated migration snapshot drift)

### packages/console/core/migrations/20260421023950_nebulous_weapon_omega/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-3) (generated migration snapshot drift)

### packages/console/core/migrations/20260421023950_nebulous_weapon_omega/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-2619) (generated migration snapshot drift)

### packages/console/core/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/core/script/black-cancel-waitlist.ts

- **Drift/Unclassified** — All changed lines (+4/-2) (package-level fork drift)

### packages/console/core/script/black-gift.ts

- **Drift/Unclassified** — All changed lines (+4/-2) (package-level fork drift)

### packages/console/core/script/black-onboard-waitlist.ts

- **Drift/Unclassified** — All changed lines (+4/-2) (package-level fork drift)

### packages/console/core/script/black-select-workspaces.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/core/script/create-coupon.ts

- **Drift/Unclassified** — All changed lines (+0/-24) (package-level fork drift)

### packages/console/core/src/billing.ts

- **Drift/Unclassified** — All changed lines (+5/-49) (package-level fork drift)

### packages/console/core/src/key.ts

- **Drift/Unclassified** — All changed lines (+10/-6) (package-level fork drift)

### packages/console/core/src/lite.ts

- **Drift/Unclassified** — All changed lines (+6/-2) (package-level fork drift)

### packages/console/core/src/model.ts

- **Drift/Unclassified** — All changed lines (+6/-73) (package-level fork drift)

### packages/console/core/src/schema/billing.sql.ts

- **Drift/Unclassified** — All changed lines (+1/-23) (package-level fork drift)

### packages/console/core/src/schema/ip.sql.ts

- **Drift/Unclassified** — All changed lines (+1/-21) (package-level fork drift)

### packages/console/core/src/util/env.cloudflare.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/console/core/src/util/log.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/core/sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (package-level fork drift)

### packages/console/function/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/function/sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (package-level fork drift)

### packages/console/mail/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/console/resource/sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (package-level fork drift)

### packages/desktop-electron/electron-builder.config.ts

- **Drift/Unclassified** — All changed lines (+5/-0) (package-level fork drift)

### packages/desktop-electron/electron.vite.config.ts

- **Drift/Unclassified** — All changed lines (+0/-38) (package-level fork drift)

### packages/desktop-electron/package.json

- **Drift/Unclassified** — All changed lines (+13/-25) (package-level fork drift)

### packages/desktop-electron/scripts/prebuild.ts

- **Drift/Unclassified** — All changed lines (+0/-9) (package-level fork drift)

### packages/desktop-electron/scripts/predev.ts

- **Drift/Unclassified** — All changed lines (+13/-1) (package-level fork drift)

### packages/desktop-electron/scripts/prepare.ts

- **Drift/Unclassified** — All changed lines (+17/-1) (package-level fork drift)

### packages/desktop-electron/src/main/apps.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/desktop-electron/src/main/cli.ts

- **Drift/Unclassified** — lines 1-283 (package-level fork drift)

### packages/desktop-electron/src/main/env.d.ts

- **Drift/Unclassified** — All changed lines (+0/-22) (package-level fork drift)

### packages/desktop-electron/src/main/index.ts

- **Drift/Unclassified** — All changed lines (+38/-51) (package-level fork drift)

### packages/desktop-electron/src/main/ipc.ts

- **Drift/Unclassified** — All changed lines (+3/-12) (package-level fork drift)

### packages/desktop-electron/src/main/menu.ts

- **Drift/Unclassified** — All changed lines (+6/-1) (package-level fork drift)

### packages/desktop-electron/src/main/migrate.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/desktop-electron/src/main/server.ts

- **Drift/Unclassified** — All changed lines (+22/-37) (package-level fork drift)

### packages/desktop-electron/src/main/shell-env.ts

- **Drift/Unclassified** — All changed lines (+14/-14) (package-level fork drift)

### packages/desktop-electron/src/main/store.ts

- **Drift/Unclassified** — All changed lines (+3/-5) (package-level fork drift)

### packages/desktop-electron/src/main/windows.ts

- **Drift/Unclassified** — All changed lines (+32/-79) (package-level fork drift)

### packages/desktop-electron/src/preload/index.ts

- **Drift/Unclassified** — All changed lines (+0/-2) (package-level fork drift)

### packages/desktop-electron/src/preload/types.ts

- **Drift/Unclassified** — All changed lines (+0/-6) (package-level fork drift)

### packages/desktop-electron/src/renderer/env.d.ts

- **Drift/Unclassified** — All changed lines (+2/-0) (package-level fork drift)

### packages/desktop-electron/src/renderer/html.test.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (package-level fork drift)

### packages/desktop-electron/src/renderer/index.tsx

- **Drift/Unclassified** — All changed lines (+14/-27) (package-level fork drift)

### packages/desktop-electron/src/renderer/updater.ts

- **Drift/Unclassified** — All changed lines (+2/-0) (package-level fork drift)

### packages/desktop/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/desktop/scripts/finalize-latest-json.ts

- **Drift/Unclassified** — All changed lines (+2/-5) (package-level fork drift)

### packages/desktop/src-tauri/release/appstream.metainfo.xml

- **Drift/Unclassified** — All changed lines (+1/-4) (package-level fork drift)

### packages/desktop/src-tauri/src/cli.rs

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/desktop/src-tauri/tauri.conf.json

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/desktop/src/entry.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/desktop/src/index.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/desktop/src/loading.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/desktop/src/menu.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/desktop/src/webview-zoom.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/enterprise/package.json

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/enterprise/src/core/share.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/enterprise/src/core/storage.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/enterprise/src/routes/share/[shareID].tsx

- **Drift/Unclassified** — All changed lines (+5/-5) (package-level fork drift)

### packages/enterprise/sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (package-level fork drift)

### packages/enterprise/test-debug.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/enterprise/test/core/share.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/extensions/zed/extension.toml

- **Drift/Unclassified** — All changed lines (+6/-6) (package-level fork drift)

### packages/function/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/function/src/api.ts

- **Drift/Unclassified** — All changed lines (+17/-4) (package-level fork drift)

### packages/function/sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (package-level fork drift)

### packages/opencode/.gitignore

- **Drift/Unclassified** — All changed lines (+0/-3) (package-level fork drift)

### packages/opencode/AGENTS.md

- **Drift/Unclassified** — All changed lines (+2/-69) (package-level fork drift)

### packages/opencode/Dockerfile

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/opencode/bin/agentswarm

- **Agent Swarm CLI name and `agentswarm` command** — lines 1-196 (CLI entrypoint wrapper)

### packages/opencode/bin/agentswarm-npx

- **One-command launcher npm package** — lines 1-40 (one-command launcher entrypoint)

### packages/opencode/migration/20260410174513_workspace-name/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-16) (generated migration snapshot drift)

### packages/opencode/migration/20260410174513_workspace-name/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-1271) (generated migration snapshot drift)

### packages/opencode/migration/20260413175956_chief_energizer/migration.sql

- **Drift/Unclassified** — All changed lines (+0/-13) (generated migration snapshot drift)

### packages/opencode/migration/20260413175956_chief_energizer/snapshot.json

- **Drift/Unclassified** — All changed lines (+0/-1399) (generated migration snapshot drift)

### packages/opencode/package.json

- **Drift/Unclassified** — All changed lines (+43/-35) (package-level fork drift)

### packages/opencode/script/auth-smoke-test.py

- **Release-blocking auth smoke workflow** — lines 1-303 (auth smoke harness)

### packages/opencode/script/build-node.ts

- **Drift/Unclassified** — All changed lines (+16/-7) (package-level fork drift)

### packages/opencode/script/build.ts

- **Drift/Unclassified** — All changed lines (+33/-17) (package-level fork drift)

### packages/opencode/script/generate.ts

- **Drift/Unclassified** — All changed lines (+0/-23) (package-level fork drift)

### packages/opencode/script/postinstall.mjs

- **Scoped platform wrapper for shipped binaries** — All changed lines (+110/-18) (fork binary package lookup in postinstall)

### packages/opencode/script/publish.ts

- **One-command launcher npm package** — All changed lines (+135/-174) (publishes the fork root package set including the launcher package)

### packages/opencode/script/run-workspace-server

- **Drift/Unclassified** — All changed lines (+0/-106) (package-level fork drift)

### packages/opencode/script/schema.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/opencode/script/seed-e2e.ts

- **Drift/Unclassified** — lines 1-60 (package-level fork drift)

### packages/opencode/script/time.ts

- **Drift/Unclassified** — All changed lines (+0/-6) (package-level fork drift)

### packages/opencode/script/trace-imports.ts

- **Drift/Unclassified** — All changed lines (+0/-153) (package-level fork drift)

### packages/opencode/specs/effect-migration.md

- **Drift/Unclassified** — lines 1-310 (package-level fork drift)

### packages/opencode/specs/effect/facades.md

- **Drift/Unclassified** — All changed lines (+0/-221) (package-level fork drift)

### packages/opencode/specs/effect/http-api.md

- **Drift/Unclassified** — All changed lines (+0/-459) (package-level fork drift)

### packages/opencode/specs/effect/instance-context.md

- **Drift/Unclassified** — All changed lines (+0/-309) (package-level fork drift)

### packages/opencode/specs/effect/loose-ends.md

- **Drift/Unclassified** — All changed lines (+0/-34) (package-level fork drift)

### packages/opencode/specs/effect/migration.md

- **Drift/Unclassified** — All changed lines (+0/-299) (package-level fork drift)

### packages/opencode/specs/effect/routes.md

- **Drift/Unclassified** — All changed lines (+0/-64) (package-level fork drift)

### packages/opencode/specs/effect/schema.md

- **Drift/Unclassified** — All changed lines (+0/-386) (package-level fork drift)

### packages/opencode/specs/effect/server-package.md

- **Drift/Unclassified** — All changed lines (+0/-668) (package-level fork drift)

### packages/opencode/specs/effect/tools.md

- **Drift/Unclassified** — All changed lines (+0/-92) (package-level fork drift)

### packages/opencode/specs/tui-plugins.md

- **Drift/Unclassified** — All changed lines (+4/-1) (package-level fork drift)

### packages/opencode/specs/v2.md

- **Drift/Unclassified** — All changed lines (+5/-1) (package-level fork drift)

### packages/opencode/specs/v2/message-shape.md

- **Drift/Unclassified** — All changed lines (+0/-136) (package-level fork drift)

### packages/opencode/src/account/account.ts

- **Drift/Unclassified** — All changed lines (+0/-456) (core runtime drift)

### packages/opencode/src/account/index.ts

- **Drift/Unclassified** — lines 1-488 (core runtime drift)

### packages/opencode/src/account/repo.ts

- **Drift/Unclassified** — All changed lines (+142/-142) (core runtime drift)

### packages/opencode/src/account/schema.ts

- **Drift/Unclassified** — All changed lines (+26/-6) (core runtime drift)

### packages/opencode/src/acp/agent.ts

- **Drift/Unclassified** — All changed lines (+1537/-1527) (core runtime drift)

### packages/opencode/src/acp/session.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/agency-swarm/adapter.ts

- **Agency Swarm backend adapter** — lines 1-665 (bridge adapter implementation)

### packages/opencode/src/agency-swarm/brand.ts

- **Agent Swarm CLI name and `agentswarm` command** — lines 1-10 (fork brand constants)

### packages/opencode/src/agency-swarm/client-config.ts

- **Upstream credential bridge for agency runs** — lines 1-97 (client_config credential helpers)

### packages/opencode/src/agency-swarm/history.ts

- **Recover loopback agency history across port changes** — lines 1-187 (loopback history recovery helpers)

### packages/opencode/src/agency-swarm/litellm-provider.ts

- **Filter Codex OAuth to OpenAI-based LiteLLM runs** — lines 1-269 (LiteLLM provider mapping and OpenAI-based checks)

### packages/opencode/src/agency-swarm/npx.ts

- **Launcher bootstraps or repairs the project Python env** — lines 626-807, lines 918-1060 (Python setup, dependency repair, interpreter discovery, and command helpers)
- **Launcher refreshes `agency-swarm` inside the project `.venv`** — lines 808-825 (ensureLatestAgencySwarm refresh step)
- **One-command launcher onboarding and project detection** — lines 1-625, lines 826-917 (onboarding, project detection, starter creation, and launch flow)

### packages/opencode/src/agency-swarm/product.ts

- **Agent Swarm CLI name and `agentswarm` command** — lines 1-73 (product naming and CLI copy)

### packages/opencode/src/agency-swarm/run-session.ts

- **One-command launcher onboarding and project detection** — lines 1-60 (local project run-session tracking)

### packages/opencode/src/agency-swarm/server-launcher.ts

- **One-command launcher onboarding and project detection** — lines 1-15 (local server launcher script)

### packages/opencode/src/agency-swarm/tui.ts

- **Drift/Unclassified** — lines 1-98 (core runtime drift)

### packages/opencode/src/agent/agent.ts

- **Drift/Unclassified** — All changed lines (+375/-365) (core runtime drift)

### packages/opencode/src/agent/display.ts

- **Drift/Unclassified** — lines 1-6 (core runtime drift)

### packages/opencode/src/agent/prompt/compaction.txt

- **Drift/Unclassified** — All changed lines (+1/-2) (core runtime drift)

### packages/opencode/src/audio.d.ts

- **Drift/Unclassified** — All changed lines (+0/-4) (core runtime drift)

### packages/opencode/src/auth/index.ts

- **Drift/Unclassified** — All changed lines (+101/-88) (core runtime drift)

### packages/opencode/src/bus/bus-event.ts

- **Drift/Unclassified** — All changed lines (+32/-25) (core runtime drift)

### packages/opencode/src/bus/global.ts

- **Drift/Unclassified** — All changed lines (+6/-8) (core runtime drift)

### packages/opencode/src/bus/index.ts

- **Drift/Unclassified** — All changed lines (+161/-169) (core runtime drift)

### packages/opencode/src/cli/bootstrap.ts

- **Drift/Unclassified** — All changed lines (+1/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/account.ts

- **Drift/Unclassified** — All changed lines (+7/-8) (core runtime drift)

### packages/opencode/src/cli/cmd/acp.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/agencii.ts

- **Agency backend management commands** — lines 1-337 (agencii command tree)

### packages/opencode/src/cli/cmd/agent.ts

- **Drift/Unclassified** — All changed lines (+7/-9) (core runtime drift)

### packages/opencode/src/cli/cmd/db.ts

- **Drift/Unclassified** — All changed lines (+3/-4) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/agent.ts

- **Drift/Unclassified** — All changed lines (+44/-69) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/config.ts

- **Drift/Unclassified** — All changed lines (+2/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/file.ts

- **Drift/Unclassified** — All changed lines (+7/-10) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/lsp.ts

- **Drift/Unclassified** — All changed lines (+7/-15) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/ripgrep.ts

- **Drift/Unclassified** — All changed lines (+15/-33) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/scrap.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/skill.ts

- **Drift/Unclassified** — All changed lines (+1/-8) (core runtime drift)

### packages/opencode/src/cli/cmd/debug/snapshot.ts

- **Drift/Unclassified** — All changed lines (+3/-4) (core runtime drift)

### packages/opencode/src/cli/cmd/export.ts

- **Drift/Unclassified** — All changed lines (+12/-229) (core runtime drift)

### packages/opencode/src/cli/cmd/generate.ts

- **Drift/Unclassified** — All changed lines (+1/-13) (core runtime drift)

### packages/opencode/src/cli/cmd/github.ts

- **Drift/Unclassified** — All changed lines (+106/-107) (core runtime drift)

### packages/opencode/src/cli/cmd/import.ts

- **Drift/Unclassified** — All changed lines (+5/-6) (core runtime drift)

### packages/opencode/src/cli/cmd/mcp.ts

- **Drift/Unclassified** — All changed lines (+64/-104) (core runtime drift)

### packages/opencode/src/cli/cmd/models.ts

- **Drift/Unclassified** — All changed lines (+33/-43) (core runtime drift)

### packages/opencode/src/cli/cmd/plug.ts

- **Drift/Unclassified** — All changed lines (+5/-5) (core runtime drift)

### packages/opencode/src/cli/cmd/pr.ts

- **Drift/Unclassified** — All changed lines (+16/-26) (core runtime drift)

### packages/opencode/src/cli/cmd/providers.ts

- **Drift/Unclassified** — All changed lines (+34/-71) (core runtime drift)

### packages/opencode/src/cli/cmd/run.ts

- **Drift/Unclassified** — All changed lines (+29/-20) (core runtime drift)

### packages/opencode/src/cli/cmd/serve.ts

- **Drift/Unclassified** — All changed lines (+6/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/session.ts

- **Drift/Unclassified** — All changed lines (+5/-6) (core runtime drift)

### packages/opencode/src/cli/cmd/stats.ts

- **Drift/Unclassified** — All changed lines (+3/-6) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/app.tsx

- **Drift/Unclassified** — All changed lines (+324/-115) (mixed TUI app rewrite with auth, reconnect, run-target, and theme changes)

### packages/opencode/src/cli/cmd/tui/asset/charge.wav

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/asset/pulse-a.wav

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/asset/pulse-b.wav

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/asset/pulse-c.wav

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/attach.ts

- **Drift/Unclassified** — All changed lines (+9/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/bg-pulse.tsx

- **Drift/Unclassified** — All changed lines (+0/-130) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx

- **Run-target labels use live agency names** — All changed lines (+262/-13) (agency target picker renders live agency and recipient names)

### packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx

- **Drift/Unclassified** — All changed lines (+0/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-go-upsell.tsx

- **Drift/Unclassified** — All changed lines (+0/-157) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-mcp.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx

- **Framework-mode `/models` only shows Agency-supported providers** — All changed lines (+41/-11) (framework-mode provider/model filtering)

### packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx

- **Drift/Unclassified** — All changed lines (+848/-68) (mixed provider/auth/connect dialog rewrite)

### packages/opencode/src/cli/cmd/tui/component/dialog-session-delete-failed.tsx

- **Drift/Unclassified** — All changed lines (+0/-101) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx

- **Drift/Unclassified** — All changed lines (+12/-166) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-session-rename.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-stash.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-workspace-create.tsx

- **Drift/Unclassified** — All changed lines (+0/-289) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-workspace-list.tsx

- **Drift/Unclassified** — lines 1-316 (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/dialog-workspace-unavailable.tsx

- **Drift/Unclassified** — All changed lines (+0/-81) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/error-component.tsx

- **Drift/Unclassified** — All changed lines (+7/-6) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/logo.tsx

- **Drift/Unclassified** — All changed lines (+54/-862) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/prompt/cwd.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/prompt/frecency.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/prompt/history.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx

- **Drift/Unclassified** — All changed lines (+378/-223) (mixed prompt rewrite spanning auth guards, first-send flow, and run-target UI)

### packages/opencode/src/cli/cmd/tui/component/prompt/stash.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/startup-loading.tsx

- **Drift/Unclassified** — All changed lines (+54/-12) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/textarea-keybindings.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/component/workspace/dialog-session-list.tsx

- **Drift/Unclassified** — lines 1-151 (core runtime drift)

### packages/opencode/src/cli/cmd/tui/config/cwd.ts

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/config/tui.ts

- **Drift/Unclassified** — All changed lines (+0/-219) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/agency-swarm-connection.tsx

- **Dead agency server detection opens reconnect** — lines 1-276 (bridge health monitor and reconnect handling)

### packages/opencode/src/cli/cmd/tui/context/directory.ts

- **Drift/Unclassified** — All changed lines (+1/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/event.ts

- **Drift/Unclassified** — All changed lines (+0/-45) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/helper.tsx

- **Drift/Unclassified** — All changed lines (+9/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/keybind.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/kv.tsx

- **Drift/Unclassified** — All changed lines (+5/-29) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/local.tsx

- **Drift/Unclassified** — All changed lines (+193/-94) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/project.tsx

- **Drift/Unclassified** — All changed lines (+0/-109) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/route.tsx

- **Drift/Unclassified** — All changed lines (+11/-11) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/sdk.tsx

- **Drift/Unclassified** — All changed lines (+8/-35) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/sync.tsx

- **Drift/Unclassified** — All changed lines (+48/-60) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme.tsx

- **Agent Swarm palette is the safe default** — All changed lines (+102/-169) (theme fallback and built-in theme gating)

### packages/opencode/src/cli/cmd/tui/context/theme/aura.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/ayu.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/carbonfox.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/catppuccin-frappe.json

- **Drift/Unclassified** — All changed lines (+4/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/catppuccin-macchiato.json

- **Drift/Unclassified** — All changed lines (+4/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/catppuccin.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/cobalt2.json

- **Drift/Unclassified** — All changed lines (+4/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/cursor.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/dracula.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/everforest.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/flexoki.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/github.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/gruvbox.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/kanagawa.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/lucent-orng.json

- **Drift/Unclassified** — All changed lines (+4/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/material.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/matrix.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/monokai.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/nightowl.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/nord.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/one-dark.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/opencode.json

- **Drift/Unclassified** — All changed lines (+19/-19) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/orng.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/osaka-jade.json

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/palenight.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/rosepine.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/solarized.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/synthwave84.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/tokyonight.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/vercel.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/vesper.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/theme/zenburn.json

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/context/tui-config.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/event.ts

- **Drift/Unclassified** — All changed lines (+1/-0) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx

- **Drift/Unclassified** — All changed lines (+14/-20) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx

- **Drift/Unclassified** — All changed lines (+6/-11) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/layer.ts

- **Drift/Unclassified** — All changed lines (+0/-6) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/plugin/api.tsx

- **Drift/Unclassified** — All changed lines (+15/-8) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/plugin/runtime.ts

- **Drift/Unclassified** — All changed lines (+85/-79) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/home.tsx

- **Drift/Unclassified** — All changed lines (+6/-12) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/dialog-fork-from-timeline.tsx

- **Drift/Unclassified** — All changed lines (+10/-21) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/dialog-message.tsx

- **Drift/Unclassified** — All changed lines (+18/-16) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/dialog-timeline.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/footer.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/index.tsx

- **Drift/Unclassified** — All changed lines (+131/-111) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx

- **Drift/Unclassified** — All changed lines (+8/-14) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/question.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx

- **Drift/Unclassified** — All changed lines (+4/-29) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/session-error.ts

- **Auth hints say missing vs rejected key** — lines 280-330 (describeStreamAuthError and provider extraction hints)
- **Startup auth gating only checks Agency-supported providers** — lines 1-279 (framework-mode auth gates, provider filtering, and connect/auth dialog rules)

### packages/opencode/src/cli/cmd/tui/thread.ts

- **Drift/Unclassified** — All changed lines (+83/-30) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/ui/dialog-confirm.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/ui/dialog-export-options.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/ui/dialog-select.tsx

- **Drift/Unclassified** — All changed lines (+14/-45) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/ui/dialog.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/ui/toast.tsx

- **Drift/Unclassified** — All changed lines (+3/-2) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/agency-target.ts

- **Respect explicit Agency Swarm base URL** — lines 1-47 (provider option parsing including baseURL and token)
- **Run-target labels use live agency names** — lines 48-66 (live target selection labels)
- **Tab cycles recipient agents in Run mode** — lines 67-154 (recipient cycling and target option updates)

### packages/opencode/src/cli/cmd/tui/util/clipboard.ts

- **Drift/Unclassified** — All changed lines (+137/-154) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/editor.ts

- **Drift/Unclassified** — All changed lines (+26/-24) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/index.ts

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/provider-auth.ts

- **Drift/Unclassified** — lines 1-27 (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/provider-origin.ts

- **Drift/Unclassified** — All changed lines (+13/-0) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/revert-diff.ts

- **Drift/Unclassified** — All changed lines (+0/-18) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/scroll.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/selection.ts

- **Drift/Unclassified** — All changed lines (+11/-9) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/signal.ts

- **Drift/Unclassified** — All changed lines (+1/-35) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/sound.ts

- **Drift/Unclassified** — All changed lines (+0/-154) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/terminal.ts

- **Drift/Unclassified** — All changed lines (+99/-120) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/util/transcript.ts

- **Drift/Unclassified** — All changed lines (+4/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/win32.ts

- **Drift/Unclassified** — All changed lines (+2/-3) (core runtime drift)

### packages/opencode/src/cli/cmd/tui/worker.ts

- **Drift/Unclassified** — All changed lines (+101/-10) (core runtime drift)

### packages/opencode/src/cli/cmd/uninstall.ts

- **Drift/Unclassified** — All changed lines (+25/-21) (core runtime drift)

### packages/opencode/src/cli/cmd/upgrade.ts

- **Upgrade command rejects unsupported package-manager channels** — All changed lines (+11/-15) (upgrade command entrypoint)

### packages/opencode/src/cli/cmd/web.ts

- **Drift/Unclassified** — All changed lines (+3/-2) (core runtime drift)

### packages/opencode/src/cli/error.ts

- **Drift/Unclassified** — All changed lines (+32/-63) (core runtime drift)

### packages/opencode/src/cli/heap.ts

- **Drift/Unclassified** — All changed lines (+44/-44) (core runtime drift)

### packages/opencode/src/cli/logo.ts

- **Drift/Unclassified** — All changed lines (+19/-8) (core runtime drift)

### packages/opencode/src/cli/network.ts

- **Drift/Unclassified** — All changed lines (+5/-7) (core runtime drift)

### packages/opencode/src/cli/ui.ts

- **Drift/Unclassified** — All changed lines (+111/-111) (core runtime drift)

### packages/opencode/src/cli/upgrade.ts

- **Drift/Unclassified** — All changed lines (+8/-10) (core runtime drift)

### packages/opencode/src/command/index.ts

- **Drift/Unclassified** — All changed lines (+165/-158) (core runtime drift)

### packages/opencode/src/command/template/initialize.txt

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/config/agent.ts

- **Drift/Unclassified** — All changed lines (+0/-181) (core runtime drift)

### packages/opencode/src/config/command.ts

- **Drift/Unclassified** — All changed lines (+0/-62) (core runtime drift)

### packages/opencode/src/config/config.ts

- **Drift/Unclassified** — All changed lines (+1505/-693) (core runtime drift)

### packages/opencode/src/config/console-state.ts

- **Drift/Unclassified** — All changed lines (+10/-11) (core runtime drift)

### packages/opencode/src/config/entry-name.ts

- **Drift/Unclassified** — All changed lines (+0/-16) (core runtime drift)

### packages/opencode/src/config/error.ts

- **Drift/Unclassified** — All changed lines (+0/-21) (core runtime drift)

### packages/opencode/src/config/formatter.ts

- **Drift/Unclassified** — All changed lines (+0/-17) (core runtime drift)

### packages/opencode/src/config/index.ts

- **Drift/Unclassified** — All changed lines (+0/-16) (core runtime drift)

### packages/opencode/src/config/keybinds.ts

- **Drift/Unclassified** — All changed lines (+0/-127) (core runtime drift)

### packages/opencode/src/config/layout.ts

- **Drift/Unclassified** — All changed lines (+0/-10) (core runtime drift)

### packages/opencode/src/config/lsp.ts

- **Drift/Unclassified** — All changed lines (+0/-45) (core runtime drift)

### packages/opencode/src/config/managed.ts

- **Drift/Unclassified** — All changed lines (+0/-70) (core runtime drift)

### packages/opencode/src/config/markdown.ts

- **Drift/Unclassified** — All changed lines (+82/-80) (core runtime drift)

### packages/opencode/src/config/mcp.ts

- **Drift/Unclassified** — All changed lines (+0/-65) (core runtime drift)

### packages/opencode/src/config/model-id.ts

- **Drift/Unclassified** — All changed lines (+0/-14) (core runtime drift)

### packages/opencode/src/config/parse.ts

- **Drift/Unclassified** — All changed lines (+0/-44) (core runtime drift)

### packages/opencode/src/config/paths.ts

- **Drift/Unclassified** — All changed lines (+162/-49) (core runtime drift)

### packages/opencode/src/config/permission.ts

- **Drift/Unclassified** — All changed lines (+0/-79) (core runtime drift)

### packages/opencode/src/config/plugin.ts

- **Drift/Unclassified** — All changed lines (+0/-88) (core runtime drift)

### packages/opencode/src/config/provider.ts

- **Drift/Unclassified** — All changed lines (+0/-115) (core runtime drift)

### packages/opencode/src/config/server.ts

- **Drift/Unclassified** — All changed lines (+0/-22) (core runtime drift)

### packages/opencode/src/config/skills.ts

- **Drift/Unclassified** — All changed lines (+0/-16) (core runtime drift)

### packages/opencode/src/config/tui-migrate.ts

- **Drift/Unclassified** — All changed lines (+39/-23) (core runtime drift)

### packages/opencode/src/config/tui-schema.ts

- **Drift/Unclassified** — All changed lines (+3/-5) (core runtime drift)

### packages/opencode/src/config/tui.ts

- **Drift/Unclassified** — lines 1-188 (core runtime drift)

### packages/opencode/src/config/variable.ts

- **Drift/Unclassified** — All changed lines (+0/-90) (core runtime drift)

### packages/opencode/src/control-plane/adaptors/index.ts

- **Drift/Unclassified** — All changed lines (+11/-43) (core runtime drift)

### packages/opencode/src/control-plane/adaptors/worktree.ts

- **Drift/Unclassified** — All changed lines (+16/-21) (core runtime drift)

### packages/opencode/src/control-plane/dev/debug-workspace-plugin.ts

- **Drift/Unclassified** — All changed lines (+0/-73) (core runtime drift)

### packages/opencode/src/control-plane/schema.ts

- **Drift/Unclassified** — All changed lines (+4/-6) (core runtime drift)

### packages/opencode/src/control-plane/types.ts

- **Drift/Unclassified** — All changed lines (+6/-8) (core runtime drift)

### packages/opencode/src/control-plane/util.ts

- **Drift/Unclassified** — All changed lines (+0/-37) (core runtime drift)

### packages/opencode/src/control-plane/workspace-context.ts

- **Drift/Unclassified** — All changed lines (+0/-26) (core runtime drift)

### packages/opencode/src/control-plane/workspace.sql.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/control-plane/workspace.ts

- **Drift/Unclassified** — All changed lines (+116/-563) (core runtime drift)

### packages/opencode/src/effect/app-runtime.ts

- **Drift/Unclassified** — All changed lines (+0/-121) (core runtime drift)

### packages/opencode/src/effect/bootstrap-runtime.ts

- **Drift/Unclassified** — All changed lines (+0/-29) (core runtime drift)

### packages/opencode/src/effect/bridge.ts

- **Drift/Unclassified** — All changed lines (+0/-48) (core runtime drift)

### packages/opencode/src/effect/cross-spawn-spawner.ts

- **Drift/Unclassified** — All changed lines (+2/-15) (core runtime drift)

### packages/opencode/src/effect/index.ts

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/effect/instance-ref.ts

- **Drift/Unclassified** — All changed lines (+2/-7) (core runtime drift)

### packages/opencode/src/effect/instance-state.ts

- **Drift/Unclassified** — All changed lines (+60/-59) (core runtime drift)

### packages/opencode/src/effect/logger.ts

- **Drift/Unclassified** — All changed lines (+0/-73) (core runtime drift)

### packages/opencode/src/effect/memo-map.ts

- **Drift/Unclassified** — All changed lines (+0/-3) (core runtime drift)

### packages/opencode/src/effect/observability.ts

- **Drift/Unclassified** — All changed lines (+0/-107) (core runtime drift)

### packages/opencode/src/effect/oltp.ts

- **Drift/Unclassified** — lines 1-34 (core runtime drift)

### packages/opencode/src/effect/run-service.ts

- **Drift/Unclassified** — All changed lines (+11/-29) (core runtime drift)

### packages/opencode/src/effect/runner.ts

- **Drift/Unclassified** — All changed lines (+196/-186) (core runtime drift)

### packages/opencode/src/effect/runtime.ts

- **Drift/Unclassified** — All changed lines (+0/-19) (core runtime drift)

### packages/opencode/src/env/index.ts

- **Drift/Unclassified** — All changed lines (+27/-36) (core runtime drift)

### packages/opencode/src/file/ignore.ts

- **Drift/Unclassified** — All changed lines (+70/-69) (core runtime drift)

### packages/opencode/src/file/index.ts

- **Drift/Unclassified** — All changed lines (+621/-599) (core runtime drift)

### packages/opencode/src/file/protected.ts

- **Drift/Unclassified** — All changed lines (+19/-19) (core runtime drift)

### packages/opencode/src/file/ripgrep.ts

- **Drift/Unclassified** — All changed lines (+351/-459) (core runtime drift)

### packages/opencode/src/file/time.ts

- **Drift/Unclassified** — lines 1-133 (core runtime drift)

### packages/opencode/src/file/watcher.ts

- **Drift/Unclassified** — All changed lines (+131/-123) (core runtime drift)

### packages/opencode/src/filesystem/index.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/flag/flag.ts

- **Drift/Unclassified** — All changed lines (+131/-76) (core runtime drift)

### packages/opencode/src/format/formatter.ts

- **Drift/Unclassified** — All changed lines (+46/-36) (core runtime drift)

### packages/opencode/src/format/index.ts

- **Drift/Unclassified** — All changed lines (+170/-170) (core runtime drift)

### packages/opencode/src/git/index.ts

- **Drift/Unclassified** — All changed lines (+287/-244) (core runtime drift)

### packages/opencode/src/global/index.ts

- **Drift/Unclassified** — All changed lines (+26/-29) (core runtime drift)

### packages/opencode/src/id/id.ts

- **Drift/Unclassified** — All changed lines (+65/-66) (core runtime drift)

### packages/opencode/src/ide/index.ts

- **Drift/Unclassified** — All changed lines (+50/-49) (core runtime drift)

### packages/opencode/src/index.ts

- **Drift/Unclassified** — All changed lines (+15/-18) (core runtime drift)

### packages/opencode/src/installation/index.ts

- **Upgrade command rejects unsupported package-manager channels** — All changed lines (+287/-303) (installation channel gating)

### packages/opencode/src/installation/meta.ts

- **Drift/Unclassified** — lines 1-7 (core runtime drift)

### packages/opencode/src/installation/version.ts

- **Drift/Unclassified** — All changed lines (+0/-8) (core runtime drift)

### packages/opencode/src/lsp/client.ts

- **Drift/Unclassified** — All changed lines (+205/-202) (core runtime drift)

### packages/opencode/src/lsp/diagnostic.ts

- **Drift/Unclassified** — All changed lines (+0/-29) (core runtime drift)

### packages/opencode/src/lsp/index.ts

- **Drift/Unclassified** — All changed lines (+558/-3) (core runtime drift)

### packages/opencode/src/lsp/launch.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/lsp/lsp.ts

- **Drift/Unclassified** — All changed lines (+0/-514) (core runtime drift)

### packages/opencode/src/lsp/server.ts

- **Drift/Unclassified** — All changed lines (+1694/-1682) (core runtime drift)

### packages/opencode/src/mcp/auth.ts

- **Drift/Unclassified** — All changed lines (+164/-135) (core runtime drift)

### packages/opencode/src/mcp/index.ts

- **Drift/Unclassified** — All changed lines (+784/-795) (core runtime drift)

### packages/opencode/src/mcp/oauth-callback.ts

- **Drift/Unclassified** — All changed lines (+133/-149) (core runtime drift)

### packages/opencode/src/mcp/oauth-provider.ts

- **Drift/Unclassified** — All changed lines (+30/-59) (core runtime drift)

### packages/opencode/src/node.ts

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/npm/config.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/npm/index.ts

- **Drift/Unclassified** — All changed lines (+165/-270) (core runtime drift)

### packages/opencode/src/npmcli-config.d.ts

- **Drift/Unclassified** — All changed lines (+0/-43) (core runtime drift)

### packages/opencode/src/patch/index.ts

- **Drift/Unclassified** — All changed lines (+537/-537) (core runtime drift)

### packages/opencode/src/permission/arity.ts

- **Drift/Unclassified** — All changed lines (+148/-148) (core runtime drift)

### packages/opencode/src/permission/evaluate.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/permission/index.ts

- **Drift/Unclassified** — All changed lines (+262/-272) (core runtime drift)

### packages/opencode/src/permission/schema.ts

- **Drift/Unclassified** — All changed lines (+6/-6) (core runtime drift)

### packages/opencode/src/plugin/cloudflare.ts

- **Drift/Unclassified** — All changed lines (+12/-21) (core runtime drift)

### packages/opencode/src/plugin/codex.ts

- **Drift/Unclassified** — All changed lines (+12/-10) (core runtime drift)

### packages/opencode/src/plugin/github-copilot/copilot.ts

- **Drift/Unclassified** — All changed lines (+19/-52) (core runtime drift)

### packages/opencode/src/plugin/github-copilot/models.ts

- **Drift/Unclassified** — All changed lines (+126/-135) (core runtime drift)

### packages/opencode/src/plugin/index.ts

- **Drift/Unclassified** — All changed lines (+248/-247) (core runtime drift)

### packages/opencode/src/plugin/install.ts

- **Drift/Unclassified** — All changed lines (+9/-7) (core runtime drift)

### packages/opencode/src/plugin/loader.ts

- **Drift/Unclassified** — All changed lines (+13/-55) (core runtime drift)

### packages/opencode/src/plugin/meta.ts

- **Drift/Unclassified** — All changed lines (+149/-149) (core runtime drift)

### packages/opencode/src/plugin/shared.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (core runtime drift)

### packages/opencode/src/project/bootstrap.ts

- **Drift/Unclassified** — All changed lines (+20/-31) (core runtime drift)

### packages/opencode/src/project/index.ts

- **Drift/Unclassified** — All changed lines (+0/-2) (core runtime drift)

### packages/opencode/src/project/instance.ts

- **Drift/Unclassified** — All changed lines (+37/-52) (core runtime drift)

### packages/opencode/src/project/project.ts

- **Drift/Unclassified** — All changed lines (+450/-419) (core runtime drift)

### packages/opencode/src/project/schema.ts

- **Drift/Unclassified** — All changed lines (+2/-1) (core runtime drift)

### packages/opencode/src/project/state.ts

- **Drift/Unclassified** — lines 1-70 (core runtime drift)

### packages/opencode/src/project/vcs.ts

- **Drift/Unclassified** — All changed lines (+219/-206) (core runtime drift)

### packages/opencode/src/provider/auth.ts

- **Drift/Unclassified** — All changed lines (+228/-206) (core runtime drift)

### packages/opencode/src/provider/error.ts

- **Drift/Unclassified** — All changed lines (+164/-160) (core runtime drift)

### packages/opencode/src/provider/index.ts

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/provider/models.ts

- **Drift/Unclassified** — All changed lines (+130/-148) (core runtime drift)

### packages/opencode/src/provider/provider.ts

- **Drift/Unclassified** — All changed lines (+1594/-1535) (core runtime drift)

### packages/opencode/src/provider/schema.ts

- **Drift/Unclassified** — All changed lines (+16/-14) (core runtime drift)

### packages/opencode/src/provider/sdk/copilot/responses/openai-responses-language-model.ts

- **Drift/Unclassified** — All changed lines (+2/-3) (core runtime drift)

### packages/opencode/src/provider/transform.ts

- **Drift/Unclassified** — All changed lines (+836/-906) (core runtime drift)

### packages/opencode/src/pty/index.ts

- **Drift/Unclassified** — All changed lines (+353/-320) (core runtime drift)

### packages/opencode/src/pty/schema.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/question/index.ts

- **Drift/Unclassified** — All changed lines (+195/-200) (core runtime drift)

### packages/opencode/src/question/schema.ts

- **Drift/Unclassified** — All changed lines (+6/-6) (core runtime drift)

### packages/opencode/src/server/adapter.bun.ts

- **Drift/Unclassified** — All changed lines (+0/-40) (core runtime drift)

### packages/opencode/src/server/adapter.node.ts

- **Drift/Unclassified** — All changed lines (+0/-66) (core runtime drift)

### packages/opencode/src/server/adapter.ts

- **Drift/Unclassified** — All changed lines (+0/-21) (core runtime drift)

### packages/opencode/src/server/error.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/server/fence.ts

- **Drift/Unclassified** — All changed lines (+0/-81) (core runtime drift)

### packages/opencode/src/server/instance.ts

- **Drift/Unclassified** — All changed lines (+105/-88) (core runtime drift)

### packages/opencode/src/server/mdns.ts

- **Drift/Unclassified** — All changed lines (+50/-50) (core runtime drift)

### packages/opencode/src/server/middleware.ts

- **Drift/Unclassified** — All changed lines (+26/-85) (core runtime drift)

### packages/opencode/src/server/projectors.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/server/proxy.ts

- **Drift/Unclassified** — All changed lines (+32/-73) (core runtime drift)

### packages/opencode/src/server/router.ts

- **Drift/Unclassified** — lines 1-105 (core runtime drift)

### packages/opencode/src/server/routes/config.ts

- **Drift/Unclassified** — All changed lines (+33/-30) (core runtime drift)

### packages/opencode/src/server/routes/control/index.ts

- **Drift/Unclassified** — All changed lines (+0/-160) (core runtime drift)

### packages/opencode/src/server/routes/control/workspace.ts

- **Drift/Unclassified** — All changed lines (+0/-203) (core runtime drift)

### packages/opencode/src/server/routes/event.ts

- **Drift/Unclassified** — All changed lines (+3/-8) (core runtime drift)

### packages/opencode/src/server/routes/experimental.ts

- **Drift/Unclassified** — All changed lines (+72/-106) (core runtime drift)

### packages/opencode/src/server/routes/file.ts

- **Drift/Unclassified** — All changed lines (+47/-40) (core runtime drift)

### packages/opencode/src/server/routes/global.ts

- **Drift/Unclassified** — All changed lines (+73/-48) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/config.ts

- **Drift/Unclassified** — All changed lines (+0/-67) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/permission.ts

- **Drift/Unclassified** — All changed lines (+0/-72) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/project.ts

- **Drift/Unclassified** — All changed lines (+0/-62) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/provider.ts

- **Drift/Unclassified** — All changed lines (+0/-142) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/question.ts

- **Drift/Unclassified** — All changed lines (+0/-86) (core runtime drift)

### packages/opencode/src/server/routes/instance/httpapi/server.ts

- **Drift/Unclassified** — All changed lines (+0/-136) (core runtime drift)

### packages/opencode/src/server/routes/instance/middleware.ts

- **Drift/Unclassified** — All changed lines (+0/-35) (core runtime drift)

### packages/opencode/src/server/routes/instance/provider.ts

- **Drift/Unclassified** — All changed lines (+0/-158) (core runtime drift)

### packages/opencode/src/server/routes/instance/sync.ts

- **Drift/Unclassified** — All changed lines (+0/-143) (core runtime drift)

### packages/opencode/src/server/routes/instance/trace.ts

- **Drift/Unclassified** — All changed lines (+0/-59) (core runtime drift)

### packages/opencode/src/server/routes/mcp.ts

- **Drift/Unclassified** — All changed lines (+42/-77) (core runtime drift)

### packages/opencode/src/server/routes/permission.ts

- **Drift/Unclassified** — All changed lines (+18/-22) (core runtime drift)

### packages/opencode/src/server/routes/project.ts

- **Drift/Unclassified** — All changed lines (+21/-25) (core runtime drift)

### packages/opencode/src/server/routes/provider.ts

- **Drift/Unclassified** — lines 1-171 (core runtime drift)

### packages/opencode/src/server/routes/pty.ts

- **Drift/Unclassified** — All changed lines (+22/-59) (core runtime drift)

### packages/opencode/src/server/routes/question.ts

- **Drift/Unclassified** — All changed lines (+23/-35) (core runtime drift)

### packages/opencode/src/server/routes/session.ts

- **Drift/Unclassified** — All changed lines (+190/-266) (core runtime drift)

### packages/opencode/src/server/routes/tui.ts

- **Drift/Unclassified** — All changed lines (+7/-12) (core runtime drift)

### packages/opencode/src/server/routes/ui.ts

- **Drift/Unclassified** — All changed lines (+0/-55) (core runtime drift)

### packages/opencode/src/server/routes/workspace.ts

- **Drift/Unclassified** — lines 1-94 (core runtime drift)

### packages/opencode/src/server/server.ts

- **Drift/Unclassified** — All changed lines (+328/-111) (core runtime drift)

### packages/opencode/src/server/workspace.ts

- **Drift/Unclassified** — All changed lines (+0/-122) (core runtime drift)

### packages/opencode/src/session/agency-swarm-utils.ts

- **Preserve caller agent during history compaction** — lines 5-33 (callerAgent metadata helpers)
- **Tool outputs follow wrapper `call_id`** — lines 35-49 (function_call_output extraction helper)
- **Drift/Unclassified** — lines 1-4, line 34, lines 50-163 (general agency-swarm message and file helper utilities)

### packages/opencode/src/session/agency-swarm.ts

- **Bridge error frames surface as real session errors** — lines 1553-1572 (frame.type/error branches convert bridge failures into session errors)
- **Filter Codex OAuth to OpenAI-based LiteLLM runs** — lines 357-479 (LiteLLM routing checks and Codex OAuth stripping)
- **Persist handed-off recipient across turns** — lines 1902-1960 (recipient resolution and session recipient reuse)
- **Preserve caller agent during history compaction** — lines 1961-2036 (compaction output and callerAgent extraction)
- **Respect explicit Agency Swarm base URL** — lines 91-120, lines 349-356 (provider option parsing and configured base URL reads)
- **Tool outputs follow wrapper `call_id`** — lines 733-752, lines 1325-1357, lines 1703-1753 (wrapper call id lookup and tool_output handling)
- **Upstream credential bridge for agency runs** — lines 121-348 (client_config merge and upstream credential forwarding)
- **Drift/Unclassified** — lines 1-90; lines 480-732; lines 753-1324, lines 1358-1552, lines 1573-1702, lines 1754-1901, lines 2037-2096 (imports and session bridge scaffolding not named in the current changelog; stream setup, message plumbing, and general runtime helpers outside named buckets; remaining stream/event handling and recipient/model helpers outside named buckets)

### packages/opencode/src/session/agent-builder.ts

- **Drift/Unclassified** — lines 1-8 (core runtime drift)

### packages/opencode/src/session/agent-planner.ts

- **Drift/Unclassified** — lines 1-9 (core runtime drift)

### packages/opencode/src/session/compaction.ts

- **Drift/Unclassified** — All changed lines (+338/-437) (core runtime drift)

### packages/opencode/src/session/index.ts

- **Drift/Unclassified** — All changed lines (+893/-1) (core runtime drift)

### packages/opencode/src/session/instruction.ts

- **Drift/Unclassified** — All changed lines (+186/-172) (core runtime drift)

### packages/opencode/src/session/llm.ts

- **Drift/Unclassified** — All changed lines (+312/-421) (core runtime drift)

### packages/opencode/src/session/message-v2.ts

- **Drift/Unclassified** — All changed lines (+906/-944) (core runtime drift)

### packages/opencode/src/session/message.ts

- **Drift/Unclassified** — All changed lines (+172/-172) (core runtime drift)

### packages/opencode/src/session/overflow.ts

- **Drift/Unclassified** — All changed lines (+12/-16) (core runtime drift)

### packages/opencode/src/session/processor.ts

- **Drift/Unclassified** — All changed lines (+478/-556) (core runtime drift)

### packages/opencode/src/session/projectors.ts

- **Drift/Unclassified** — All changed lines (+4/-3) (core runtime drift)

### packages/opencode/src/session/prompt.ts

- **Drift/Unclassified** — All changed lines (+1697/-1548) (core runtime drift)

### packages/opencode/src/session/prompt/agent-builder.txt

- **Drift/Unclassified** — lines 1-73 (core runtime drift)

### packages/opencode/src/session/prompt/agent-planner.txt

- **Drift/Unclassified** — lines 1-38 (core runtime drift)

### packages/opencode/src/session/retry.ts

- **Drift/Unclassified** — All changed lines (+96/-102) (core runtime drift)

### packages/opencode/src/session/revert.ts

- **Drift/Unclassified** — All changed lines (+154/-139) (core runtime drift)

### packages/opencode/src/session/run-state.ts

- **Drift/Unclassified** — All changed lines (+0/-108) (core runtime drift)

### packages/opencode/src/session/schema.ts

- **Drift/Unclassified** — All changed lines (+9/-7) (core runtime drift)

### packages/opencode/src/session/session.sql.ts

- **Drift/Unclassified** — All changed lines (+0/-20) (core runtime drift)

### packages/opencode/src/session/session.ts

- **Drift/Unclassified** — All changed lines (+0/-814) (core runtime drift)

### packages/opencode/src/session/status.ts

- **Drift/Unclassified** — All changed lines (+86/-72) (core runtime drift)

### packages/opencode/src/session/summary.ts

- **Drift/Unclassified** — All changed lines (+157/-143) (core runtime drift)

### packages/opencode/src/session/system.ts

- **Drift/Unclassified** — All changed lines (+54/-62) (core runtime drift)

### packages/opencode/src/session/todo.ts

- **Drift/Unclassified** — All changed lines (+80/-65) (core runtime drift)

### packages/opencode/src/share/index.ts

- **Drift/Unclassified** — All changed lines (+0/-2) (core runtime drift)

### packages/opencode/src/share/session.ts

- **Drift/Unclassified** — All changed lines (+0/-57) (core runtime drift)

### packages/opencode/src/share/share-next.ts

- **Drift/Unclassified** — All changed lines (+323/-327) (core runtime drift)

### packages/opencode/src/shell/shell.ts

- **Drift/Unclassified** — All changed lines (+84/-84) (core runtime drift)

### packages/opencode/src/skill/discovery.ts

- **Drift/Unclassified** — All changed lines (+107/-107) (core runtime drift)

### packages/opencode/src/skill/index.ts

- **Drift/Unclassified** — All changed lines (+232/-243) (core runtime drift)

### packages/opencode/src/snapshot/index.ts

- **Drift/Unclassified** — All changed lines (+634/-685) (core runtime drift)

### packages/opencode/src/storage/db.ts

- **Drift/Unclassified** — All changed lines (+133/-131) (core runtime drift)

### packages/opencode/src/storage/index.ts

- **Drift/Unclassified** — All changed lines (+0/-26) (core runtime drift)

### packages/opencode/src/storage/json-migration.ts

- **Drift/Unclassified** — All changed lines (+366/-368) (core runtime drift)

### packages/opencode/src/storage/storage.ts

- **Drift/Unclassified** — All changed lines (+309/-287) (core runtime drift)

### packages/opencode/src/sync/index.ts

- **Drift/Unclassified** — All changed lines (+210/-225) (core runtime drift)

### packages/opencode/src/sync/schema.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/temporary.ts

- **Drift/Unclassified** — All changed lines (+0/-33) (core runtime drift)

### packages/opencode/src/tool/apply_patch.ts

- **Drift/Unclassified** — All changed lines (+236/-249) (core runtime drift)

### packages/opencode/src/tool/bash.ts

- **Drift/Unclassified** — All changed lines (+230/-355) (core runtime drift)

### packages/opencode/src/tool/batch.ts

- **Drift/Unclassified** — lines 1-183 (core runtime drift)

### packages/opencode/src/tool/batch.txt

- **Drift/Unclassified** — lines 1-24 (core runtime drift)

### packages/opencode/src/tool/codesearch.ts

- **Drift/Unclassified** — All changed lines (+127/-58) (core runtime drift)

### packages/opencode/src/tool/edit.ts

- **Drift/Unclassified** — All changed lines (+130/-159) (core runtime drift)

### packages/opencode/src/tool/external-directory.ts

- **Drift/Unclassified** — All changed lines (+13/-16) (core runtime drift)

### packages/opencode/src/tool/glob.ts

- **Drift/Unclassified** — All changed lines (+70/-91) (core runtime drift)

### packages/opencode/src/tool/grep.ts

- **Drift/Unclassified** — All changed lines (+147/-136) (core runtime drift)

### packages/opencode/src/tool/index.ts

- **Drift/Unclassified** — All changed lines (+0/-3) (core runtime drift)

### packages/opencode/src/tool/invalid.ts

- **Drift/Unclassified** — All changed lines (+14/-17) (core runtime drift)

### packages/opencode/src/tool/ls.ts

- **Drift/Unclassified** — lines 1-121 (core runtime drift)

### packages/opencode/src/tool/ls.txt

- **Drift/Unclassified** — lines 1-1 (core runtime drift)

### packages/opencode/src/tool/lsp.ts

- **Drift/Unclassified** — All changed lines (+70/-64) (core runtime drift)

### packages/opencode/src/tool/mcp-exa.ts

- **Drift/Unclassified** — All changed lines (+0/-78) (core runtime drift)

### packages/opencode/src/tool/multiedit.ts

- **Drift/Unclassified** — lines 1-46 (core runtime drift)

### packages/opencode/src/tool/multiedit.txt

- **Drift/Unclassified** — lines 1-41 (core runtime drift)

### packages/opencode/src/tool/plan-exit.txt

- **Drift/Unclassified** — All changed lines (+1/-1) (core runtime drift)

### packages/opencode/src/tool/plan.ts

- **Drift/Unclassified** — All changed lines (+112/-60) (core runtime drift)

### packages/opencode/src/tool/question.ts

- **Drift/Unclassified** — All changed lines (+20/-19) (core runtime drift)

### packages/opencode/src/tool/read.ts

- **Drift/Unclassified** — All changed lines (+92/-86) (core runtime drift)

### packages/opencode/src/tool/registry.ts

- **Drift/Unclassified** — All changed lines (+211/-285) (core runtime drift)

### packages/opencode/src/tool/schema.ts

- **Drift/Unclassified** — All changed lines (+3/-3) (core runtime drift)

### packages/opencode/src/tool/skill.ts

- **Drift/Unclassified** — All changed lines (+94/-65) (core runtime drift)

### packages/opencode/src/tool/skill.txt

- **Drift/Unclassified** — All changed lines (+0/-5) (core runtime drift)

### packages/opencode/src/tool/task.ts

- **Drift/Unclassified** — All changed lines (+97/-106) (core runtime drift)

### packages/opencode/src/tool/task.txt

- **Drift/Unclassified** — All changed lines (+3/-0) (core runtime drift)

### packages/opencode/src/tool/todo.ts

- **Drift/Unclassified** — All changed lines (+21/-20) (core runtime drift)

### packages/opencode/src/tool/tool.ts

- **Drift/Unclassified** — All changed lines (+93/-123) (core runtime drift)

### packages/opencode/src/tool/truncate.ts

- **Drift/Unclassified** — All changed lines (+128/-126) (core runtime drift)

### packages/opencode/src/tool/webfetch.ts

- **Drift/Unclassified** — All changed lines (+149/-138) (core runtime drift)

### packages/opencode/src/tool/websearch.ts

- **Drift/Unclassified** — All changed lines (+142/-66) (core runtime drift)

### packages/opencode/src/tool/write.ts

- **Drift/Unclassified** — All changed lines (+64/-72) (core runtime drift)

### packages/opencode/src/util/archive.ts

- **Drift/Unclassified** — All changed lines (+13/-11) (core runtime drift)

### packages/opencode/src/util/color.ts

- **Drift/Unclassified** — All changed lines (+16/-14) (core runtime drift)

### packages/opencode/src/util/context.ts

- **Drift/Unclassified** — lines 1-25 (core runtime drift)

### packages/opencode/src/util/defer.ts

- **Drift/Unclassified** — All changed lines (+5/-3) (core runtime drift)

### packages/opencode/src/util/effect-zod.ts

- **Drift/Unclassified** — All changed lines (+15/-245) (core runtime drift)

### packages/opencode/src/util/error.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (core runtime drift)

### packages/opencode/src/util/filesystem.ts

- **Drift/Unclassified** — All changed lines (+197/-195) (core runtime drift)

### packages/opencode/src/util/flock.ts

- **Drift/Unclassified** — All changed lines (+4/-29) (core runtime drift)

### packages/opencode/src/util/glob.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/util/hash.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (core runtime drift)

### packages/opencode/src/util/index.ts

- **Drift/Unclassified** — All changed lines (+0/-12) (core runtime drift)

### packages/opencode/src/util/keybind.ts

- **Drift/Unclassified** — All changed lines (+86/-84) (core runtime drift)

### packages/opencode/src/util/lazy.ts

- **Drift/Unclassified** — All changed lines (+8/-3) (core runtime drift)

### packages/opencode/src/util/local-context.ts

- **Drift/Unclassified** — All changed lines (+0/-23) (core runtime drift)

### packages/opencode/src/util/locale.ts

- **Drift/Unclassified** — All changed lines (+65/-63) (core runtime drift)

### packages/opencode/src/util/lock.ts

- **Drift/Unclassified** — All changed lines (+72/-70) (core runtime drift)

### packages/opencode/src/util/log.ts

- **Drift/Unclassified** — All changed lines (+151/-154) (core runtime drift)

### packages/opencode/src/util/media.ts

- **Drift/Unclassified** — All changed lines (+0/-26) (core runtime drift)

### packages/opencode/src/util/opencode-process.ts

- **Drift/Unclassified** — All changed lines (+0/-24) (core runtime drift)

### packages/opencode/src/util/process.ts

- **Drift/Unclassified** — All changed lines (+142/-140) (core runtime drift)

### packages/opencode/src/util/rpc.ts

- **Drift/Unclassified** — All changed lines (+55/-53) (core runtime drift)

### packages/opencode/src/util/schema.ts

- **Drift/Unclassified** — All changed lines (+5/-5) (core runtime drift)

### packages/opencode/src/util/token.ts

- **Drift/Unclassified** — All changed lines (+5/-3) (core runtime drift)

### packages/opencode/src/util/wildcard.ts

- **Drift/Unclassified** — All changed lines (+45/-43) (core runtime drift)

### packages/opencode/src/v2/session-entry-stepper.ts

- **Drift/Unclassified** — All changed lines (+0/-261) (core runtime drift)

### packages/opencode/src/v2/session-entry.ts

- **Drift/Unclassified** — All changed lines (+0/-219) (core runtime drift)

### packages/opencode/src/v2/session-event.ts

- **Drift/Unclassified** — All changed lines (+0/-458) (core runtime drift)

### packages/opencode/src/v2/session.ts

- **Drift/Unclassified** — All changed lines (+0/-69) (core runtime drift)

### packages/opencode/src/worktree/index.ts

- **Drift/Unclassified** — All changed lines (+515/-502) (core runtime drift)

### packages/opencode/test/AGENTS.md

- **Drift/Unclassified** — All changed lines (+0/-52) (test drift outside the named agency regression buckets)

### packages/opencode/test/account/repo.test.ts

- **Drift/Unclassified** — All changed lines (+40/-40) (test drift outside the named agency regression buckets)

### packages/opencode/test/account/service.test.ts

- **Drift/Unclassified** — All changed lines (+12/-12) (test drift outside the named agency regression buckets)

### packages/opencode/test/acp/event-subscription.test.ts

- **Drift/Unclassified** — All changed lines (+2/-42) (test drift outside the named agency regression buckets)

### packages/opencode/test/agency-swarm/adapter.test.ts

- **Agency Swarm integration regression suite** — lines 1-293 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agency-swarm/client-config.test.ts

- **Agency Swarm integration regression suite** — lines 1-143 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agency-swarm/history.test.ts

- **Agency Swarm integration regression suite** — lines 1-147 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agency-swarm/npx.test.ts

- **Agency Swarm integration regression suite** — lines 1-1035 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agency-swarm/run-session.test.ts

- **Agency Swarm integration regression suite** — lines 1-48 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agency-swarm/tui.test.ts

- **Agency Swarm integration regression suite** — lines 1-62 (fork-only agency-swarm regression coverage)

### packages/opencode/test/agent/agent.test.ts

- **Drift/Unclassified** — All changed lines (+46/-53) (test drift outside the named agency regression buckets)

### packages/opencode/test/agent/display.test.ts

- **Drift/Unclassified** — lines 1-11 (test drift outside the named agency regression buckets)

### packages/opencode/test/auth/auth.test.ts

- **Drift/Unclassified** — All changed lines (+52/-80) (test drift outside the named agency regression buckets)

### packages/opencode/test/bus/bus-effect.test.ts

- **Drift/Unclassified** — All changed lines (+4/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/agencii.test.ts

- **Agency Swarm integration regression suite** — lines 1-36 (fork-only agencii regression coverage)

### packages/opencode/test/cli/tui/agency-swarm-connection.test.tsx

- **Agency Swarm integration regression suite** — lines 1-111 (fork-only TUI regression coverage)

### packages/opencode/test/cli/tui/dialog-auth-modal.test.tsx

- **Agency Swarm integration regression suite** — lines 1-330 (fork-only TUI regression coverage)

### packages/opencode/test/cli/tui/dialog-provider-browser.test.tsx

- **Drift/Unclassified** — lines 1-143 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/dialog-provider.test.ts

- **Drift/Unclassified** — lines 1-37 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/local-context.test.tsx

- **Drift/Unclassified** — lines 1-117 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/local.test.ts

- **Drift/Unclassified** — lines 1-299 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-add.test.ts

- **Drift/Unclassified** — All changed lines (+9/-13) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-install.test.ts

- **Drift/Unclassified** — All changed lines (+5/-3) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-lifecycle.test.ts

- **Drift/Unclassified** — All changed lines (+10/-9) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-loader-entrypoint.test.ts

- **Drift/Unclassified** — All changed lines (+39/-31) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-loader-pure.test.ts

- **Drift/Unclassified** — All changed lines (+5/-4) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-loader.test.ts

- **Drift/Unclassified** — All changed lines (+38/-92) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/plugin-toggle.test.ts

- **Drift/Unclassified** — All changed lines (+9/-7) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/prompt-framework-mode.test.tsx

- **Drift/Unclassified** — lines 1-225 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/prompt.test.tsx

- **Drift/Unclassified** — lines 1-328 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/provider-auth.test.ts

- **Drift/Unclassified** — lines 1-154 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/revert-diff.test.ts

- **Drift/Unclassified** — All changed lines (+0/-35) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/session-error.test.ts

- **Agency Swarm integration regression suite** — lines 1-1076 (fork-only TUI regression coverage)

### packages/opencode/test/cli/tui/theme-provider.test.tsx

- **Drift/Unclassified** — lines 1-222 (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/theme-store.test.ts

- **Drift/Unclassified** — All changed lines (+70/-4) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/thread.test.ts

- **Drift/Unclassified** — All changed lines (+92/-3) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/transcript.test.ts

- **Drift/Unclassified** — All changed lines (+8/-8) (test drift outside the named agency regression buckets)

### packages/opencode/test/cli/tui/use-event.test.tsx

- **Drift/Unclassified** — All changed lines (+0/-175) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/agent-color.test.ts

- **Drift/Unclassified** — All changed lines (+6/-12) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/config.test.ts

- **Drift/Unclassified** — All changed lines (+363/-263) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/lsp.test.ts

- **Drift/Unclassified** — All changed lines (+0/-87) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/markdown.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/plugin.test.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (test drift outside the named agency regression buckets)

### packages/opencode/test/config/tui.test.ts

- **Drift/Unclassified** — All changed lines (+351/-183) (test drift outside the named agency regression buckets)

### packages/opencode/test/control-plane/adaptors.test.ts

- **Drift/Unclassified** — All changed lines (+0/-71) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/app-runtime-logger.test.ts

- **Drift/Unclassified** — All changed lines (+0/-92) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/cross-spawn-spawner.test.ts

- **Drift/Unclassified** — All changed lines (+2/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/instance-state.test.ts

- **Drift/Unclassified** — All changed lines (+9/-9) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/observability.test.ts

- **Drift/Unclassified** — All changed lines (+0/-46) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/run-service.test.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (test drift outside the named agency regression buckets)

### packages/opencode/test/effect/runner.test.ts

- **Drift/Unclassified** — All changed lines (+44/-15) (test drift outside the named agency regression buckets)

### packages/opencode/test/fake/provider.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/file/fsmonitor.test.ts

- **Drift/Unclassified** — All changed lines (+3/-9) (test drift outside the named agency regression buckets)

### packages/opencode/test/file/index.test.ts

- **Drift/Unclassified** — All changed lines (+82/-92) (test drift outside the named agency regression buckets)

### packages/opencode/test/file/path-traversal.test.ts

- **Drift/Unclassified** — All changed lines (+9/-15) (test drift outside the named agency regression buckets)

### packages/opencode/test/file/ripgrep.test.ts

- **Drift/Unclassified** — All changed lines (+14/-174) (test drift outside the named agency regression buckets)

### packages/opencode/test/file/time.test.ts

- **Drift/Unclassified** — lines 1-445 (test drift outside the named agency regression buckets)

### packages/opencode/test/file/watcher.test.ts

- **Drift/Unclassified** — All changed lines (+1/-3) (test drift outside the named agency regression buckets)

### packages/opencode/test/filesystem/filesystem.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/db.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/fixture.ts

- **Drift/Unclassified** — All changed lines (+6/-5) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/flock-worker.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/lsp/fake-lsp-server.js

- **Drift/Unclassified** — All changed lines (+2/-0) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/plug-worker.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/plugin-meta-worker.ts

- **Drift/Unclassified** — All changed lines (+7/-0) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/tui-plugin.ts

- **Drift/Unclassified** — All changed lines (+6/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/fixture/tui-runtime.ts

- **Drift/Unclassified** — All changed lines (+11/-15) (test drift outside the named agency regression buckets)

### packages/opencode/test/format/format.test.ts

- **Drift/Unclassified** — All changed lines (+70/-143) (test drift outside the named agency regression buckets)

### packages/opencode/test/installation/installation.test.ts

- **Drift/Unclassified** — All changed lines (+0/-55) (test drift outside the named agency regression buckets)

### packages/opencode/test/installation/source-install-wrapper.test.ts

- **Drift/Unclassified** — lines 1-81 (test drift outside the named agency regression buckets)

### packages/opencode/test/keybind.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/lib/llm-server.ts

- **Drift/Unclassified** — All changed lines (+26/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/lsp/client.test.ts

- **Drift/Unclassified** — All changed lines (+3/-6) (test drift outside the named agency regression buckets)

### packages/opencode/test/lsp/index.test.ts

- **Drift/Unclassified** — All changed lines (+128/-104) (test drift outside the named agency regression buckets)

### packages/opencode/test/lsp/lifecycle.test.ts

- **Drift/Unclassified** — All changed lines (+91/-128) (test drift outside the named agency regression buckets)

### packages/opencode/test/mcp/headers.test.ts

- **Drift/Unclassified** — All changed lines (+22/-47) (test drift outside the named agency regression buckets)

### packages/opencode/test/mcp/lifecycle.test.ts

- **Drift/Unclassified** — All changed lines (+303/-339) (test drift outside the named agency regression buckets)

### packages/opencode/test/mcp/oauth-auto-connect.test.ts

- **Drift/Unclassified** — All changed lines (+12/-94) (test drift outside the named agency regression buckets)

### packages/opencode/test/mcp/oauth-browser.test.ts

- **Drift/Unclassified** — All changed lines (+8/-27) (test drift outside the named agency regression buckets)

### packages/opencode/test/mcp/oauth-callback.test.ts

- **Drift/Unclassified** — All changed lines (+0/-34) (test drift outside the named agency regression buckets)

### packages/opencode/test/memory/abort-leak-webfetch.ts

- **Drift/Unclassified** — All changed lines (+0/-49) (test drift outside the named agency regression buckets)

### packages/opencode/test/memory/abort-leak.test.ts

- **Drift/Unclassified** — All changed lines (+44/-34) (test drift outside the named agency regression buckets)

### packages/opencode/test/permission-task.test.ts

- **Drift/Unclassified** — All changed lines (+7/-10) (test drift outside the named agency regression buckets)

### packages/opencode/test/permission/next.test.ts

- **Drift/Unclassified** — All changed lines (+541/-533) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/auth-override.test.ts

- **Drift/Unclassified** — All changed lines (+3/-8) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/cloudflare.test.ts

- **Drift/Unclassified** — All changed lines (+0/-68) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/github-copilot-models.test.ts

- **Drift/Unclassified** — All changed lines (+0/-46) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/install-concurrency.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/install.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/loader-shared.test.ts

- **Drift/Unclassified** — All changed lines (+79/-112) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/meta.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/trigger.test.ts

- **Drift/Unclassified** — All changed lines (+28/-33) (test drift outside the named agency regression buckets)

### packages/opencode/test/plugin/workspace-adaptor.test.ts

- **Drift/Unclassified** — All changed lines (+0/-109) (test drift outside the named agency regression buckets)

### packages/opencode/test/preload.ts

- **Drift/Unclassified** — All changed lines (+3/-4) (test drift outside the named agency regression buckets)

### packages/opencode/test/project/migrate-global.test.ts

- **Drift/Unclassified** — All changed lines (+11/-21) (test drift outside the named agency regression buckets)

### packages/opencode/test/project/project.test.ts

- **Drift/Unclassified** — All changed lines (+73/-88) (test drift outside the named agency regression buckets)

### packages/opencode/test/project/state.test.ts

- **Drift/Unclassified** — lines 1-115 (test drift outside the named agency regression buckets)

### packages/opencode/test/project/vcs.test.ts

- **Drift/Unclassified** — All changed lines (+13/-71) (test drift outside the named agency regression buckets)

### packages/opencode/test/project/worktree-remove.test.ts

- **Drift/Unclassified** — All changed lines (+89/-119) (test drift outside the named agency regression buckets)

### packages/opencode/test/project/worktree.test.ts

- **Drift/Unclassified** — All changed lines (+128/-169) (test drift outside the named agency regression buckets)

### packages/opencode/test/provider/agency-swarm-provider.test.ts

- **Agency Swarm integration regression suite** — lines 1-110 (fork-only agency provider regression coverage)

### packages/opencode/test/provider/amazon-bedrock.test.ts

- **Drift/Unclassified** — All changed lines (+30/-45) (test drift outside the named agency regression buckets)

### packages/opencode/test/provider/gitlab-duo.test.ts

- **Drift/Unclassified** — All changed lines (+19/-20) (test drift outside the named agency regression buckets)

### packages/opencode/test/provider/provider.test.ts

- **Drift/Unclassified** — All changed lines (+142/-290) (test drift outside the named agency regression buckets)

### packages/opencode/test/provider/transform.test.ts

- **Drift/Unclassified** — All changed lines (+4/-315) (test drift outside the named agency regression buckets)

### packages/opencode/test/pty/pty-output-isolation.test.ts

- **Drift/Unclassified** — All changed lines (+110/-115) (test drift outside the named agency regression buckets)

### packages/opencode/test/pty/pty-session.test.ts

- **Drift/Unclassified** — All changed lines (+44/-54) (test drift outside the named agency regression buckets)

### packages/opencode/test/pty/pty-shell.test.ts

- **Drift/Unclassified** — All changed lines (+16/-26) (test drift outside the named agency regression buckets)

### packages/opencode/test/question/question.test.ts

- **Drift/Unclassified** — All changed lines (+52/-63) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/global-session-list.test.ts

- **Drift/Unclassified** — All changed lines (+16/-32) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/project-init-git.test.ts

- **Drift/Unclassified** — All changed lines (+14/-15) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/session-actions.test.ts

- **Drift/Unclassified** — All changed lines (+59/-25) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/session-list.test.ts

- **Drift/Unclassified** — All changed lines (+19/-31) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/session-messages.test.ts

- **Drift/Unclassified** — All changed lines (+30/-38) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/session-select.test.ts

- **Drift/Unclassified** — All changed lines (+8/-24) (test drift outside the named agency regression buckets)

### packages/opencode/test/server/trace-attributes.test.ts

- **Drift/Unclassified** — All changed lines (+0/-76) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/agency-swarm-utils.test.ts

- **Agency Swarm integration regression suite** — lines 1-175 (fork-only agency session regression coverage)

### packages/opencode/test/session/agency-swarm.test.ts

- **Agency Swarm integration regression suite** — lines 1-3860 (fork-only agency session regression coverage)

### packages/opencode/test/session/agent-builder.test.ts

- **Drift/Unclassified** — lines 1-16 (test drift outside the named agency regression buckets)

### packages/opencode/test/session/agent-planner.test.ts

- **Drift/Unclassified** — lines 1-14 (test drift outside the named agency regression buckets)

### packages/opencode/test/session/compaction.test.ts

- **Drift/Unclassified** — All changed lines (+251/-951) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/instruction.test.ts

- **Drift/Unclassified** — All changed lines (+71/-172) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/llm.test.ts

- **Drift/Unclassified** — All changed lines (+121/-300) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/message-v2.test.ts

- **Drift/Unclassified** — All changed lines (+1/-160) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/messages-pagination.test.ts

- **Drift/Unclassified** — All changed lines (+98/-253) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/processor-effect.test.ts

- **Drift/Unclassified** — All changed lines (+12/-107) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/prompt-effect.test.ts

- **Drift/Unclassified** — lines 1-1294 (test drift outside the named agency regression buckets)

### packages/opencode/test/session/prompt.test.ts

- **Drift/Unclassified** — All changed lines (+495/-1759) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/retry.test.ts

- **Drift/Unclassified** — All changed lines (+9/-55) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/revert-compact.test.ts

- **Drift/Unclassified** — All changed lines (+544/-562) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/session-entry-stepper.test.ts

- **Drift/Unclassified** — All changed lines (+0/-916) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/session.test.ts

- **Drift/Unclassified** — All changed lines (+28/-67) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/snapshot-tool-race.test.ts

- **Drift/Unclassified** — All changed lines (+25/-32) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/structured-output-integration.test.ts

- **Drift/Unclassified** — All changed lines (+162/-193) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/structured-output.test.ts

- **Drift/Unclassified** — All changed lines (+16/-6) (test drift outside the named agency regression buckets)

### packages/opencode/test/session/system.test.ts

- **Drift/Unclassified** — All changed lines (+4/-14) (test drift outside the named agency regression buckets)

### packages/opencode/test/share/share-next.test.ts

- **Drift/Unclassified** — All changed lines (+16/-15) (test drift outside the named agency regression buckets)

### packages/opencode/test/shell/shell.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/skill/discovery.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/skill/skill.test.ts

- **Drift/Unclassified** — All changed lines (+272/-271) (test drift outside the named agency regression buckets)

### packages/opencode/test/snapshot/snapshot.test.ts

- **Drift/Unclassified** — All changed lines (+169/-296) (test drift outside the named agency regression buckets)

### packages/opencode/test/storage/db.test.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (test drift outside the named agency regression buckets)

### packages/opencode/test/storage/json-migration.test.ts

- **Drift/Unclassified** — All changed lines (+48/-31) (test drift outside the named agency regression buckets)

### packages/opencode/test/storage/storage.test.ts

- **Drift/Unclassified** — All changed lines (+232/-230) (test drift outside the named agency regression buckets)

### packages/opencode/test/sync/index.test.ts

- **Drift/Unclassified** — All changed lines (+3/-49) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/apply_patch.test.ts

- **Drift/Unclassified** — All changed lines (+15/-33) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/bash.test.ts

- **Drift/Unclassified** — All changed lines (+289/-385) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/edit.test.ts

- **Drift/Unclassified** — All changed lines (+241/-251) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/external-directory.test.ts

- **Drift/Unclassified** — All changed lines (+52/-23) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/glob.test.ts

- **Drift/Unclassified** — All changed lines (+0/-81) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/grep.test.ts

- **Drift/Unclassified** — All changed lines (+74/-77) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/question.test.ts

- **Drift/Unclassified** — All changed lines (+8/-11) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/read.test.ts

- **Drift/Unclassified** — All changed lines (+22/-37) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/registry.test.ts

- **Drift/Unclassified** — All changed lines (+106/-132) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/skill.test.ts

- **Drift/Unclassified** — All changed lines (+122/-51) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/task.test.ts

- **Drift/Unclassified** — All changed lines (+36/-374) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/tool-define.test.ts

- **Drift/Unclassified** — All changed lines (+65/-23) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/truncation.test.ts

- **Drift/Unclassified** — All changed lines (+98/-133) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/webfetch.test.ts

- **Drift/Unclassified** — All changed lines (+76/-25) (test drift outside the named agency regression buckets)

### packages/opencode/test/tool/write.test.ts

- **Drift/Unclassified** — All changed lines (+289/-179) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/effect-zod.test.ts

- **Drift/Unclassified** — All changed lines (+4/-697) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/filesystem.test.ts

- **Drift/Unclassified** — All changed lines (+14/-14) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/flock.test.ts

- **Drift/Unclassified** — All changed lines (+24/-67) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/glob.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/lock.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/log.test.ts

- **Drift/Unclassified** — All changed lines (+0/-44) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/module.test.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/process.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/util/wildcard.test.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (test drift outside the named agency regression buckets)

### packages/opencode/test/workspace/workspace-restore.test.ts

- **Drift/Unclassified** — All changed lines (+0/-281) (test drift outside the named agency regression buckets)

### packages/opencode/tsconfig.json

- **Drift/Unclassified** — All changed lines (+1/-2) (package-level fork drift)

### packages/plugin/package.json

- **Drift/Unclassified** — All changed lines (+5/-6) (package-level fork drift)

### packages/plugin/script/publish.ts

- **GitHub release publishes fork npm packages** — All changed lines (+11/-27) (plugin package publish script wiring)

### packages/plugin/src/example-workspace.ts

- **Drift/Unclassified** — All changed lines (+0/-34) (package-level fork drift)

### packages/plugin/src/example.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/plugin/src/index.ts

- **Drift/Unclassified** — All changed lines (+0/-51) (package-level fork drift)

### packages/plugin/src/tool.ts

- **Drift/Unclassified** — All changed lines (+2/-5) (package-level fork drift)

### packages/plugin/src/tui.ts

- **Drift/Unclassified** — All changed lines (+6/-1) (package-level fork drift)

### packages/plugin/tsconfig.json

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/sdk/js/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/sdk/js/script/publish.ts

- **GitHub release publishes fork npm packages** — All changed lines (+18/-32) (SDK package publish script wiring)

### packages/sdk/js/src/gen/core/serverSentEvents.gen.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (generated or mechanical artifact drift)

### packages/sdk/js/src/v2/client.ts

- **Drift/Unclassified** — All changed lines (+0/-7) (package-level fork drift)

### packages/sdk/js/src/v2/data.ts

- **Drift/Unclassified** — All changed lines (+0/-32) (package-level fork drift)

### packages/sdk/js/src/v2/gen/sdk.gen.ts

- **Drift/Unclassified** — All changed lines (+260/-499) (generated SDK artifact drift)

### packages/sdk/js/src/v2/gen/types.gen.ts

- **Drift/Unclassified** — All changed lines (+517/-744) (generated SDK artifact drift)

### packages/sdk/js/src/v2/index.ts

- **Drift/Unclassified** — All changed lines (+0/-2) (package-level fork drift)

### packages/sdk/openapi.json

- **Drift/Unclassified** — All changed lines (+1721/-2223) (generated SDK artifact drift)

### packages/shared/package.json

- **Drift/Unclassified** — All changed lines (+0/-39) (package-level fork drift)

### packages/shared/src/global.ts

- **Drift/Unclassified** — All changed lines (+0/-42) (package-level fork drift)

### packages/shared/src/types.d.ts

- **Drift/Unclassified** — All changed lines (+0/-46) (package-level fork drift)

### packages/shared/src/util/effect-flock.ts

- **Drift/Unclassified** — All changed lines (+0/-283) (package-level fork drift)

### packages/shared/test/filesystem/filesystem.test.ts

- **Drift/Unclassified** — All changed lines (+0/-338) (package-level fork drift)

### packages/shared/test/fixture/effect-flock-worker.ts

- **Drift/Unclassified** — All changed lines (+0/-63) (package-level fork drift)

### packages/shared/test/fixture/flock-worker.ts

- **Drift/Unclassified** — All changed lines (+0/-72) (package-level fork drift)

### packages/shared/test/lib/effect.ts

- **Drift/Unclassified** — All changed lines (+0/-53) (package-level fork drift)

### packages/shared/test/util/effect-flock.test.ts

- **Drift/Unclassified** — All changed lines (+0/-389) (package-level fork drift)

### packages/shared/tsconfig.json

- **Drift/Unclassified** — All changed lines (+0/-14) (package-level fork drift)

### packages/slack/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/slack/src/index.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/storybook/.storybook/mocks/app/context/language.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/ui/package.json

- **Drift/Unclassified** — All changed lines (+2/-3) (package-level fork drift)

### packages/ui/src/components/accordion.css

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/ui/src/components/accordion.tsx

- **Drift/Unclassified** — All changed lines (+5/-5) (package-level fork drift)

### packages/ui/src/components/app-icon.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/apply-patch-file.test.ts

- **Drift/Unclassified** — All changed lines (+0/-43) (package-level fork drift)

### packages/ui/src/components/apply-patch-file.ts

- **Drift/Unclassified** — All changed lines (+0/-78) (package-level fork drift)

### packages/ui/src/components/avatar.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/basic-tool.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/button.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/card.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/ui/src/components/collapsible.css

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/collapsible.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/context-menu.tsx

- **Drift/Unclassified** — All changed lines (+16/-16) (package-level fork drift)

### packages/ui/src/components/dialog.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/dock-surface.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (package-level fork drift)

### packages/ui/src/components/dropdown-menu.tsx

- **Drift/Unclassified** — All changed lines (+16/-16) (package-level fork drift)

### packages/ui/src/components/file-icon.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/file-media.tsx

- **Drift/Unclassified** — All changed lines (+0/-2) (package-level fork drift)

### packages/ui/src/components/file-ssr.tsx

- **Drift/Unclassified** — All changed lines (+11/-26) (package-level fork drift)

### packages/ui/src/components/file.tsx

- **Drift/Unclassified** — All changed lines (+8/-43) (package-level fork drift)

### packages/ui/src/components/hover-card.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/icon-button.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/icon.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/keybind.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/line-comment.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/list.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/markdown.css

- **Drift/Unclassified** — All changed lines (+15/-15) (package-level fork drift)

### packages/ui/src/components/markdown.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (package-level fork drift)

### packages/ui/src/components/message-part.css

- **Drift/Unclassified** — All changed lines (+7/-12) (package-level fork drift)

### packages/ui/src/components/message-part.tsx

- **Drift/Unclassified** — All changed lines (+31/-9) (package-level fork drift)

### packages/ui/src/components/popover.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/progress-circle.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/progress.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/provider-icon.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/provider-icons/types.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/ui/src/components/radio-group.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/resize-handle.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/select.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (package-level fork drift)

### packages/ui/src/components/session-diff.test.ts

- **Drift/Unclassified** — All changed lines (+0/-37) (package-level fork drift)

### packages/ui/src/components/session-diff.ts

- **Drift/Unclassified** — All changed lines (+0/-92) (package-level fork drift)

### packages/ui/src/components/session-review.tsx

- **Drift/Unclassified** — All changed lines (+31/-50) (package-level fork drift)

### packages/ui/src/components/session-turn.css

- **Drift/Unclassified** — All changed lines (+3/-10) (package-level fork drift)

### packages/ui/src/components/session-turn.tsx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/ui/src/components/spinner.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/sticky-accordion-header.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/tabs.tsx

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/ui/src/components/tag.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/text-field.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/text-reveal.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/thinking-heading.stories.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/timeline-playground.stories.tsx

- **Drift/Unclassified** — All changed lines (+12/-36) (package-level fork drift)

### packages/ui/src/components/toast.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/tool-error-card.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/tool-status-title.tsx

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/components/tooltip.tsx

- **Drift/Unclassified** — All changed lines (+0/-12) (package-level fork drift)

### packages/ui/src/context/data.tsx

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/ui/src/pierre/commented-lines.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/pierre/worker.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/src/styles/base.css

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

### packages/ui/vite.config.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/util/package.json

- **Drift/Unclassified** — lines 1-20 (package-level fork drift)

### packages/util/src/array.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/binary.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/encode.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/error.ts

- **Drift/Unclassified** — All changed lines (+0/-6) (package-level fork drift)

### packages/util/src/fn.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/identifier.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/iife.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/lazy.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/module.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/src/path.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (package-level fork drift)

### packages/util/src/retry.ts

- **Drift/Unclassified** — All changed lines (+0/-1) (package-level fork drift)

### packages/util/src/slug.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/sst-env.d.ts

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (package-level fork drift)

### packages/util/tsconfig.json

- **Drift/Unclassified** — lines 1-14 (package-level fork drift)

### packages/web/package.json

- **Drift/Unclassified** — All changed lines (+2/-2) (package-level fork drift)

### packages/web/src/components/Share.tsx

- **Drift/Unclassified** — All changed lines (+3/-3) (package-level fork drift)

### packages/web/src/components/share/part.tsx

- **Drift/Unclassified** — All changed lines (+2/-8) (package-level fork drift)

### packages/web/src/content/docs/ar/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ar/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/ar/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ar/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/ar/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/ar/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/bs/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/bs/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/bs/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/bs/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/bs/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/bs/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/cli.mdx

- **Drift/Unclassified** — All changed lines (+15/-15) (package-level fork drift)

### packages/web/src/content/docs/da/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/da/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/da/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/da/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/da/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/da/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/de/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/de/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/de/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/de/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/de/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/de/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/es/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/es/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/es/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/es/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/es/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/es/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/fr/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/fr/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/fr/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/fr/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/fr/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/fr/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/go.mdx

- **Drift/Unclassified** — All changed lines (+9/-24) (package-level fork drift)

### packages/web/src/content/docs/it/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/it/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/it/modes.mdx

- **Drift/Unclassified** — All changed lines (+12/-11) (package-level fork drift)

### packages/web/src/content/docs/it/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/it/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/it/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/ja/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ja/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/ja/modes.mdx

- **Drift/Unclassified** — All changed lines (+12/-11) (package-level fork drift)

### packages/web/src/content/docs/ja/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/ja/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/ja/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/ko/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ko/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/ko/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ko/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/ko/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/ko/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/modes.mdx

- **Drift/Unclassified** — All changed lines (+12/-11) (package-level fork drift)

### packages/web/src/content/docs/nb/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/nb/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/nb/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/nb/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/nb/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/nb/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/pl/cli.mdx

- **Drift/Unclassified** — All changed lines (+27/-26) (package-level fork drift)

### packages/web/src/content/docs/pl/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/pl/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/pl/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/pl/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/pl/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/providers.mdx

- **Drift/Unclassified** — All changed lines (+0/-122) (package-level fork drift)

### packages/web/src/content/docs/pt-br/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/pt-br/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/pt-br/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/pt-br/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/pt-br/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/pt-br/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/ru/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/ru/go.mdx

- **Drift/Unclassified** — All changed lines (+8/-23) (package-level fork drift)

### packages/web/src/content/docs/ru/modes.mdx

- **Drift/Unclassified** — All changed lines (+12/-11) (package-level fork drift)

### packages/web/src/content/docs/ru/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/ru/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/ru/zen.mdx

- **Drift/Unclassified** — All changed lines (+17/-18) (package-level fork drift)

### packages/web/src/content/docs/th/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/th/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/th/modes.mdx

- **Drift/Unclassified** — All changed lines (+12/-11) (package-level fork drift)

### packages/web/src/content/docs/th/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/th/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/th/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/tr/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/tr/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/tr/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/tr/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/tr/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/tr/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/zen.mdx

- **Drift/Unclassified** — All changed lines (+9/-18) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/zh-cn/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/cli.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/go.mdx

- **Drift/Unclassified** — All changed lines (+7/-22) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/modes.mdx

- **Drift/Unclassified** — All changed lines (+1/-0) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/permissions.mdx

- **Drift/Unclassified** — All changed lines (+3/-2) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/tools.mdx

- **Drift/Unclassified** — All changed lines (+20/-3) (package-level fork drift)

### packages/web/src/content/docs/zh-tw/zen.mdx

- **Drift/Unclassified** — All changed lines (+16/-17) (package-level fork drift)

### packages/web/src/pages/s/[id].astro

- **Drift/Unclassified** — All changed lines (+1/-1) (package-level fork drift)

## patches

### patches/@npmcli%2Fagent@4.0.0.patch

- **Drift/Unclassified** — All changed lines (+0/-13) (repo-level fork drift)

### patches/install-korean-ime-fix.sh

- **Drift/Unclassified** — All changed lines (+0/-120) (repo-level fork drift)

## script

### script/beta.ts

- **Drift/Unclassified** — All changed lines (+4/-1) (repo-level fork drift)

### script/duplicate-pr.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (repo-level fork drift)

### script/github/close-issues.ts

- **Drift/Unclassified** — All changed lines (+2/-1) (repo-level fork drift)

### script/publish.ts

- **GitHub release publishes fork npm packages** — All changed lines (+61/-49) (top-level release publish orchestration)

### script/stats.ts

- **Drift/Unclassified** — All changed lines (+1/-1) (repo-level fork drift)

### script/version.ts

- **Drift/Unclassified** — All changed lines (+2/-2) (repo-level fork drift)

## sdks

### sdks/vscode/package.json

- **Drift/Unclassified** — All changed lines (+1/-1) (generated SDK artifact drift)

### sdks/vscode/src/extension.ts

- **Drift/Unclassified** — All changed lines (+4/-4) (generated SDK artifact drift)

## (root)

### session.json

- **Drift/Unclassified** — Binary asset change (not counted by numstat) (repo-level fork drift)

## specs

### specs/v2/session.md

- **Drift/Unclassified** — All changed lines (+0/-17) (repo-level fork drift)

## (root)

### sst-env.d.ts

- **Drift/Unclassified** — All changed lines (+4/-0) (repo-level fork drift)

## Escalations Appendix

1. `.github/VOUCHED.td` — All changed lines (+0/-4) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
2. `.github/workflows/deploy.yml` — All changed lines (+1/-0) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
3. `.github/workflows/nix-eval.yml` — All changed lines (+7/-1) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
4. `.github/workflows/pr-management.yml` — All changed lines (+1/-1) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
5. `.github/workflows/publish.yml` — All changed lines (+1/-2) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
6. `.github/workflows/test.yml` — All changed lines (+12/-18) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
7. `.github/workflows/typecheck.yml` — All changed lines (+7/-1) — repo workflow or metadata drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This repo-level automation change does not map cleanly to a current changelog bucket.
8. `.opencode/.gitignore` — All changed lines (+1/-2) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
9. `.opencode/agent/translator.md` — All changed lines (+1/-0) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
10. `.opencode/opencode.jsonc` — All changed lines (+5/-1) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
11. `.opencode/skills/effect/SKILL.md` — All changed lines (+0/-21) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
12. `.opencode/tool/github-pr-search.ts` — All changed lines (+1/-1) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
13. `.opencode/tool/github-triage.ts` — All changed lines (+1/-1) — local app config or tool drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This fork-local config/tool change is not named in the current changelog.
14. `.oxlintrc.json` — All changed lines (+0/-51) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
15. `AGENTS.md` — All changed lines (+462/-97) — mixed policy rewrite spanning named and unnamed rule changes. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog breaks out only a few policy themes, so this broader rule file stays below 80% confidence.
16. `CLAUDE.md` — All changed lines (+1/-0) — mixed policy rewrite spanning named and unnamed rule changes. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog breaks out only a few policy themes, so this broader rule file stays below 80% confidence.
17. `github/index.ts` — All changed lines (+6/-6) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
18. `infra/console.ts` — All changed lines (+1/-0) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
19. `infra/enterprise.ts` — All changed lines (+2/-2) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
20. `nix/hashes.json` — All changed lines (+4/-4) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
21. `nix/node_modules.nix` — All changed lines (+0/-1) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
22. `package.json` — All changed lines (+6/-17) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
23. `packages/app/README.md` — All changed lines (+3/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
24. `packages/app/e2e/AGENTS.md` — lines 1-225 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
25. `packages/app/e2e/actions.ts` — lines 1-1063 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
26. `packages/app/e2e/app/home.spec.ts` — lines 1-24 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
27. `packages/app/e2e/app/navigation.spec.ts` — lines 1-10 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
28. `packages/app/e2e/app/palette.spec.ts` — lines 1-20 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
29. `packages/app/e2e/app/server-default.spec.ts` — lines 1-48 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
30. `packages/app/e2e/app/session.spec.ts` — lines 1-16 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
31. `packages/app/e2e/app/titlebar-history.spec.ts` — lines 1-120 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
32. `packages/app/e2e/backend.ts` — lines 1-137 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
33. `packages/app/e2e/commands/input-focus.spec.ts` — lines 1-16 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
34. `packages/app/e2e/commands/panels.spec.ts` — lines 1-33 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
35. `packages/app/e2e/commands/tab-close.spec.ts` — lines 1-32 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
36. `packages/app/e2e/files/file-open.spec.ts` — lines 1-31 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
37. `packages/app/e2e/files/file-tree.spec.ts` — lines 1-56 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
38. `packages/app/e2e/files/file-viewer.spec.ts` — lines 1-156 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
39. `packages/app/e2e/fixtures.ts` — lines 1-604 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
40. `packages/app/e2e/models/model-picker.spec.ts` — lines 1-48 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
41. `packages/app/e2e/models/models-visibility.spec.ts` — lines 1-61 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
42. `packages/app/e2e/projects/project-edit.spec.ts` — lines 1-49 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
43. `packages/app/e2e/projects/projects-close.spec.ts` — lines 1-49 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
44. `packages/app/e2e/projects/projects-switch.spec.ts` — lines 1-94 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
45. `packages/app/e2e/projects/workspace-new-session.spec.ts` — lines 1-78 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
46. `packages/app/e2e/projects/workspaces.spec.ts` — lines 1-368 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
47. `packages/app/e2e/prompt/context.spec.ts` — lines 1-95 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
48. `packages/app/e2e/prompt/mock.ts` — lines 1-15 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
49. `packages/app/e2e/prompt/prompt-async.spec.ts` — lines 1-54 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
50. `packages/app/e2e/prompt/prompt-drop-file-uri.spec.ts` — lines 1-22 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
51. `packages/app/e2e/prompt/prompt-drop-file.spec.ts` — lines 1-30 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
52. `packages/app/e2e/prompt/prompt-footer-focus.spec.ts` — lines 1-88 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
53. `packages/app/e2e/prompt/prompt-history.spec.ts` — lines 1-146 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
54. `packages/app/e2e/prompt/prompt-mention.spec.ts` — lines 1-26 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
55. `packages/app/e2e/prompt/prompt-multiline.spec.ts` — lines 1-24 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
56. `packages/app/e2e/prompt/prompt-shell.spec.ts` — lines 1-74 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
57. `packages/app/e2e/prompt/prompt-slash-open.spec.ts` — lines 1-22 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
58. `packages/app/e2e/prompt/prompt-slash-share.spec.ts` — lines 1-66 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
59. `packages/app/e2e/prompt/prompt-slash-terminal.spec.ts` — lines 1-18 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
60. `packages/app/e2e/prompt/prompt.spec.ts` — lines 1-28 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
61. `packages/app/e2e/selectors.ts` — lines 1-65 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
62. `packages/app/e2e/session/session-child-navigation.spec.ts` — lines 1-64 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
63. `packages/app/e2e/session/session-composer-dock.spec.ts` — lines 1-655 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
64. `packages/app/e2e/session/session-model-persistence.spec.ts` — lines 1-366 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
65. `packages/app/e2e/session/session-review.spec.ts` — lines 1-440 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
66. `packages/app/e2e/session/session-undo-redo.spec.ts` — lines 1-233 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
67. `packages/app/e2e/session/session.spec.ts` — lines 1-182 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
68. `packages/app/e2e/settings/settings-keybinds.spec.ts` — lines 1-389 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
69. `packages/app/e2e/settings/settings-models.spec.ts` — lines 1-122 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
70. `packages/app/e2e/settings/settings-providers.spec.ts` — lines 1-136 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
71. `packages/app/e2e/settings/settings.spec.ts` — lines 1-713 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
72. `packages/app/e2e/sidebar/sidebar-popover-actions.spec.ts` — lines 1-109 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
73. `packages/app/e2e/sidebar/sidebar-session-links.spec.ts` — lines 1-30 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
74. `packages/app/e2e/sidebar/sidebar.spec.ts` — lines 1-40 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
75. `packages/app/e2e/status/status-popover.spec.ts` — lines 1-67 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
76. `packages/app/e2e/terminal/terminal-init.spec.ts` — lines 1-28 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
77. `packages/app/e2e/terminal/terminal-reconnect.spec.ts` — lines 1-45 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
78. `packages/app/e2e/terminal/terminal-tabs.spec.ts` — lines 1-165 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
79. `packages/app/e2e/terminal/terminal.spec.ts` — lines 1-18 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
80. `packages/app/e2e/thinking-level.spec.ts` — lines 1-25 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
81. `packages/app/e2e/todo.spec.ts` — All changed lines (+0/-11) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
82. `packages/app/e2e/tsconfig.json` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
83. `packages/app/e2e/utils.ts` — lines 1-63 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
84. `packages/app/package.json` — All changed lines (+4/-4) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
85. `packages/app/public/assets/JetBrainsMonoNerdFontMono-Regular.woff2` — Binary asset change (not counted by numstat) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
86. `packages/app/script/e2e-local.ts` — lines 1-180 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
87. `packages/app/src/addons/serialize.test.ts` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
88. `packages/app/src/addons/serialize.ts` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
89. `packages/app/src/app.tsx` — All changed lines (+37/-40) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
90. `packages/app/src/components/dialog-connect-provider.tsx` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
91. `packages/app/src/components/dialog-edit-project.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
92. `packages/app/src/components/dialog-fork.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
93. `packages/app/src/components/dialog-select-directory.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
94. `packages/app/src/components/dialog-select-file.tsx` — All changed lines (+4/-4) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
95. `packages/app/src/components/dialog-select-server.tsx` — All changed lines (+6/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
96. `packages/app/src/components/file-tree.tsx` — All changed lines (+2/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
97. `packages/app/src/components/prompt-input.tsx` — All changed lines (+124/-136) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
98. `packages/app/src/components/prompt-input/build-request-parts.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
99. `packages/app/src/components/prompt-input/context-items.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
100. `packages/app/src/components/prompt-input/slash-popover.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
101. `packages/app/src/components/prompt-input/submit.test.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
102. `packages/app/src/components/prompt-input/submit.ts` — All changed lines (+13/-16) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
103. `packages/app/src/components/session-context-usage.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
104. `packages/app/src/components/session/session-context-tab.tsx` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
105. `packages/app/src/components/session/session-header.tsx` — All changed lines (+45/-62) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
106. `packages/app/src/components/session/session-new-view.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
107. `packages/app/src/components/session/session-sortable-tab.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
108. `packages/app/src/components/session/session-sortable-terminal-tab.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
109. `packages/app/src/components/settings-general.tsx` — All changed lines (+0/-113) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
110. `packages/app/src/components/terminal.tsx` — All changed lines (+25/-14) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
111. `packages/app/src/components/titlebar.tsx` — All changed lines (+34/-43) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
112. `packages/app/src/context/file.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
113. `packages/app/src/context/global-sdk.tsx` — All changed lines (+1/-7) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
114. `packages/app/src/context/global-sync.tsx` — All changed lines (+53/-64) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
115. `packages/app/src/context/global-sync/bootstrap.ts` — All changed lines (+162/-188) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
116. `packages/app/src/context/global-sync/child-store.ts` — All changed lines (+3/-11) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
117. `packages/app/src/context/global-sync/event-reducer.ts` — All changed lines (+12/-17) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
118. `packages/app/src/context/global-sync/queue.ts` — All changed lines (+0/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
119. `packages/app/src/context/global-sync/session-cache.test.ts` — All changed lines (+3/-3) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
120. `packages/app/src/context/global-sync/session-cache.ts` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
121. `packages/app/src/context/global-sync/types.ts` — All changed lines (+3/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
122. `packages/app/src/context/layout.tsx` — All changed lines (+3/-3) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
123. `packages/app/src/context/local.tsx` — All changed lines (+50/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
124. `packages/app/src/context/notification.tsx` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
125. `packages/app/src/context/permission-auto-respond.test.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
126. `packages/app/src/context/permission-auto-respond.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
127. `packages/app/src/context/prompt.tsx` — All changed lines (+4/-4) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
128. `packages/app/src/context/settings.tsx` — All changed lines (+0/-57) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
129. `packages/app/src/context/sync.tsx` — All changed lines (+4/-5) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
130. `packages/app/src/context/terminal.tsx` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
131. `packages/app/src/env.d.ts` — All changed lines (+3/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
132. `packages/app/src/i18n/ar.ts` — All changed lines (+1/-5) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
133. `packages/app/src/i18n/br.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
134. `packages/app/src/i18n/bs.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
135. `packages/app/src/i18n/da.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
136. `packages/app/src/i18n/de.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
137. `packages/app/src/i18n/en.ts` — All changed lines (+1/-17) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
138. `packages/app/src/i18n/es.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
139. `packages/app/src/i18n/fr.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
140. `packages/app/src/i18n/ja.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
141. `packages/app/src/i18n/ko.ts` — All changed lines (+6/-7) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
142. `packages/app/src/i18n/no.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
143. `packages/app/src/i18n/pl.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
144. `packages/app/src/i18n/ru.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
145. `packages/app/src/i18n/th.ts` — All changed lines (+1/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
146. `packages/app/src/i18n/tr.ts` — All changed lines (+1/-7) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
147. `packages/app/src/i18n/zh.ts` — All changed lines (+1/-5) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
148. `packages/app/src/i18n/zht.ts` — All changed lines (+1/-5) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
149. `packages/app/src/index.css` — All changed lines (+0/-16) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
150. `packages/app/src/pages/directory-layout.tsx` — All changed lines (+7/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
151. `packages/app/src/pages/error.tsx` — All changed lines (+9/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
152. `packages/app/src/pages/home.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
153. `packages/app/src/pages/layout.tsx` — All changed lines (+190/-196) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
154. `packages/app/src/pages/layout/helpers.ts` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
155. `packages/app/src/pages/layout/sidebar-items.tsx` — All changed lines (+2/-4) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
156. `packages/app/src/pages/layout/sidebar-project.tsx` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
157. `packages/app/src/pages/layout/sidebar-workspace.tsx` — All changed lines (+11/-11) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
158. `packages/app/src/pages/session.tsx` — All changed lines (+187/-80) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
159. `packages/app/src/pages/session/composer/session-composer-state.ts` — All changed lines (+53/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
160. `packages/app/src/pages/session/composer/session-todo-dock.tsx` — All changed lines (+21/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
161. `packages/app/src/pages/session/file-tabs.tsx` — All changed lines (+7/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
162. `packages/app/src/pages/session/helpers.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
163. `packages/app/src/pages/session/message-timeline.tsx` — All changed lines (+6/-6) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
164. `packages/app/src/pages/session/review-tab.tsx` — All changed lines (+3/-5) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
165. `packages/app/src/pages/session/session-side-panel.tsx` — All changed lines (+86/-99) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
166. `packages/app/src/pages/session/terminal-panel.tsx` — All changed lines (+6/-0) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
167. `packages/app/src/pages/session/use-session-commands.tsx` — All changed lines (+7/-19) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
168. `packages/app/src/testing/model-selection.ts` — lines 1-109 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
169. `packages/app/src/testing/prompt.ts` — lines 1-83 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
170. `packages/app/src/testing/session-composer.ts` — lines 1-84 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
171. `packages/app/src/testing/terminal.ts` — lines 1-119 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
172. `packages/app/src/utils/base64.ts` — All changed lines (+1/-1) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
173. `packages/app/src/utils/diffs.test.ts` — All changed lines (+0/-74) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
174. `packages/app/src/utils/diffs.ts` — All changed lines (+0/-49) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
175. `packages/app/src/utils/persist.ts` — All changed lines (+2/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
176. `packages/app/src/utils/runtime-adapters.test.ts` — All changed lines (+0/-2) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
177. `packages/app/src/utils/server.ts` — All changed lines (+1/-4) — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
178. `packages/app/test/e2e/mock.test.ts` — lines 1-66 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
179. `packages/app/test/e2e/no-real-llm.test.ts` — lines 1-27 — fork app-surface divergence. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog has no bucket for packages/app work, so this stays below 80% confidence.
180. `packages/console/app/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
181. `packages/console/app/script/generate-sitemap.ts` — All changed lines (+2/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
182. `packages/console/app/src/component/email-signup.tsx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
183. `packages/console/app/src/component/header.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
184. `packages/console/app/src/component/icon.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
185. `packages/console/app/src/component/spotlight.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
186. `packages/console/app/src/context/auth.session.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
187. `packages/console/app/src/i18n/ar.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
188. `packages/console/app/src/i18n/br.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
189. `packages/console/app/src/i18n/da.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
190. `packages/console/app/src/i18n/de.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
191. `packages/console/app/src/i18n/en.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
192. `packages/console/app/src/i18n/es.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
193. `packages/console/app/src/i18n/fr.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
194. `packages/console/app/src/i18n/it.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
195. `packages/console/app/src/i18n/ja.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
196. `packages/console/app/src/i18n/ko.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
197. `packages/console/app/src/i18n/no.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
198. `packages/console/app/src/i18n/pl.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
199. `packages/console/app/src/i18n/ru.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
200. `packages/console/app/src/i18n/th.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
201. `packages/console/app/src/i18n/tr.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
202. `packages/console/app/src/i18n/zh.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
203. `packages/console/app/src/i18n/zht.ts` — All changed lines (+7/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
204. `packages/console/app/src/routes/api/enterprise.ts` — All changed lines (+2/-54) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
205. `packages/console/app/src/routes/auth/status.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
206. `packages/console/app/src/routes/bench/[id].tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
207. `packages/console/app/src/routes/black/subscribe/[plan].tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
208. `packages/console/app/src/routes/debug/index.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
209. `packages/console/app/src/routes/download/[channel]/[platform].ts` — All changed lines (+3/-12) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
210. `packages/console/app/src/routes/download/index.css` — All changed lines (+1/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
211. `packages/console/app/src/routes/download/index.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
212. `packages/console/app/src/routes/go/index.css` — All changed lines (+1/-68) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
213. `packages/console/app/src/routes/go/index.tsx` — All changed lines (+14/-70) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
214. `packages/console/app/src/routes/index.tsx` — All changed lines (+5/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
215. `packages/console/app/src/routes/stripe/webhook.ts` — All changed lines (+0/-7) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
216. `packages/console/app/src/routes/temp.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
217. `packages/console/app/src/routes/user-menu.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
218. `packages/console/app/src/routes/workspace-picker.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
219. `packages/console/app/src/routes/workspace/[id]/billing/black-section.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
220. `packages/console/app/src/routes/workspace/[id]/billing/index.tsx` — All changed lines (+0/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
221. `packages/console/app/src/routes/workspace/[id]/billing/monthly-limit-section.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
222. `packages/console/app/src/routes/workspace/[id]/billing/redeem-section.module.css` — All changed lines (+0/-61) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
223. `packages/console/app/src/routes/workspace/[id]/billing/redeem-section.tsx` — All changed lines (+0/-71) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
224. `packages/console/app/src/routes/workspace/[id]/billing/reload-section.tsx` — All changed lines (+12/-12) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
225. `packages/console/app/src/routes/workspace/[id]/go/lite-section.tsx` — All changed lines (+2/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
226. `packages/console/app/src/routes/workspace/[id]/keys/key-section.tsx` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
227. `packages/console/app/src/routes/workspace/[id]/members/member-section.tsx` — All changed lines (+11/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
228. `packages/console/app/src/routes/workspace/[id]/model-section.tsx` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
229. `packages/console/app/src/routes/workspace/[id]/provider-section.tsx` — All changed lines (+7/-10) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
230. `packages/console/app/src/routes/workspace/[id]/settings/settings-section.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
231. `packages/console/app/src/routes/zen/index.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
232. `packages/console/app/src/routes/zen/util/dataDumper.ts` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
233. `packages/console/app/src/routes/zen/util/error.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
234. `packages/console/app/src/routes/zen/util/handler.ts` — All changed lines (+32/-59) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
235. `packages/console/app/src/routes/zen/util/keyRateLimiter.ts` — All changed lines (+0/-39) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
236. `packages/console/app/src/routes/zen/util/modelTpmLimiter.ts` — All changed lines (+0/-47) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
237. `packages/console/app/src/routes/zen/util/provider/anthropic.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
238. `packages/console/app/src/routes/zen/util/provider/google.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
239. `packages/console/app/src/routes/zen/util/provider/openai-compatible.ts` — All changed lines (+6/-9) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
240. `packages/console/app/src/routes/zen/util/provider/openai.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
241. `packages/console/app/src/routes/zen/util/rateLimiter.ts` — All changed lines (+8/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
242. `packages/console/app/src/routes/zen/v1/models.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
243. `packages/console/app/src/routes/zen/v1/models/[model].ts` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
244. `packages/console/app/test/rateLimiter.test.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
245. `packages/console/core/migrations/20260414235536_lame_wild_child/migration.sql` — All changed lines (+0/-6) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
246. `packages/console/core/migrations/20260414235536_lame_wild_child/snapshot.json` — All changed lines (+0/-2515) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
247. `packages/console/core/migrations/20260415002256_perpetual_karen_page/migration.sql` — All changed lines (+0/-1) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
248. `packages/console/core/migrations/20260415002256_perpetual_karen_page/snapshot.json` — All changed lines (+0/-2515) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
249. `packages/console/core/migrations/20260415002534_far_smasher/migration.sql` — All changed lines (+0/-1) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
250. `packages/console/core/migrations/20260415002534_far_smasher/snapshot.json` — All changed lines (+0/-2515) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
251. `packages/console/core/migrations/20260417071612_tidy_diamondback/migration.sql` — All changed lines (+0/-6) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
252. `packages/console/core/migrations/20260417071612_tidy_diamondback/snapshot.json` — All changed lines (+0/-2567) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
253. `packages/console/core/migrations/20260418195905_shocking_marvel_zombies/migration.sql` — All changed lines (+0/-6) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
254. `packages/console/core/migrations/20260418195905_shocking_marvel_zombies/snapshot.json` — All changed lines (+0/-2619) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
255. `packages/console/core/migrations/20260420184535_aromatic_molten_man/migration.sql` — All changed lines (+0/-6) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
256. `packages/console/core/migrations/20260420184535_aromatic_molten_man/snapshot.json` — All changed lines (+0/-2671) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
257. `packages/console/core/migrations/20260420185813_supreme_roxanne_simpson/migration.sql` — All changed lines (+0/-3) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
258. `packages/console/core/migrations/20260420185813_supreme_roxanne_simpson/snapshot.json` — All changed lines (+0/-2657) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
259. `packages/console/core/migrations/20260420191234_deep_scarecrow/migration.sql` — All changed lines (+0/-1) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
260. `packages/console/core/migrations/20260420191234_deep_scarecrow/snapshot.json` — All changed lines (+0/-2605) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
261. `packages/console/core/migrations/20260421020842_bizarre_living_tribunal/migration.sql` — All changed lines (+0/-5) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
262. `packages/console/core/migrations/20260421020842_bizarre_living_tribunal/snapshot.json` — All changed lines (+0/-2657) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
263. `packages/console/core/migrations/20260421023950_nebulous_weapon_omega/migration.sql` — All changed lines (+0/-3) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
264. `packages/console/core/migrations/20260421023950_nebulous_weapon_omega/snapshot.json` — All changed lines (+0/-2619) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
265. `packages/console/core/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
266. `packages/console/core/script/black-cancel-waitlist.ts` — All changed lines (+4/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
267. `packages/console/core/script/black-gift.ts` — All changed lines (+4/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
268. `packages/console/core/script/black-onboard-waitlist.ts` — All changed lines (+4/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
269. `packages/console/core/script/black-select-workspaces.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
270. `packages/console/core/script/create-coupon.ts` — All changed lines (+0/-24) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
271. `packages/console/core/src/billing.ts` — All changed lines (+5/-49) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
272. `packages/console/core/src/key.ts` — All changed lines (+10/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
273. `packages/console/core/src/lite.ts` — All changed lines (+6/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
274. `packages/console/core/src/model.ts` — All changed lines (+6/-73) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
275. `packages/console/core/src/schema/billing.sql.ts` — All changed lines (+1/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
276. `packages/console/core/src/schema/ip.sql.ts` — All changed lines (+1/-21) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
277. `packages/console/core/src/util/env.cloudflare.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
278. `packages/console/core/src/util/log.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
279. `packages/console/core/sst-env.d.ts` — All changed lines (+4/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
280. `packages/console/function/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
281. `packages/console/function/sst-env.d.ts` — All changed lines (+4/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
282. `packages/console/mail/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
283. `packages/console/resource/sst-env.d.ts` — All changed lines (+4/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
284. `packages/desktop-electron/electron-builder.config.ts` — All changed lines (+5/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
285. `packages/desktop-electron/electron.vite.config.ts` — All changed lines (+0/-38) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
286. `packages/desktop-electron/package.json` — All changed lines (+13/-25) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
287. `packages/desktop-electron/scripts/prebuild.ts` — All changed lines (+0/-9) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
288. `packages/desktop-electron/scripts/predev.ts` — All changed lines (+13/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
289. `packages/desktop-electron/scripts/prepare.ts` — All changed lines (+17/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
290. `packages/desktop-electron/src/main/apps.ts` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
291. `packages/desktop-electron/src/main/cli.ts` — lines 1-283 — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
292. `packages/desktop-electron/src/main/env.d.ts` — All changed lines (+0/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
293. `packages/desktop-electron/src/main/index.ts` — All changed lines (+38/-51) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
294. `packages/desktop-electron/src/main/ipc.ts` — All changed lines (+3/-12) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
295. `packages/desktop-electron/src/main/menu.ts` — All changed lines (+6/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
296. `packages/desktop-electron/src/main/migrate.ts` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
297. `packages/desktop-electron/src/main/server.ts` — All changed lines (+22/-37) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
298. `packages/desktop-electron/src/main/shell-env.ts` — All changed lines (+14/-14) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
299. `packages/desktop-electron/src/main/store.ts` — All changed lines (+3/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
300. `packages/desktop-electron/src/main/windows.ts` — All changed lines (+32/-79) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
301. `packages/desktop-electron/src/preload/index.ts` — All changed lines (+0/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
302. `packages/desktop-electron/src/preload/types.ts` — All changed lines (+0/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
303. `packages/desktop-electron/src/renderer/env.d.ts` — All changed lines (+2/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
304. `packages/desktop-electron/src/renderer/html.test.ts` — All changed lines (+3/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
305. `packages/desktop-electron/src/renderer/index.tsx` — All changed lines (+14/-27) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
306. `packages/desktop-electron/src/renderer/updater.ts` — All changed lines (+2/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
307. `packages/desktop/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
308. `packages/desktop/scripts/finalize-latest-json.ts` — All changed lines (+2/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
309. `packages/desktop/src-tauri/release/appstream.metainfo.xml` — All changed lines (+1/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
310. `packages/desktop/src-tauri/src/cli.rs` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
311. `packages/desktop/src-tauri/tauri.conf.json` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
312. `packages/desktop/src/entry.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
313. `packages/desktop/src/index.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
314. `packages/desktop/src/loading.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
315. `packages/desktop/src/menu.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
316. `packages/desktop/src/webview-zoom.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
317. `packages/enterprise/package.json` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
318. `packages/enterprise/src/core/share.ts` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
319. `packages/enterprise/src/core/storage.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
320. `packages/enterprise/src/routes/share/[shareID].tsx` — All changed lines (+5/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
321. `packages/enterprise/sst-env.d.ts` — All changed lines (+4/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
322. `packages/enterprise/test-debug.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
323. `packages/enterprise/test/core/share.test.ts` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
324. `packages/extensions/zed/extension.toml` — All changed lines (+6/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
325. `packages/function/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
326. `packages/function/src/api.ts` — All changed lines (+17/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
327. `packages/function/sst-env.d.ts` — All changed lines (+4/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
328. `packages/opencode/.gitignore` — All changed lines (+0/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
329. `packages/opencode/AGENTS.md` — All changed lines (+2/-69) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
330. `packages/opencode/Dockerfile` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
331. `packages/opencode/migration/20260410174513_workspace-name/migration.sql` — All changed lines (+0/-16) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
332. `packages/opencode/migration/20260410174513_workspace-name/snapshot.json` — All changed lines (+0/-1271) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
333. `packages/opencode/migration/20260413175956_chief_energizer/migration.sql` — All changed lines (+0/-13) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
334. `packages/opencode/migration/20260413175956_chief_energizer/snapshot.json` — All changed lines (+0/-1399) — generated migration snapshot drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This is a generated snapshot change, but the source feature is not named in the current changelog.
335. `packages/opencode/package.json` — All changed lines (+43/-35) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
336. `packages/opencode/script/build-node.ts` — All changed lines (+16/-7) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
337. `packages/opencode/script/build.ts` — All changed lines (+33/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
338. `packages/opencode/script/generate.ts` — All changed lines (+0/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
339. `packages/opencode/script/run-workspace-server` — All changed lines (+0/-106) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
340. `packages/opencode/script/schema.ts` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
341. `packages/opencode/script/seed-e2e.ts` — lines 1-60 — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
342. `packages/opencode/script/time.ts` — All changed lines (+0/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
343. `packages/opencode/script/trace-imports.ts` — All changed lines (+0/-153) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
344. `packages/opencode/specs/effect-migration.md` — lines 1-310 — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
345. `packages/opencode/specs/effect/facades.md` — All changed lines (+0/-221) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
346. `packages/opencode/specs/effect/http-api.md` — All changed lines (+0/-459) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
347. `packages/opencode/specs/effect/instance-context.md` — All changed lines (+0/-309) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
348. `packages/opencode/specs/effect/loose-ends.md` — All changed lines (+0/-34) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
349. `packages/opencode/specs/effect/migration.md` — All changed lines (+0/-299) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
350. `packages/opencode/specs/effect/routes.md` — All changed lines (+0/-64) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
351. `packages/opencode/specs/effect/schema.md` — All changed lines (+0/-386) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
352. `packages/opencode/specs/effect/server-package.md` — All changed lines (+0/-668) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
353. `packages/opencode/specs/effect/tools.md` — All changed lines (+0/-92) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
354. `packages/opencode/specs/tui-plugins.md` — All changed lines (+4/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
355. `packages/opencode/specs/v2.md` — All changed lines (+5/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
356. `packages/opencode/specs/v2/message-shape.md` — All changed lines (+0/-136) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
357. `packages/opencode/src/account/account.ts` — All changed lines (+0/-456) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
358. `packages/opencode/src/account/index.ts` — lines 1-488 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
359. `packages/opencode/src/account/repo.ts` — All changed lines (+142/-142) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
360. `packages/opencode/src/account/schema.ts` — All changed lines (+26/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
361. `packages/opencode/src/acp/agent.ts` — All changed lines (+1537/-1527) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
362. `packages/opencode/src/acp/session.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
363. `packages/opencode/src/agency-swarm/tui.ts` — lines 1-98 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
364. `packages/opencode/src/agent/agent.ts` — All changed lines (+375/-365) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
365. `packages/opencode/src/agent/display.ts` — lines 1-6 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
366. `packages/opencode/src/agent/prompt/compaction.txt` — All changed lines (+1/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
367. `packages/opencode/src/audio.d.ts` — All changed lines (+0/-4) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
368. `packages/opencode/src/auth/index.ts` — All changed lines (+101/-88) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
369. `packages/opencode/src/bus/bus-event.ts` — All changed lines (+32/-25) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
370. `packages/opencode/src/bus/global.ts` — All changed lines (+6/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
371. `packages/opencode/src/bus/index.ts` — All changed lines (+161/-169) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
372. `packages/opencode/src/cli/bootstrap.ts` — All changed lines (+1/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
373. `packages/opencode/src/cli/cmd/account.ts` — All changed lines (+7/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
374. `packages/opencode/src/cli/cmd/acp.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
375. `packages/opencode/src/cli/cmd/agent.ts` — All changed lines (+7/-9) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
376. `packages/opencode/src/cli/cmd/db.ts` — All changed lines (+3/-4) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
377. `packages/opencode/src/cli/cmd/debug/agent.ts` — All changed lines (+44/-69) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
378. `packages/opencode/src/cli/cmd/debug/config.ts` — All changed lines (+2/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
379. `packages/opencode/src/cli/cmd/debug/file.ts` — All changed lines (+7/-10) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
380. `packages/opencode/src/cli/cmd/debug/lsp.ts` — All changed lines (+7/-15) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
381. `packages/opencode/src/cli/cmd/debug/ripgrep.ts` — All changed lines (+15/-33) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
382. `packages/opencode/src/cli/cmd/debug/scrap.ts` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
383. `packages/opencode/src/cli/cmd/debug/skill.ts` — All changed lines (+1/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
384. `packages/opencode/src/cli/cmd/debug/snapshot.ts` — All changed lines (+3/-4) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
385. `packages/opencode/src/cli/cmd/export.ts` — All changed lines (+12/-229) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
386. `packages/opencode/src/cli/cmd/generate.ts` — All changed lines (+1/-13) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
387. `packages/opencode/src/cli/cmd/github.ts` — All changed lines (+106/-107) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
388. `packages/opencode/src/cli/cmd/import.ts` — All changed lines (+5/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
389. `packages/opencode/src/cli/cmd/mcp.ts` — All changed lines (+64/-104) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
390. `packages/opencode/src/cli/cmd/models.ts` — All changed lines (+33/-43) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
391. `packages/opencode/src/cli/cmd/plug.ts` — All changed lines (+5/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
392. `packages/opencode/src/cli/cmd/pr.ts` — All changed lines (+16/-26) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
393. `packages/opencode/src/cli/cmd/providers.ts` — All changed lines (+34/-71) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
394. `packages/opencode/src/cli/cmd/run.ts` — All changed lines (+29/-20) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
395. `packages/opencode/src/cli/cmd/serve.ts` — All changed lines (+6/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
396. `packages/opencode/src/cli/cmd/session.ts` — All changed lines (+5/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
397. `packages/opencode/src/cli/cmd/stats.ts` — All changed lines (+3/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
398. `packages/opencode/src/cli/cmd/tui/app.tsx` — All changed lines (+324/-115) — mixed TUI app rewrite with auth, reconnect, run-target, and theme changes. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog names pieces of this file, but not enough to split the whole diff safely.
399. `packages/opencode/src/cli/cmd/tui/asset/charge.wav` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
400. `packages/opencode/src/cli/cmd/tui/asset/pulse-a.wav` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
401. `packages/opencode/src/cli/cmd/tui/asset/pulse-b.wav` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
402. `packages/opencode/src/cli/cmd/tui/asset/pulse-c.wav` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
403. `packages/opencode/src/cli/cmd/tui/attach.ts` — All changed lines (+9/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
404. `packages/opencode/src/cli/cmd/tui/component/bg-pulse.tsx` — All changed lines (+0/-130) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
405. `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx` — All changed lines (+0/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
406. `packages/opencode/src/cli/cmd/tui/component/dialog-go-upsell.tsx` — All changed lines (+0/-157) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
407. `packages/opencode/src/cli/cmd/tui/component/dialog-mcp.tsx` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
408. `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` — All changed lines (+848/-68) — mixed provider/auth/connect dialog rewrite. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file bundles several auth and connect behaviors, and the current changelog is too coarse to split it safely.
409. `packages/opencode/src/cli/cmd/tui/component/dialog-session-delete-failed.tsx` — All changed lines (+0/-101) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
410. `packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx` — All changed lines (+12/-166) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
411. `packages/opencode/src/cli/cmd/tui/component/dialog-session-rename.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
412. `packages/opencode/src/cli/cmd/tui/component/dialog-stash.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
413. `packages/opencode/src/cli/cmd/tui/component/dialog-theme-list.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
414. `packages/opencode/src/cli/cmd/tui/component/dialog-workspace-create.tsx` — All changed lines (+0/-289) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
415. `packages/opencode/src/cli/cmd/tui/component/dialog-workspace-list.tsx` — lines 1-316 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
416. `packages/opencode/src/cli/cmd/tui/component/dialog-workspace-unavailable.tsx` — All changed lines (+0/-81) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
417. `packages/opencode/src/cli/cmd/tui/component/error-component.tsx` — All changed lines (+7/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
418. `packages/opencode/src/cli/cmd/tui/component/logo.tsx` — All changed lines (+54/-862) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
419. `packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
420. `packages/opencode/src/cli/cmd/tui/component/prompt/cwd.ts` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
421. `packages/opencode/src/cli/cmd/tui/component/prompt/frecency.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
422. `packages/opencode/src/cli/cmd/tui/component/prompt/history.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
423. `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` — All changed lines (+378/-223) — mixed prompt rewrite spanning auth guards, first-send flow, and run-target UI. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not separate this full prompt diff into exact buckets with high confidence.
424. `packages/opencode/src/cli/cmd/tui/component/prompt/stash.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
425. `packages/opencode/src/cli/cmd/tui/component/startup-loading.tsx` — All changed lines (+54/-12) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
426. `packages/opencode/src/cli/cmd/tui/component/textarea-keybindings.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
427. `packages/opencode/src/cli/cmd/tui/component/workspace/dialog-session-list.tsx` — lines 1-151 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
428. `packages/opencode/src/cli/cmd/tui/config/cwd.ts` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
429. `packages/opencode/src/cli/cmd/tui/config/tui.ts` — All changed lines (+0/-219) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
430. `packages/opencode/src/cli/cmd/tui/context/directory.ts` — All changed lines (+1/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
431. `packages/opencode/src/cli/cmd/tui/context/event.ts` — All changed lines (+0/-45) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
432. `packages/opencode/src/cli/cmd/tui/context/helper.tsx` — All changed lines (+9/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
433. `packages/opencode/src/cli/cmd/tui/context/keybind.tsx` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
434. `packages/opencode/src/cli/cmd/tui/context/kv.tsx` — All changed lines (+5/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
435. `packages/opencode/src/cli/cmd/tui/context/local.tsx` — All changed lines (+193/-94) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
436. `packages/opencode/src/cli/cmd/tui/context/project.tsx` — All changed lines (+0/-109) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
437. `packages/opencode/src/cli/cmd/tui/context/route.tsx` — All changed lines (+11/-11) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
438. `packages/opencode/src/cli/cmd/tui/context/sdk.tsx` — All changed lines (+8/-35) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
439. `packages/opencode/src/cli/cmd/tui/context/sync.tsx` — All changed lines (+48/-60) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
440. `packages/opencode/src/cli/cmd/tui/context/theme/aura.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
441. `packages/opencode/src/cli/cmd/tui/context/theme/ayu.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
442. `packages/opencode/src/cli/cmd/tui/context/theme/carbonfox.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
443. `packages/opencode/src/cli/cmd/tui/context/theme/catppuccin-frappe.json` — All changed lines (+4/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
444. `packages/opencode/src/cli/cmd/tui/context/theme/catppuccin-macchiato.json` — All changed lines (+4/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
445. `packages/opencode/src/cli/cmd/tui/context/theme/catppuccin.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
446. `packages/opencode/src/cli/cmd/tui/context/theme/cobalt2.json` — All changed lines (+4/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
447. `packages/opencode/src/cli/cmd/tui/context/theme/cursor.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
448. `packages/opencode/src/cli/cmd/tui/context/theme/dracula.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
449. `packages/opencode/src/cli/cmd/tui/context/theme/everforest.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
450. `packages/opencode/src/cli/cmd/tui/context/theme/flexoki.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
451. `packages/opencode/src/cli/cmd/tui/context/theme/github.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
452. `packages/opencode/src/cli/cmd/tui/context/theme/gruvbox.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
453. `packages/opencode/src/cli/cmd/tui/context/theme/kanagawa.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
454. `packages/opencode/src/cli/cmd/tui/context/theme/lucent-orng.json` — All changed lines (+4/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
455. `packages/opencode/src/cli/cmd/tui/context/theme/material.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
456. `packages/opencode/src/cli/cmd/tui/context/theme/matrix.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
457. `packages/opencode/src/cli/cmd/tui/context/theme/monokai.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
458. `packages/opencode/src/cli/cmd/tui/context/theme/nightowl.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
459. `packages/opencode/src/cli/cmd/tui/context/theme/nord.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
460. `packages/opencode/src/cli/cmd/tui/context/theme/one-dark.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
461. `packages/opencode/src/cli/cmd/tui/context/theme/opencode.json` — All changed lines (+19/-19) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
462. `packages/opencode/src/cli/cmd/tui/context/theme/orng.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
463. `packages/opencode/src/cli/cmd/tui/context/theme/osaka-jade.json` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
464. `packages/opencode/src/cli/cmd/tui/context/theme/palenight.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
465. `packages/opencode/src/cli/cmd/tui/context/theme/rosepine.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
466. `packages/opencode/src/cli/cmd/tui/context/theme/solarized.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
467. `packages/opencode/src/cli/cmd/tui/context/theme/synthwave84.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
468. `packages/opencode/src/cli/cmd/tui/context/theme/tokyonight.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
469. `packages/opencode/src/cli/cmd/tui/context/theme/vercel.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
470. `packages/opencode/src/cli/cmd/tui/context/theme/vesper.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
471. `packages/opencode/src/cli/cmd/tui/context/theme/zenburn.json` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
472. `packages/opencode/src/cli/cmd/tui/context/tui-config.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
473. `packages/opencode/src/cli/cmd/tui/event.ts` — All changed lines (+1/-0) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
474. `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx` — All changed lines (+14/-20) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
475. `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` — All changed lines (+6/-11) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
476. `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
477. `packages/opencode/src/cli/cmd/tui/layer.ts` — All changed lines (+0/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
478. `packages/opencode/src/cli/cmd/tui/plugin/api.tsx` — All changed lines (+15/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
479. `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts` — All changed lines (+85/-79) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
480. `packages/opencode/src/cli/cmd/tui/routes/home.tsx` — All changed lines (+6/-12) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
481. `packages/opencode/src/cli/cmd/tui/routes/session/dialog-fork-from-timeline.tsx` — All changed lines (+10/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
482. `packages/opencode/src/cli/cmd/tui/routes/session/dialog-message.tsx` — All changed lines (+18/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
483. `packages/opencode/src/cli/cmd/tui/routes/session/dialog-timeline.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
484. `packages/opencode/src/cli/cmd/tui/routes/session/footer.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
485. `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` — All changed lines (+131/-111) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
486. `packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx` — All changed lines (+8/-14) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
487. `packages/opencode/src/cli/cmd/tui/routes/session/question.tsx` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
488. `packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx` — All changed lines (+4/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
489. `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
490. `packages/opencode/src/cli/cmd/tui/thread.ts` — All changed lines (+83/-30) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
491. `packages/opencode/src/cli/cmd/tui/ui/dialog-confirm.tsx` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
492. `packages/opencode/src/cli/cmd/tui/ui/dialog-export-options.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
493. `packages/opencode/src/cli/cmd/tui/ui/dialog-select.tsx` — All changed lines (+14/-45) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
494. `packages/opencode/src/cli/cmd/tui/ui/dialog.tsx` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
495. `packages/opencode/src/cli/cmd/tui/ui/toast.tsx` — All changed lines (+3/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
496. `packages/opencode/src/cli/cmd/tui/util/clipboard.ts` — All changed lines (+137/-154) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
497. `packages/opencode/src/cli/cmd/tui/util/editor.ts` — All changed lines (+26/-24) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
498. `packages/opencode/src/cli/cmd/tui/util/index.ts` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
499. `packages/opencode/src/cli/cmd/tui/util/provider-auth.ts` — lines 1-27 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
500. `packages/opencode/src/cli/cmd/tui/util/provider-origin.ts` — All changed lines (+13/-0) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
501. `packages/opencode/src/cli/cmd/tui/util/revert-diff.ts` — All changed lines (+0/-18) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
502. `packages/opencode/src/cli/cmd/tui/util/scroll.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
503. `packages/opencode/src/cli/cmd/tui/util/selection.ts` — All changed lines (+11/-9) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
504. `packages/opencode/src/cli/cmd/tui/util/signal.ts` — All changed lines (+1/-35) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
505. `packages/opencode/src/cli/cmd/tui/util/sound.ts` — All changed lines (+0/-154) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
506. `packages/opencode/src/cli/cmd/tui/util/terminal.ts` — All changed lines (+99/-120) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
507. `packages/opencode/src/cli/cmd/tui/util/transcript.ts` — All changed lines (+4/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
508. `packages/opencode/src/cli/cmd/tui/win32.ts` — All changed lines (+2/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
509. `packages/opencode/src/cli/cmd/tui/worker.ts` — All changed lines (+101/-10) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
510. `packages/opencode/src/cli/cmd/uninstall.ts` — All changed lines (+25/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
511. `packages/opencode/src/cli/cmd/web.ts` — All changed lines (+3/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
512. `packages/opencode/src/cli/error.ts` — All changed lines (+32/-63) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
513. `packages/opencode/src/cli/heap.ts` — All changed lines (+44/-44) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
514. `packages/opencode/src/cli/logo.ts` — All changed lines (+19/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
515. `packages/opencode/src/cli/network.ts` — All changed lines (+5/-7) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
516. `packages/opencode/src/cli/ui.ts` — All changed lines (+111/-111) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
517. `packages/opencode/src/cli/upgrade.ts` — All changed lines (+8/-10) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
518. `packages/opencode/src/command/index.ts` — All changed lines (+165/-158) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
519. `packages/opencode/src/command/template/initialize.txt` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
520. `packages/opencode/src/config/agent.ts` — All changed lines (+0/-181) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
521. `packages/opencode/src/config/command.ts` — All changed lines (+0/-62) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
522. `packages/opencode/src/config/config.ts` — All changed lines (+1505/-693) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
523. `packages/opencode/src/config/console-state.ts` — All changed lines (+10/-11) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
524. `packages/opencode/src/config/entry-name.ts` — All changed lines (+0/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
525. `packages/opencode/src/config/error.ts` — All changed lines (+0/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
526. `packages/opencode/src/config/formatter.ts` — All changed lines (+0/-17) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
527. `packages/opencode/src/config/index.ts` — All changed lines (+0/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
528. `packages/opencode/src/config/keybinds.ts` — All changed lines (+0/-127) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
529. `packages/opencode/src/config/layout.ts` — All changed lines (+0/-10) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
530. `packages/opencode/src/config/lsp.ts` — All changed lines (+0/-45) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
531. `packages/opencode/src/config/managed.ts` — All changed lines (+0/-70) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
532. `packages/opencode/src/config/markdown.ts` — All changed lines (+82/-80) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
533. `packages/opencode/src/config/mcp.ts` — All changed lines (+0/-65) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
534. `packages/opencode/src/config/model-id.ts` — All changed lines (+0/-14) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
535. `packages/opencode/src/config/parse.ts` — All changed lines (+0/-44) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
536. `packages/opencode/src/config/paths.ts` — All changed lines (+162/-49) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
537. `packages/opencode/src/config/permission.ts` — All changed lines (+0/-79) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
538. `packages/opencode/src/config/plugin.ts` — All changed lines (+0/-88) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
539. `packages/opencode/src/config/provider.ts` — All changed lines (+0/-115) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
540. `packages/opencode/src/config/server.ts` — All changed lines (+0/-22) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
541. `packages/opencode/src/config/skills.ts` — All changed lines (+0/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
542. `packages/opencode/src/config/tui-migrate.ts` — All changed lines (+39/-23) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
543. `packages/opencode/src/config/tui-schema.ts` — All changed lines (+3/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
544. `packages/opencode/src/config/tui.ts` — lines 1-188 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
545. `packages/opencode/src/config/variable.ts` — All changed lines (+0/-90) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
546. `packages/opencode/src/control-plane/adaptors/index.ts` — All changed lines (+11/-43) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
547. `packages/opencode/src/control-plane/adaptors/worktree.ts` — All changed lines (+16/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
548. `packages/opencode/src/control-plane/dev/debug-workspace-plugin.ts` — All changed lines (+0/-73) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
549. `packages/opencode/src/control-plane/schema.ts` — All changed lines (+4/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
550. `packages/opencode/src/control-plane/types.ts` — All changed lines (+6/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
551. `packages/opencode/src/control-plane/util.ts` — All changed lines (+0/-37) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
552. `packages/opencode/src/control-plane/workspace-context.ts` — All changed lines (+0/-26) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
553. `packages/opencode/src/control-plane/workspace.sql.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
554. `packages/opencode/src/control-plane/workspace.ts` — All changed lines (+116/-563) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
555. `packages/opencode/src/effect/app-runtime.ts` — All changed lines (+0/-121) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
556. `packages/opencode/src/effect/bootstrap-runtime.ts` — All changed lines (+0/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
557. `packages/opencode/src/effect/bridge.ts` — All changed lines (+0/-48) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
558. `packages/opencode/src/effect/cross-spawn-spawner.ts` — All changed lines (+2/-15) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
559. `packages/opencode/src/effect/index.ts` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
560. `packages/opencode/src/effect/instance-ref.ts` — All changed lines (+2/-7) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
561. `packages/opencode/src/effect/instance-state.ts` — All changed lines (+60/-59) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
562. `packages/opencode/src/effect/logger.ts` — All changed lines (+0/-73) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
563. `packages/opencode/src/effect/memo-map.ts` — All changed lines (+0/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
564. `packages/opencode/src/effect/observability.ts` — All changed lines (+0/-107) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
565. `packages/opencode/src/effect/oltp.ts` — lines 1-34 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
566. `packages/opencode/src/effect/run-service.ts` — All changed lines (+11/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
567. `packages/opencode/src/effect/runner.ts` — All changed lines (+196/-186) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
568. `packages/opencode/src/effect/runtime.ts` — All changed lines (+0/-19) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
569. `packages/opencode/src/env/index.ts` — All changed lines (+27/-36) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
570. `packages/opencode/src/file/ignore.ts` — All changed lines (+70/-69) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
571. `packages/opencode/src/file/index.ts` — All changed lines (+621/-599) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
572. `packages/opencode/src/file/protected.ts` — All changed lines (+19/-19) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
573. `packages/opencode/src/file/ripgrep.ts` — All changed lines (+351/-459) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
574. `packages/opencode/src/file/time.ts` — lines 1-133 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
575. `packages/opencode/src/file/watcher.ts` — All changed lines (+131/-123) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
576. `packages/opencode/src/filesystem/index.ts` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
577. `packages/opencode/src/flag/flag.ts` — All changed lines (+131/-76) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
578. `packages/opencode/src/format/formatter.ts` — All changed lines (+46/-36) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
579. `packages/opencode/src/format/index.ts` — All changed lines (+170/-170) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
580. `packages/opencode/src/git/index.ts` — All changed lines (+287/-244) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
581. `packages/opencode/src/global/index.ts` — All changed lines (+26/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
582. `packages/opencode/src/id/id.ts` — All changed lines (+65/-66) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
583. `packages/opencode/src/ide/index.ts` — All changed lines (+50/-49) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
584. `packages/opencode/src/index.ts` — All changed lines (+15/-18) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
585. `packages/opencode/src/installation/meta.ts` — lines 1-7 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
586. `packages/opencode/src/installation/version.ts` — All changed lines (+0/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
587. `packages/opencode/src/lsp/client.ts` — All changed lines (+205/-202) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
588. `packages/opencode/src/lsp/diagnostic.ts` — All changed lines (+0/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
589. `packages/opencode/src/lsp/index.ts` — All changed lines (+558/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
590. `packages/opencode/src/lsp/launch.ts` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
591. `packages/opencode/src/lsp/lsp.ts` — All changed lines (+0/-514) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
592. `packages/opencode/src/lsp/server.ts` — All changed lines (+1694/-1682) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
593. `packages/opencode/src/mcp/auth.ts` — All changed lines (+164/-135) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
594. `packages/opencode/src/mcp/index.ts` — All changed lines (+784/-795) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
595. `packages/opencode/src/mcp/oauth-callback.ts` — All changed lines (+133/-149) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
596. `packages/opencode/src/mcp/oauth-provider.ts` — All changed lines (+30/-59) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
597. `packages/opencode/src/node.ts` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
598. `packages/opencode/src/npm/config.ts` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
599. `packages/opencode/src/npm/index.ts` — All changed lines (+165/-270) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
600. `packages/opencode/src/npmcli-config.d.ts` — All changed lines (+0/-43) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
601. `packages/opencode/src/patch/index.ts` — All changed lines (+537/-537) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
602. `packages/opencode/src/permission/arity.ts` — All changed lines (+148/-148) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
603. `packages/opencode/src/permission/evaluate.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
604. `packages/opencode/src/permission/index.ts` — All changed lines (+262/-272) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
605. `packages/opencode/src/permission/schema.ts` — All changed lines (+6/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
606. `packages/opencode/src/plugin/cloudflare.ts` — All changed lines (+12/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
607. `packages/opencode/src/plugin/codex.ts` — All changed lines (+12/-10) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
608. `packages/opencode/src/plugin/github-copilot/copilot.ts` — All changed lines (+19/-52) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
609. `packages/opencode/src/plugin/github-copilot/models.ts` — All changed lines (+126/-135) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
610. `packages/opencode/src/plugin/index.ts` — All changed lines (+248/-247) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
611. `packages/opencode/src/plugin/install.ts` — All changed lines (+9/-7) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
612. `packages/opencode/src/plugin/loader.ts` — All changed lines (+13/-55) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
613. `packages/opencode/src/plugin/meta.ts` — All changed lines (+149/-149) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
614. `packages/opencode/src/plugin/shared.ts` — All changed lines (+2/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
615. `packages/opencode/src/project/bootstrap.ts` — All changed lines (+20/-31) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
616. `packages/opencode/src/project/index.ts` — All changed lines (+0/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
617. `packages/opencode/src/project/instance.ts` — All changed lines (+37/-52) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
618. `packages/opencode/src/project/project.ts` — All changed lines (+450/-419) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
619. `packages/opencode/src/project/schema.ts` — All changed lines (+2/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
620. `packages/opencode/src/project/state.ts` — lines 1-70 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
621. `packages/opencode/src/project/vcs.ts` — All changed lines (+219/-206) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
622. `packages/opencode/src/provider/auth.ts` — All changed lines (+228/-206) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
623. `packages/opencode/src/provider/error.ts` — All changed lines (+164/-160) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
624. `packages/opencode/src/provider/index.ts` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
625. `packages/opencode/src/provider/models.ts` — All changed lines (+130/-148) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
626. `packages/opencode/src/provider/provider.ts` — All changed lines (+1594/-1535) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
627. `packages/opencode/src/provider/schema.ts` — All changed lines (+16/-14) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
628. `packages/opencode/src/provider/sdk/copilot/responses/openai-responses-language-model.ts` — All changed lines (+2/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
629. `packages/opencode/src/provider/transform.ts` — All changed lines (+836/-906) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
630. `packages/opencode/src/pty/index.ts` — All changed lines (+353/-320) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
631. `packages/opencode/src/pty/schema.ts` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
632. `packages/opencode/src/question/index.ts` — All changed lines (+195/-200) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
633. `packages/opencode/src/question/schema.ts` — All changed lines (+6/-6) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
634. `packages/opencode/src/server/adapter.bun.ts` — All changed lines (+0/-40) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
635. `packages/opencode/src/server/adapter.node.ts` — All changed lines (+0/-66) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
636. `packages/opencode/src/server/adapter.ts` — All changed lines (+0/-21) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
637. `packages/opencode/src/server/error.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
638. `packages/opencode/src/server/fence.ts` — All changed lines (+0/-81) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
639. `packages/opencode/src/server/instance.ts` — All changed lines (+105/-88) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
640. `packages/opencode/src/server/mdns.ts` — All changed lines (+50/-50) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
641. `packages/opencode/src/server/middleware.ts` — All changed lines (+26/-85) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
642. `packages/opencode/src/server/projectors.ts` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
643. `packages/opencode/src/server/proxy.ts` — All changed lines (+32/-73) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
644. `packages/opencode/src/server/router.ts` — lines 1-105 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
645. `packages/opencode/src/server/routes/config.ts` — All changed lines (+33/-30) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
646. `packages/opencode/src/server/routes/control/index.ts` — All changed lines (+0/-160) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
647. `packages/opencode/src/server/routes/control/workspace.ts` — All changed lines (+0/-203) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
648. `packages/opencode/src/server/routes/event.ts` — All changed lines (+3/-8) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
649. `packages/opencode/src/server/routes/experimental.ts` — All changed lines (+72/-106) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
650. `packages/opencode/src/server/routes/file.ts` — All changed lines (+47/-40) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
651. `packages/opencode/src/server/routes/global.ts` — All changed lines (+73/-48) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
652. `packages/opencode/src/server/routes/instance/httpapi/config.ts` — All changed lines (+0/-67) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
653. `packages/opencode/src/server/routes/instance/httpapi/permission.ts` — All changed lines (+0/-72) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
654. `packages/opencode/src/server/routes/instance/httpapi/project.ts` — All changed lines (+0/-62) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
655. `packages/opencode/src/server/routes/instance/httpapi/provider.ts` — All changed lines (+0/-142) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
656. `packages/opencode/src/server/routes/instance/httpapi/question.ts` — All changed lines (+0/-86) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
657. `packages/opencode/src/server/routes/instance/httpapi/server.ts` — All changed lines (+0/-136) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
658. `packages/opencode/src/server/routes/instance/middleware.ts` — All changed lines (+0/-35) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
659. `packages/opencode/src/server/routes/instance/provider.ts` — All changed lines (+0/-158) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
660. `packages/opencode/src/server/routes/instance/sync.ts` — All changed lines (+0/-143) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
661. `packages/opencode/src/server/routes/instance/trace.ts` — All changed lines (+0/-59) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
662. `packages/opencode/src/server/routes/mcp.ts` — All changed lines (+42/-77) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
663. `packages/opencode/src/server/routes/permission.ts` — All changed lines (+18/-22) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
664. `packages/opencode/src/server/routes/project.ts` — All changed lines (+21/-25) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
665. `packages/opencode/src/server/routes/provider.ts` — lines 1-171 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
666. `packages/opencode/src/server/routes/pty.ts` — All changed lines (+22/-59) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
667. `packages/opencode/src/server/routes/question.ts` — All changed lines (+23/-35) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
668. `packages/opencode/src/server/routes/session.ts` — All changed lines (+190/-266) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
669. `packages/opencode/src/server/routes/tui.ts` — All changed lines (+7/-12) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
670. `packages/opencode/src/server/routes/ui.ts` — All changed lines (+0/-55) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
671. `packages/opencode/src/server/routes/workspace.ts` — lines 1-94 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
672. `packages/opencode/src/server/server.ts` — All changed lines (+328/-111) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
673. `packages/opencode/src/server/workspace.ts` — All changed lines (+0/-122) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
674. `packages/opencode/src/session/agency-swarm-utils.ts` — lines 1-4, line 34, lines 50-163 — general agency-swarm message and file helper utilities. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These helpers support the bridge, but the current changelog does not name them directly.
675. `packages/opencode/src/session/agency-swarm.ts` — lines 1-90; lines 480-732; lines 753-1324, lines 1358-1552, lines 1573-1702, lines 1754-1901, lines 2037-2096 — imports and session bridge scaffolding not named in the current changelog; stream setup, message plumbing, and general runtime helpers outside named buckets; remaining stream/event handling and recipient/model helpers outside named buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: This file mixes named features with a large unlabeled session bridge. / The changelog names specific fixes here, but not the full session bridge body. / The current changelog does not split the rest of this added session runtime into feature buckets.
676. `packages/opencode/src/session/agent-builder.ts` — lines 1-8 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
677. `packages/opencode/src/session/agent-planner.ts` — lines 1-9 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
678. `packages/opencode/src/session/compaction.ts` — All changed lines (+338/-437) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
679. `packages/opencode/src/session/index.ts` — All changed lines (+893/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
680. `packages/opencode/src/session/instruction.ts` — All changed lines (+186/-172) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
681. `packages/opencode/src/session/llm.ts` — All changed lines (+312/-421) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
682. `packages/opencode/src/session/message-v2.ts` — All changed lines (+906/-944) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
683. `packages/opencode/src/session/message.ts` — All changed lines (+172/-172) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
684. `packages/opencode/src/session/overflow.ts` — All changed lines (+12/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
685. `packages/opencode/src/session/processor.ts` — All changed lines (+478/-556) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
686. `packages/opencode/src/session/projectors.ts` — All changed lines (+4/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
687. `packages/opencode/src/session/prompt.ts` — All changed lines (+1697/-1548) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
688. `packages/opencode/src/session/prompt/agent-builder.txt` — lines 1-73 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
689. `packages/opencode/src/session/prompt/agent-planner.txt` — lines 1-38 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
690. `packages/opencode/src/session/retry.ts` — All changed lines (+96/-102) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
691. `packages/opencode/src/session/revert.ts` — All changed lines (+154/-139) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
692. `packages/opencode/src/session/run-state.ts` — All changed lines (+0/-108) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
693. `packages/opencode/src/session/schema.ts` — All changed lines (+9/-7) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
694. `packages/opencode/src/session/session.sql.ts` — All changed lines (+0/-20) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
695. `packages/opencode/src/session/session.ts` — All changed lines (+0/-814) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
696. `packages/opencode/src/session/status.ts` — All changed lines (+86/-72) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
697. `packages/opencode/src/session/summary.ts` — All changed lines (+157/-143) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
698. `packages/opencode/src/session/system.ts` — All changed lines (+54/-62) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
699. `packages/opencode/src/session/todo.ts` — All changed lines (+80/-65) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
700. `packages/opencode/src/share/index.ts` — All changed lines (+0/-2) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
701. `packages/opencode/src/share/session.ts` — All changed lines (+0/-57) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
702. `packages/opencode/src/share/share-next.ts` — All changed lines (+323/-327) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
703. `packages/opencode/src/shell/shell.ts` — All changed lines (+84/-84) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
704. `packages/opencode/src/skill/discovery.ts` — All changed lines (+107/-107) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
705. `packages/opencode/src/skill/index.ts` — All changed lines (+232/-243) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
706. `packages/opencode/src/snapshot/index.ts` — All changed lines (+634/-685) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
707. `packages/opencode/src/storage/db.ts` — All changed lines (+133/-131) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
708. `packages/opencode/src/storage/index.ts` — All changed lines (+0/-26) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
709. `packages/opencode/src/storage/json-migration.ts` — All changed lines (+366/-368) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
710. `packages/opencode/src/storage/storage.ts` — All changed lines (+309/-287) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
711. `packages/opencode/src/sync/index.ts` — All changed lines (+210/-225) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
712. `packages/opencode/src/sync/schema.ts` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
713. `packages/opencode/src/temporary.ts` — All changed lines (+0/-33) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
714. `packages/opencode/src/tool/apply_patch.ts` — All changed lines (+236/-249) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
715. `packages/opencode/src/tool/bash.ts` — All changed lines (+230/-355) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
716. `packages/opencode/src/tool/batch.ts` — lines 1-183 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
717. `packages/opencode/src/tool/batch.txt` — lines 1-24 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
718. `packages/opencode/src/tool/codesearch.ts` — All changed lines (+127/-58) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
719. `packages/opencode/src/tool/edit.ts` — All changed lines (+130/-159) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
720. `packages/opencode/src/tool/external-directory.ts` — All changed lines (+13/-16) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
721. `packages/opencode/src/tool/glob.ts` — All changed lines (+70/-91) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
722. `packages/opencode/src/tool/grep.ts` — All changed lines (+147/-136) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
723. `packages/opencode/src/tool/index.ts` — All changed lines (+0/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
724. `packages/opencode/src/tool/invalid.ts` — All changed lines (+14/-17) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
725. `packages/opencode/src/tool/ls.ts` — lines 1-121 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
726. `packages/opencode/src/tool/ls.txt` — lines 1-1 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
727. `packages/opencode/src/tool/lsp.ts` — All changed lines (+70/-64) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
728. `packages/opencode/src/tool/mcp-exa.ts` — All changed lines (+0/-78) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
729. `packages/opencode/src/tool/multiedit.ts` — lines 1-46 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
730. `packages/opencode/src/tool/multiedit.txt` — lines 1-41 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
731. `packages/opencode/src/tool/plan-exit.txt` — All changed lines (+1/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
732. `packages/opencode/src/tool/plan.ts` — All changed lines (+112/-60) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
733. `packages/opencode/src/tool/question.ts` — All changed lines (+20/-19) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
734. `packages/opencode/src/tool/read.ts` — All changed lines (+92/-86) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
735. `packages/opencode/src/tool/registry.ts` — All changed lines (+211/-285) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
736. `packages/opencode/src/tool/schema.ts` — All changed lines (+3/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
737. `packages/opencode/src/tool/skill.ts` — All changed lines (+94/-65) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
738. `packages/opencode/src/tool/skill.txt` — All changed lines (+0/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
739. `packages/opencode/src/tool/task.ts` — All changed lines (+97/-106) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
740. `packages/opencode/src/tool/task.txt` — All changed lines (+3/-0) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
741. `packages/opencode/src/tool/todo.ts` — All changed lines (+21/-20) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
742. `packages/opencode/src/tool/tool.ts` — All changed lines (+93/-123) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
743. `packages/opencode/src/tool/truncate.ts` — All changed lines (+128/-126) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
744. `packages/opencode/src/tool/webfetch.ts` — All changed lines (+149/-138) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
745. `packages/opencode/src/tool/websearch.ts` — All changed lines (+142/-66) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
746. `packages/opencode/src/tool/write.ts` — All changed lines (+64/-72) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
747. `packages/opencode/src/util/archive.ts` — All changed lines (+13/-11) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
748. `packages/opencode/src/util/color.ts` — All changed lines (+16/-14) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
749. `packages/opencode/src/util/context.ts` — lines 1-25 — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
750. `packages/opencode/src/util/defer.ts` — All changed lines (+5/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
751. `packages/opencode/src/util/effect-zod.ts` — All changed lines (+15/-245) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
752. `packages/opencode/src/util/error.ts` — All changed lines (+0/-1) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
753. `packages/opencode/src/util/filesystem.ts` — All changed lines (+197/-195) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
754. `packages/opencode/src/util/flock.ts` — All changed lines (+4/-29) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
755. `packages/opencode/src/util/glob.ts` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
756. `packages/opencode/src/util/hash.ts` — Binary asset change (not counted by numstat) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
757. `packages/opencode/src/util/index.ts` — All changed lines (+0/-12) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
758. `packages/opencode/src/util/keybind.ts` — All changed lines (+86/-84) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
759. `packages/opencode/src/util/lazy.ts` — All changed lines (+8/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
760. `packages/opencode/src/util/local-context.ts` — All changed lines (+0/-23) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
761. `packages/opencode/src/util/locale.ts` — All changed lines (+65/-63) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
762. `packages/opencode/src/util/lock.ts` — All changed lines (+72/-70) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
763. `packages/opencode/src/util/log.ts` — All changed lines (+151/-154) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
764. `packages/opencode/src/util/media.ts` — All changed lines (+0/-26) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
765. `packages/opencode/src/util/opencode-process.ts` — All changed lines (+0/-24) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
766. `packages/opencode/src/util/process.ts` — All changed lines (+142/-140) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
767. `packages/opencode/src/util/rpc.ts` — All changed lines (+55/-53) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
768. `packages/opencode/src/util/schema.ts` — All changed lines (+5/-5) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
769. `packages/opencode/src/util/token.ts` — All changed lines (+5/-3) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
770. `packages/opencode/src/util/wildcard.ts` — All changed lines (+45/-43) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
771. `packages/opencode/src/v2/session-entry-stepper.ts` — All changed lines (+0/-261) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
772. `packages/opencode/src/v2/session-entry.ts` — All changed lines (+0/-219) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
773. `packages/opencode/src/v2/session-event.ts` — All changed lines (+0/-458) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
774. `packages/opencode/src/v2/session.ts` — All changed lines (+0/-69) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
775. `packages/opencode/src/worktree/index.ts` — All changed lines (+515/-502) — core runtime drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The file changed in fork runtime code, but no current changelog bucket maps it above 80% confidence.
776. `packages/opencode/test/AGENTS.md` — All changed lines (+0/-52) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
777. `packages/opencode/test/account/repo.test.ts` — All changed lines (+40/-40) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
778. `packages/opencode/test/account/service.test.ts` — All changed lines (+12/-12) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
779. `packages/opencode/test/acp/event-subscription.test.ts` — All changed lines (+2/-42) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
780. `packages/opencode/test/agent/agent.test.ts` — All changed lines (+46/-53) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
781. `packages/opencode/test/agent/display.test.ts` — lines 1-11 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
782. `packages/opencode/test/auth/auth.test.ts` — All changed lines (+52/-80) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
783. `packages/opencode/test/bus/bus-effect.test.ts` — All changed lines (+4/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
784. `packages/opencode/test/cli/tui/dialog-provider-browser.test.tsx` — lines 1-143 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
785. `packages/opencode/test/cli/tui/dialog-provider.test.ts` — lines 1-37 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
786. `packages/opencode/test/cli/tui/local-context.test.tsx` — lines 1-117 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
787. `packages/opencode/test/cli/tui/local.test.ts` — lines 1-299 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
788. `packages/opencode/test/cli/tui/plugin-add.test.ts` — All changed lines (+9/-13) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
789. `packages/opencode/test/cli/tui/plugin-install.test.ts` — All changed lines (+5/-3) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
790. `packages/opencode/test/cli/tui/plugin-lifecycle.test.ts` — All changed lines (+10/-9) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
791. `packages/opencode/test/cli/tui/plugin-loader-entrypoint.test.ts` — All changed lines (+39/-31) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
792. `packages/opencode/test/cli/tui/plugin-loader-pure.test.ts` — All changed lines (+5/-4) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
793. `packages/opencode/test/cli/tui/plugin-loader.test.ts` — All changed lines (+38/-92) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
794. `packages/opencode/test/cli/tui/plugin-toggle.test.ts` — All changed lines (+9/-7) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
795. `packages/opencode/test/cli/tui/prompt-framework-mode.test.tsx` — lines 1-225 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
796. `packages/opencode/test/cli/tui/prompt.test.tsx` — lines 1-328 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
797. `packages/opencode/test/cli/tui/provider-auth.test.ts` — lines 1-154 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
798. `packages/opencode/test/cli/tui/revert-diff.test.ts` — All changed lines (+0/-35) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
799. `packages/opencode/test/cli/tui/theme-provider.test.tsx` — lines 1-222 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
800. `packages/opencode/test/cli/tui/theme-store.test.ts` — All changed lines (+70/-4) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
801. `packages/opencode/test/cli/tui/thread.test.ts` — All changed lines (+92/-3) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
802. `packages/opencode/test/cli/tui/transcript.test.ts` — All changed lines (+8/-8) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
803. `packages/opencode/test/cli/tui/use-event.test.tsx` — All changed lines (+0/-175) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
804. `packages/opencode/test/config/agent-color.test.ts` — All changed lines (+6/-12) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
805. `packages/opencode/test/config/config.test.ts` — All changed lines (+363/-263) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
806. `packages/opencode/test/config/lsp.test.ts` — All changed lines (+0/-87) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
807. `packages/opencode/test/config/markdown.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
808. `packages/opencode/test/config/plugin.test.ts` — Binary asset change (not counted by numstat) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
809. `packages/opencode/test/config/tui.test.ts` — All changed lines (+351/-183) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
810. `packages/opencode/test/control-plane/adaptors.test.ts` — All changed lines (+0/-71) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
811. `packages/opencode/test/effect/app-runtime-logger.test.ts` — All changed lines (+0/-92) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
812. `packages/opencode/test/effect/cross-spawn-spawner.test.ts` — All changed lines (+2/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
813. `packages/opencode/test/effect/instance-state.test.ts` — All changed lines (+9/-9) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
814. `packages/opencode/test/effect/observability.test.ts` — All changed lines (+0/-46) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
815. `packages/opencode/test/effect/run-service.test.ts` — All changed lines (+4/-4) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
816. `packages/opencode/test/effect/runner.test.ts` — All changed lines (+44/-15) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
817. `packages/opencode/test/fake/provider.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
818. `packages/opencode/test/file/fsmonitor.test.ts` — All changed lines (+3/-9) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
819. `packages/opencode/test/file/index.test.ts` — All changed lines (+82/-92) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
820. `packages/opencode/test/file/path-traversal.test.ts` — All changed lines (+9/-15) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
821. `packages/opencode/test/file/ripgrep.test.ts` — All changed lines (+14/-174) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
822. `packages/opencode/test/file/time.test.ts` — lines 1-445 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
823. `packages/opencode/test/file/watcher.test.ts` — All changed lines (+1/-3) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
824. `packages/opencode/test/filesystem/filesystem.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
825. `packages/opencode/test/fixture/db.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
826. `packages/opencode/test/fixture/fixture.ts` — All changed lines (+6/-5) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
827. `packages/opencode/test/fixture/flock-worker.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
828. `packages/opencode/test/fixture/lsp/fake-lsp-server.js` — All changed lines (+2/-0) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
829. `packages/opencode/test/fixture/plug-worker.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
830. `packages/opencode/test/fixture/plugin-meta-worker.ts` — All changed lines (+7/-0) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
831. `packages/opencode/test/fixture/tui-plugin.ts` — All changed lines (+6/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
832. `packages/opencode/test/fixture/tui-runtime.ts` — All changed lines (+11/-15) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
833. `packages/opencode/test/format/format.test.ts` — All changed lines (+70/-143) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
834. `packages/opencode/test/installation/installation.test.ts` — All changed lines (+0/-55) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
835. `packages/opencode/test/installation/source-install-wrapper.test.ts` — lines 1-81 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
836. `packages/opencode/test/keybind.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
837. `packages/opencode/test/lib/llm-server.ts` — All changed lines (+26/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
838. `packages/opencode/test/lsp/client.test.ts` — All changed lines (+3/-6) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
839. `packages/opencode/test/lsp/index.test.ts` — All changed lines (+128/-104) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
840. `packages/opencode/test/lsp/lifecycle.test.ts` — All changed lines (+91/-128) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
841. `packages/opencode/test/mcp/headers.test.ts` — All changed lines (+22/-47) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
842. `packages/opencode/test/mcp/lifecycle.test.ts` — All changed lines (+303/-339) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
843. `packages/opencode/test/mcp/oauth-auto-connect.test.ts` — All changed lines (+12/-94) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
844. `packages/opencode/test/mcp/oauth-browser.test.ts` — All changed lines (+8/-27) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
845. `packages/opencode/test/mcp/oauth-callback.test.ts` — All changed lines (+0/-34) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
846. `packages/opencode/test/memory/abort-leak-webfetch.ts` — All changed lines (+0/-49) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
847. `packages/opencode/test/memory/abort-leak.test.ts` — All changed lines (+44/-34) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
848. `packages/opencode/test/permission-task.test.ts` — All changed lines (+7/-10) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
849. `packages/opencode/test/permission/next.test.ts` — All changed lines (+541/-533) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
850. `packages/opencode/test/plugin/auth-override.test.ts` — All changed lines (+3/-8) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
851. `packages/opencode/test/plugin/cloudflare.test.ts` — All changed lines (+0/-68) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
852. `packages/opencode/test/plugin/github-copilot-models.test.ts` — All changed lines (+0/-46) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
853. `packages/opencode/test/plugin/install-concurrency.test.ts` — All changed lines (+2/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
854. `packages/opencode/test/plugin/install.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
855. `packages/opencode/test/plugin/loader-shared.test.ts` — All changed lines (+79/-112) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
856. `packages/opencode/test/plugin/meta.test.ts` — All changed lines (+2/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
857. `packages/opencode/test/plugin/trigger.test.ts` — All changed lines (+28/-33) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
858. `packages/opencode/test/plugin/workspace-adaptor.test.ts` — All changed lines (+0/-109) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
859. `packages/opencode/test/preload.ts` — All changed lines (+3/-4) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
860. `packages/opencode/test/project/migrate-global.test.ts` — All changed lines (+11/-21) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
861. `packages/opencode/test/project/project.test.ts` — All changed lines (+73/-88) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
862. `packages/opencode/test/project/state.test.ts` — lines 1-115 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
863. `packages/opencode/test/project/vcs.test.ts` — All changed lines (+13/-71) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
864. `packages/opencode/test/project/worktree-remove.test.ts` — All changed lines (+89/-119) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
865. `packages/opencode/test/project/worktree.test.ts` — All changed lines (+128/-169) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
866. `packages/opencode/test/provider/amazon-bedrock.test.ts` — All changed lines (+30/-45) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
867. `packages/opencode/test/provider/gitlab-duo.test.ts` — All changed lines (+19/-20) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
868. `packages/opencode/test/provider/provider.test.ts` — All changed lines (+142/-290) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
869. `packages/opencode/test/provider/transform.test.ts` — All changed lines (+4/-315) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
870. `packages/opencode/test/pty/pty-output-isolation.test.ts` — All changed lines (+110/-115) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
871. `packages/opencode/test/pty/pty-session.test.ts` — All changed lines (+44/-54) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
872. `packages/opencode/test/pty/pty-shell.test.ts` — All changed lines (+16/-26) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
873. `packages/opencode/test/question/question.test.ts` — All changed lines (+52/-63) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
874. `packages/opencode/test/server/global-session-list.test.ts` — All changed lines (+16/-32) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
875. `packages/opencode/test/server/project-init-git.test.ts` — All changed lines (+14/-15) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
876. `packages/opencode/test/server/session-actions.test.ts` — All changed lines (+59/-25) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
877. `packages/opencode/test/server/session-list.test.ts` — All changed lines (+19/-31) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
878. `packages/opencode/test/server/session-messages.test.ts` — All changed lines (+30/-38) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
879. `packages/opencode/test/server/session-select.test.ts` — All changed lines (+8/-24) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
880. `packages/opencode/test/server/trace-attributes.test.ts` — All changed lines (+0/-76) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
881. `packages/opencode/test/session/agent-builder.test.ts` — lines 1-16 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
882. `packages/opencode/test/session/agent-planner.test.ts` — lines 1-14 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
883. `packages/opencode/test/session/compaction.test.ts` — All changed lines (+251/-951) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
884. `packages/opencode/test/session/instruction.test.ts` — All changed lines (+71/-172) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
885. `packages/opencode/test/session/llm.test.ts` — All changed lines (+121/-300) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
886. `packages/opencode/test/session/message-v2.test.ts` — All changed lines (+1/-160) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
887. `packages/opencode/test/session/messages-pagination.test.ts` — All changed lines (+98/-253) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
888. `packages/opencode/test/session/processor-effect.test.ts` — All changed lines (+12/-107) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
889. `packages/opencode/test/session/prompt-effect.test.ts` — lines 1-1294 — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
890. `packages/opencode/test/session/prompt.test.ts` — All changed lines (+495/-1759) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
891. `packages/opencode/test/session/retry.test.ts` — All changed lines (+9/-55) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
892. `packages/opencode/test/session/revert-compact.test.ts` — All changed lines (+544/-562) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
893. `packages/opencode/test/session/session-entry-stepper.test.ts` — All changed lines (+0/-916) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
894. `packages/opencode/test/session/session.test.ts` — All changed lines (+28/-67) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
895. `packages/opencode/test/session/snapshot-tool-race.test.ts` — All changed lines (+25/-32) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
896. `packages/opencode/test/session/structured-output-integration.test.ts` — All changed lines (+162/-193) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
897. `packages/opencode/test/session/structured-output.test.ts` — All changed lines (+16/-6) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
898. `packages/opencode/test/session/system.test.ts` — All changed lines (+4/-14) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
899. `packages/opencode/test/share/share-next.test.ts` — All changed lines (+16/-15) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
900. `packages/opencode/test/shell/shell.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
901. `packages/opencode/test/skill/discovery.test.ts` — All changed lines (+2/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
902. `packages/opencode/test/skill/skill.test.ts` — All changed lines (+272/-271) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
903. `packages/opencode/test/snapshot/snapshot.test.ts` — All changed lines (+169/-296) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
904. `packages/opencode/test/storage/db.test.ts` — All changed lines (+4/-4) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
905. `packages/opencode/test/storage/json-migration.test.ts` — All changed lines (+48/-31) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
906. `packages/opencode/test/storage/storage.test.ts` — All changed lines (+232/-230) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
907. `packages/opencode/test/sync/index.test.ts` — All changed lines (+3/-49) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
908. `packages/opencode/test/tool/apply_patch.test.ts` — All changed lines (+15/-33) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
909. `packages/opencode/test/tool/bash.test.ts` — All changed lines (+289/-385) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
910. `packages/opencode/test/tool/edit.test.ts` — All changed lines (+241/-251) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
911. `packages/opencode/test/tool/external-directory.test.ts` — All changed lines (+52/-23) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
912. `packages/opencode/test/tool/glob.test.ts` — All changed lines (+0/-81) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
913. `packages/opencode/test/tool/grep.test.ts` — All changed lines (+74/-77) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
914. `packages/opencode/test/tool/question.test.ts` — All changed lines (+8/-11) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
915. `packages/opencode/test/tool/read.test.ts` — All changed lines (+22/-37) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
916. `packages/opencode/test/tool/registry.test.ts` — All changed lines (+106/-132) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
917. `packages/opencode/test/tool/skill.test.ts` — All changed lines (+122/-51) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
918. `packages/opencode/test/tool/task.test.ts` — All changed lines (+36/-374) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
919. `packages/opencode/test/tool/tool-define.test.ts` — All changed lines (+65/-23) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
920. `packages/opencode/test/tool/truncation.test.ts` — All changed lines (+98/-133) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
921. `packages/opencode/test/tool/webfetch.test.ts` — All changed lines (+76/-25) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
922. `packages/opencode/test/tool/write.test.ts` — All changed lines (+289/-179) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
923. `packages/opencode/test/util/effect-zod.test.ts` — All changed lines (+4/-697) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
924. `packages/opencode/test/util/filesystem.test.ts` — All changed lines (+14/-14) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
925. `packages/opencode/test/util/flock.test.ts` — All changed lines (+24/-67) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
926. `packages/opencode/test/util/glob.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
927. `packages/opencode/test/util/lock.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
928. `packages/opencode/test/util/log.test.ts` — All changed lines (+0/-44) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
929. `packages/opencode/test/util/module.test.ts` — All changed lines (+2/-2) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
930. `packages/opencode/test/util/process.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
931. `packages/opencode/test/util/wildcard.test.ts` — All changed lines (+1/-1) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
932. `packages/opencode/test/workspace/workspace-restore.test.ts` — All changed lines (+0/-281) — test drift outside the named agency regression buckets. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: These test changes do not map cleanly to one current changelog feature bucket.
933. `packages/opencode/tsconfig.json` — All changed lines (+1/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
934. `packages/plugin/package.json` — All changed lines (+5/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
935. `packages/plugin/src/example-workspace.ts` — All changed lines (+0/-34) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
936. `packages/plugin/src/example.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
937. `packages/plugin/src/index.ts` — All changed lines (+0/-51) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
938. `packages/plugin/src/tool.ts` — All changed lines (+2/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
939. `packages/plugin/src/tui.ts` — All changed lines (+6/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
940. `packages/plugin/tsconfig.json` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
941. `packages/sdk/js/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
942. `packages/sdk/js/src/gen/core/serverSentEvents.gen.ts` — All changed lines (+1/-1) — generated or mechanical artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The artifact changed, but the source feature is not named in the current changelog.
943. `packages/sdk/js/src/v2/client.ts` — All changed lines (+0/-7) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
944. `packages/sdk/js/src/v2/data.ts` — All changed lines (+0/-32) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
945. `packages/sdk/js/src/v2/gen/sdk.gen.ts` — All changed lines (+260/-499) — generated SDK artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The generated API surface changed, but the source feature is not named in the current changelog.
946. `packages/sdk/js/src/v2/gen/types.gen.ts` — All changed lines (+517/-744) — generated SDK artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The generated API surface changed, but the source feature is not named in the current changelog.
947. `packages/sdk/js/src/v2/index.ts` — All changed lines (+0/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
948. `packages/sdk/openapi.json` — All changed lines (+1721/-2223) — generated SDK artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The generated API surface changed, but the source feature is not named in the current changelog.
949. `packages/shared/package.json` — All changed lines (+0/-39) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
950. `packages/shared/src/global.ts` — All changed lines (+0/-42) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
951. `packages/shared/src/types.d.ts` — All changed lines (+0/-46) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
952. `packages/shared/src/util/effect-flock.ts` — All changed lines (+0/-283) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
953. `packages/shared/test/filesystem/filesystem.test.ts` — All changed lines (+0/-338) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
954. `packages/shared/test/fixture/effect-flock-worker.ts` — All changed lines (+0/-63) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
955. `packages/shared/test/fixture/flock-worker.ts` — All changed lines (+0/-72) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
956. `packages/shared/test/lib/effect.ts` — All changed lines (+0/-53) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
957. `packages/shared/test/util/effect-flock.test.ts` — All changed lines (+0/-389) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
958. `packages/shared/tsconfig.json` — All changed lines (+0/-14) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
959. `packages/slack/package.json` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
960. `packages/slack/src/index.ts` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
961. `packages/storybook/.storybook/mocks/app/context/language.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
962. `packages/ui/package.json` — All changed lines (+2/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
963. `packages/ui/src/components/accordion.css` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
964. `packages/ui/src/components/accordion.tsx` — All changed lines (+5/-5) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
965. `packages/ui/src/components/app-icon.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
966. `packages/ui/src/components/apply-patch-file.test.ts` — All changed lines (+0/-43) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
967. `packages/ui/src/components/apply-patch-file.ts` — All changed lines (+0/-78) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
968. `packages/ui/src/components/avatar.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
969. `packages/ui/src/components/basic-tool.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
970. `packages/ui/src/components/button.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
971. `packages/ui/src/components/card.tsx` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
972. `packages/ui/src/components/collapsible.css` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
973. `packages/ui/src/components/collapsible.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
974. `packages/ui/src/components/context-menu.tsx` — All changed lines (+16/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
975. `packages/ui/src/components/dialog.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
976. `packages/ui/src/components/dock-surface.tsx` — All changed lines (+3/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
977. `packages/ui/src/components/dropdown-menu.tsx` — All changed lines (+16/-16) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
978. `packages/ui/src/components/file-icon.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
979. `packages/ui/src/components/file-media.tsx` — All changed lines (+0/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
980. `packages/ui/src/components/file-ssr.tsx` — All changed lines (+11/-26) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
981. `packages/ui/src/components/file.tsx` — All changed lines (+8/-43) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
982. `packages/ui/src/components/hover-card.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
983. `packages/ui/src/components/icon-button.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
984. `packages/ui/src/components/icon.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
985. `packages/ui/src/components/keybind.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
986. `packages/ui/src/components/line-comment.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
987. `packages/ui/src/components/list.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
988. `packages/ui/src/components/markdown.css` — All changed lines (+15/-15) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
989. `packages/ui/src/components/markdown.tsx` — All changed lines (+3/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
990. `packages/ui/src/components/message-part.css` — All changed lines (+7/-12) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
991. `packages/ui/src/components/message-part.tsx` — All changed lines (+31/-9) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
992. `packages/ui/src/components/popover.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
993. `packages/ui/src/components/progress-circle.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
994. `packages/ui/src/components/progress.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
995. `packages/ui/src/components/provider-icon.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
996. `packages/ui/src/components/provider-icons/types.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
997. `packages/ui/src/components/radio-group.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
998. `packages/ui/src/components/resize-handle.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
999. `packages/ui/src/components/select.tsx` — All changed lines (+3/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1000. `packages/ui/src/components/session-diff.test.ts` — All changed lines (+0/-37) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1001. `packages/ui/src/components/session-diff.ts` — All changed lines (+0/-92) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1002. `packages/ui/src/components/session-review.tsx` — All changed lines (+31/-50) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1003. `packages/ui/src/components/session-turn.css` — All changed lines (+3/-10) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1004. `packages/ui/src/components/session-turn.tsx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1005. `packages/ui/src/components/spinner.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1006. `packages/ui/src/components/sticky-accordion-header.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1007. `packages/ui/src/components/tabs.tsx` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1008. `packages/ui/src/components/tag.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1009. `packages/ui/src/components/text-field.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1010. `packages/ui/src/components/text-reveal.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1011. `packages/ui/src/components/thinking-heading.stories.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1012. `packages/ui/src/components/timeline-playground.stories.tsx` — All changed lines (+12/-36) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1013. `packages/ui/src/components/toast.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1014. `packages/ui/src/components/tool-error-card.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1015. `packages/ui/src/components/tool-status-title.tsx` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1016. `packages/ui/src/components/tooltip.tsx` — All changed lines (+0/-12) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1017. `packages/ui/src/context/data.tsx` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1018. `packages/ui/src/pierre/commented-lines.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1019. `packages/ui/src/pierre/worker.ts` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1020. `packages/ui/src/styles/base.css` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1021. `packages/ui/vite.config.ts` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1022. `packages/util/package.json` — lines 1-20 — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1023. `packages/util/src/array.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1024. `packages/util/src/binary.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1025. `packages/util/src/encode.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1026. `packages/util/src/error.ts` — All changed lines (+0/-6) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1027. `packages/util/src/fn.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1028. `packages/util/src/identifier.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1029. `packages/util/src/iife.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1030. `packages/util/src/lazy.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1031. `packages/util/src/module.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1032. `packages/util/src/path.ts` — All changed lines (+4/-4) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1033. `packages/util/src/retry.ts` — All changed lines (+0/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1034. `packages/util/src/slug.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1035. `packages/util/sst-env.d.ts` — Binary asset change (not counted by numstat) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1036. `packages/util/tsconfig.json` — lines 1-14 — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1037. `packages/web/package.json` — All changed lines (+2/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1038. `packages/web/src/components/Share.tsx` — All changed lines (+3/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1039. `packages/web/src/components/share/part.tsx` — All changed lines (+2/-8) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1040. `packages/web/src/content/docs/ar/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1041. `packages/web/src/content/docs/ar/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1042. `packages/web/src/content/docs/ar/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1043. `packages/web/src/content/docs/ar/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1044. `packages/web/src/content/docs/ar/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1045. `packages/web/src/content/docs/ar/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1046. `packages/web/src/content/docs/bs/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1047. `packages/web/src/content/docs/bs/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1048. `packages/web/src/content/docs/bs/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1049. `packages/web/src/content/docs/bs/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1050. `packages/web/src/content/docs/bs/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1051. `packages/web/src/content/docs/bs/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1052. `packages/web/src/content/docs/cli.mdx` — All changed lines (+15/-15) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1053. `packages/web/src/content/docs/da/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1054. `packages/web/src/content/docs/da/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1055. `packages/web/src/content/docs/da/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1056. `packages/web/src/content/docs/da/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1057. `packages/web/src/content/docs/da/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1058. `packages/web/src/content/docs/da/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1059. `packages/web/src/content/docs/de/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1060. `packages/web/src/content/docs/de/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1061. `packages/web/src/content/docs/de/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1062. `packages/web/src/content/docs/de/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1063. `packages/web/src/content/docs/de/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1064. `packages/web/src/content/docs/de/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1065. `packages/web/src/content/docs/es/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1066. `packages/web/src/content/docs/es/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1067. `packages/web/src/content/docs/es/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1068. `packages/web/src/content/docs/es/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1069. `packages/web/src/content/docs/es/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1070. `packages/web/src/content/docs/es/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1071. `packages/web/src/content/docs/fr/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1072. `packages/web/src/content/docs/fr/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1073. `packages/web/src/content/docs/fr/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1074. `packages/web/src/content/docs/fr/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1075. `packages/web/src/content/docs/fr/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1076. `packages/web/src/content/docs/fr/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1077. `packages/web/src/content/docs/go.mdx` — All changed lines (+9/-24) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1078. `packages/web/src/content/docs/it/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1079. `packages/web/src/content/docs/it/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1080. `packages/web/src/content/docs/it/modes.mdx` — All changed lines (+12/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1081. `packages/web/src/content/docs/it/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1082. `packages/web/src/content/docs/it/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1083. `packages/web/src/content/docs/it/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1084. `packages/web/src/content/docs/ja/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1085. `packages/web/src/content/docs/ja/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1086. `packages/web/src/content/docs/ja/modes.mdx` — All changed lines (+12/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1087. `packages/web/src/content/docs/ja/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1088. `packages/web/src/content/docs/ja/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1089. `packages/web/src/content/docs/ja/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1090. `packages/web/src/content/docs/ko/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1091. `packages/web/src/content/docs/ko/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1092. `packages/web/src/content/docs/ko/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1093. `packages/web/src/content/docs/ko/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1094. `packages/web/src/content/docs/ko/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1095. `packages/web/src/content/docs/ko/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1096. `packages/web/src/content/docs/modes.mdx` — All changed lines (+12/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1097. `packages/web/src/content/docs/nb/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1098. `packages/web/src/content/docs/nb/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1099. `packages/web/src/content/docs/nb/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1100. `packages/web/src/content/docs/nb/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1101. `packages/web/src/content/docs/nb/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1102. `packages/web/src/content/docs/nb/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1103. `packages/web/src/content/docs/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1104. `packages/web/src/content/docs/pl/cli.mdx` — All changed lines (+27/-26) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1105. `packages/web/src/content/docs/pl/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1106. `packages/web/src/content/docs/pl/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1107. `packages/web/src/content/docs/pl/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1108. `packages/web/src/content/docs/pl/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1109. `packages/web/src/content/docs/pl/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1110. `packages/web/src/content/docs/providers.mdx` — All changed lines (+0/-122) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1111. `packages/web/src/content/docs/pt-br/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1112. `packages/web/src/content/docs/pt-br/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1113. `packages/web/src/content/docs/pt-br/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1114. `packages/web/src/content/docs/pt-br/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1115. `packages/web/src/content/docs/pt-br/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1116. `packages/web/src/content/docs/pt-br/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1117. `packages/web/src/content/docs/ru/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1118. `packages/web/src/content/docs/ru/go.mdx` — All changed lines (+8/-23) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1119. `packages/web/src/content/docs/ru/modes.mdx` — All changed lines (+12/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1120. `packages/web/src/content/docs/ru/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1121. `packages/web/src/content/docs/ru/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1122. `packages/web/src/content/docs/ru/zen.mdx` — All changed lines (+17/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1123. `packages/web/src/content/docs/th/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1124. `packages/web/src/content/docs/th/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1125. `packages/web/src/content/docs/th/modes.mdx` — All changed lines (+12/-11) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1126. `packages/web/src/content/docs/th/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1127. `packages/web/src/content/docs/th/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1128. `packages/web/src/content/docs/th/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1129. `packages/web/src/content/docs/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1130. `packages/web/src/content/docs/tr/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1131. `packages/web/src/content/docs/tr/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1132. `packages/web/src/content/docs/tr/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1133. `packages/web/src/content/docs/tr/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1134. `packages/web/src/content/docs/tr/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1135. `packages/web/src/content/docs/tr/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1136. `packages/web/src/content/docs/zen.mdx` — All changed lines (+9/-18) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1137. `packages/web/src/content/docs/zh-cn/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1138. `packages/web/src/content/docs/zh-cn/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1139. `packages/web/src/content/docs/zh-cn/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1140. `packages/web/src/content/docs/zh-cn/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1141. `packages/web/src/content/docs/zh-cn/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1142. `packages/web/src/content/docs/zh-cn/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1143. `packages/web/src/content/docs/zh-tw/cli.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1144. `packages/web/src/content/docs/zh-tw/go.mdx` — All changed lines (+7/-22) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1145. `packages/web/src/content/docs/zh-tw/modes.mdx` — All changed lines (+1/-0) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1146. `packages/web/src/content/docs/zh-tw/permissions.mdx` — All changed lines (+3/-2) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1147. `packages/web/src/content/docs/zh-tw/tools.mdx` — All changed lines (+20/-3) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1148. `packages/web/src/content/docs/zh-tw/zen.mdx` — All changed lines (+16/-17) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1149. `packages/web/src/pages/s/[id].astro` — All changed lines (+1/-1) — package-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this package delta clearly enough for a confident bucket.
1150. `patches/@npmcli%2Fagent@4.0.0.patch` — All changed lines (+0/-13) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1151. `patches/install-korean-ime-fix.sh` — All changed lines (+0/-120) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1152. `script/beta.ts` — All changed lines (+4/-1) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1153. `script/duplicate-pr.ts` — All changed lines (+1/-1) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1154. `script/github/close-issues.ts` — All changed lines (+2/-1) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1155. `script/stats.ts` — All changed lines (+1/-1) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1156. `script/version.ts` — All changed lines (+2/-2) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1157. `sdks/vscode/package.json` — All changed lines (+1/-1) — generated SDK artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The generated API surface changed, but the source feature is not named in the current changelog.
1158. `sdks/vscode/src/extension.ts` — All changed lines (+4/-4) — generated SDK artifact drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The generated API surface changed, but the source feature is not named in the current changelog.
1159. `session.json` — Binary asset change (not counted by numstat) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1160. `specs/v2/session.md` — All changed lines (+0/-17) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
1161. `sst-env.d.ts` — All changed lines (+4/-0) — repo-level fork drift. Question: should this stay as fork drift, or does it need a new changelog bucket? Reason: The current changelog does not name this delta clearly enough for a confident bucket.
