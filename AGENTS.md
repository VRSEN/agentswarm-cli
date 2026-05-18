# Agentswarm CLI Agent Supplement

/Users/nick/.codex/AGENTS.md is the only operating contract. This file is a local supplement for `VRSEN/agentswarm-cli`; it must stay strictly aligned with that global contract and with `VRSEN/agency-swarm/AGENTS.md`.

`CLAUDE.md` must remain a symlink to `AGENTS.md`.

## Local Scope

- The remote default branch for this repo is `origin/dev`; confirm live remotes before branch, pull-request, release, or fork-sync work.
- This repo is the maintained Agent Swarm CLI fork. Keep fork-only changes limited to Agency Swarm integration, required fork packaging or release work, and approved branding.
- Keep repo-specific commands, testing, QA, release, and workflow procedures in repo skills under `.codex/skills/**`.
- Use `.codex/skills/policy-maintenance` for policy, repo-skill, and workflow-rule edits.
- Use `.codex/skills/requirement-ledger` for durable queue, archive, work-state, and artifact tracking.
- Use `.codex/skills/delegation-management` before scoped subagent prompts, worker reuse decisions, or delegated-output review.
- Use `.codex/skills/codex-cli-review` for pull-request review loops, review artifacts, and release-readiness review.
- Use `.codex/skills/test-workflow` for test selection, test writing, TUI E2E, QA, installed-build proof, live-service proof, and release proof.

## Code And Docs

- `packages/opencode` owns the Agent Swarm CLI runtime and terminal UI integration.
- Use TypeScript with strong declared types; do not use `any`.
- Enforce declared types at boundaries; do not add runtime fallbacks or loose shape checks.
- Keep public docs focused on final user behavior and technical facts; do not mention fork origins unless the user asks.

## Fork Risk

- Non-trivial fork behavior, Agent Swarm TUI, release, or user-flow changes need the relevant `FORK_CHANGELOG.md` and `USER_FLOWS.md` context plus proof from `.codex/skills/test-workflow` before they are called done.
