# Agent Swarm CLI Agent Addendum

Follow the active global machine policy first. This file is a repo addendum only. It may tighten local rules, but it must not weaken user words, mandate limits, evidence gates, privacy, manager-worker boundaries, or public-mutation gates.

If this file conflicts with the global policy, direct user words, or checked remote state, follow the higher-priority source and treat this file as needing repair.

## Repo Baseline

- `CLAUDE.md` must stay a symlink to `AGENTS.md`.
- The default fork branch is `dev` in `https://github.com/VRSEN/agentswarm-cli`.
- If `origin` points to that VRSEN fork, treat fetched `origin/dev` as the baseline for new Agent Swarm CLI work.
- If `origin` points elsewhere, verify the VRSEN fork remote and its `dev` branch before reset or edit.
- Do not edit dirty user worktrees. Any task that edits files must use a fresh or owned isolated worktree outside dirty user checkouts, following the global worktree placement rule.
- Hard-reset only fresh or owned isolated worktrees or branches to fetched `origin/dev`, and only when they contain no user work.
- Never hard-reset, checkout-overwrite, rebase, stash, or clean dirty user-owned trees without explicit approval for that exact target and action.
- Do not assume local remote aliases beyond checked `git remote -v` output. If upstream OpenCode comparison is needed, verify the actual upstream remote or URL first.

## Fork Boundary

- This repo is the maintained Agent Swarm CLI fork of OpenCode.
- Upstream OpenCode source is `https://github.com/anomalyco/opencode`; verify the live remote or URL before using it for comparisons.
- Keep fork delta limited to Agency Swarm integration, required fork packaging or release work, and approved branding.
- Before non-trivial edits to files that also exist upstream, read the upstream version when a verified upstream source is available and keep the change easy to rebase.
- Treat unexplained fork-only lines as expensive. If a line is not required by `FORK_CHANGELOG.md`, `USER_FLOWS.md`, checked code, or direct user mandate, remove it or escalate before expanding it.
- Read the relevant parts of `FORK_CHANGELOG.md` and `USER_FLOWS.md` before fork behavior, TUI behavior, release QA, or listed user flows are changed.
- Do not add unrelated refactors, formatting churn, style drift, or cleanup to fork-only work.

## Policy And Skills

- Policy, repo-skill, and workflow-rule edits use `.codex/skills/policy-maintenance`.
- Pull-request review, PR compliance, hosted-review fallback, and review-thread work use `.codex/skills/codex-cli-review`.
- Delegation prompts and delegated-output review use `.codex/skills/delegation-management`.
- Requirement tracking uses `.codex/skills/requirement-ledger` as tooling, but durable ledger state must stay outside the repo unless the user explicitly allows repo-local state.
- Test planning, TUI QA, installed-build proof, release proof, live-service validation, and version or path-cache proof use `.codex/skills/test-workflow`.
- Claude review may be used only as second-opinion evidence through `.codex/skills/claude-cli-review`; it is not authority.

## Codebase Map

- `packages/opencode` is the CLI core: commands, server routes, session flow, providers, storage, TUI control, and Agency Swarm integration.
- `packages/app` is the shared Solid UI.
- `packages/desktop` and `packages/desktop-electron` wrap desktop surfaces.
- `packages/sdk/js` and `packages/plugin` define generated client and extension surfaces that must stay aligned with server and transport contracts.
- `packages/web`, `packages/docs`, and `specs/` carry public docs and protocol specs.
- The canonical Agent Swarm TUI harness lives in `e2e/agent-swarm-tui`.

## TypeScript And Bun

- Prefer Bun APIs when they fit, such as `Bun.file()`.
- Do not use `any`.
- Let types infer where that stays clear. Add explicit types for exports or clarity.
- Enforce declared types at boundaries. Do not add runtime fallbacks or shape checks just to support multiple loose types.
- Run package-local scripts from `package.json`; use `bun typecheck` at the package or repo scope that matches the change.
- Do not call `tsc` directly unless a package script requires it.
- Keep files under 500 lines unless the user explicitly approves an exception.
- Prefer functions and methods between 10 and 40 lines, and keep them under 100 lines.

## Style

- Keep logic in one function unless reuse or composition clearly helps.
- Prefer short local names when they stay clear.
- Prefer `const` over `let`.
- Prefer early returns over `else` when clearer.
- Avoid unnecessary destructuring; use dot access when it keeps context clear.
- Prefer array methods when they keep the code clearer.
- In Drizzle schemas, use snake_case field names so column names do not need to be redefined as strings.
- In `src/config`, follow the existing self-export pattern when adding config modules.

## Tests And Proof

- Run the smallest focused proof first, then the package or repo checks that match the changed boundary.
- For TUI or terminal behavior, use `.codex/skills/test-workflow` and the PTY harness instead of text-only claims.
- For user-command fixes, prove the command through the same wrapper class the user runs, including `agentswarm`, `openswarm`, `opencode`, `npx`, `bunx`, package-manager shims, shell hash tables, and cached binaries when relevant.
- Do not claim an installed-build or path-cache fix until stale resolvers are ruled out or fixed.
- Docs-only and `FORK_CHANGELOG.md` edits do not need product QA, but still need diff and formatting checks.

## Release Gate

- For any npm-published package, follow this release order: build the fresh local change, install that local build globally so the user's normal command points to it, get explicit user approval after manual testing, then tag, create the GitHub Release, and publish.
- Regenerate and commit `bun.lock` on release when package manifests, resolved dependencies, or generated package artifacts change.
- No tag, GitHub Release, npm publish, or release safety claim is allowed without the release proof and review gates required by global policy and the review skill.

## Documentation

- Keep private process out of public docs, issues, pull requests, and release notes.
- Do not publish work-in-progress audit notes, classification files, or internal review artifacts unless the user explicitly asks.
- Do not mention upstream fork origins in user-facing docs unless the user asks for that comparison.
- Point docs to the matching code files when useful.
- Lead with user benefit before technical steps.
- Keep each full recipe in one place and cut filler.

## Git And Public Work

- Review `git status -sb` and the final diff before commits or pushes.
- Branch pushes require an explicit mandate. Push policy or feature branches only; do not push `origin/dev` directly unless the user explicitly asks.
- No merge, force push, branch deletion, tag, release, package publish, public ready-for-review mark, pull-request creation, GitHub comment, or GitHub review submission is allowed without a direct current mandate for that exact action.
- Treat GitHub `@` mentions as actions that may notify people or trigger automation.
