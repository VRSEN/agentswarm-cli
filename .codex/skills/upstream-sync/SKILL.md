---
name: upstream-sync
description: Use for agentswarm-cli upstream OpenCode sync work, including upstream tag/range analysis, merge-attempt planning, fork-delta reconciliation, and PR-ready upstream-sync evidence.
---

# Upstream Sync

Use this repo skill when syncing `agentswarm-cli` with upstream OpenCode, preparing an upstream tag or range merge, reviewing an upstream-sync branch, or resolving upstream-sync conflicts.

## Core Model

- The final tree must be equivalent to the requested upstream OpenCode target plus the accounted fork patches from `USER_FLOWS.md` and `FORK_CHANGELOG.md`.
- The Git procedure may use a normal upstream merge and conflict resolution, but the result must match the patch model above.
- Merge only the requested upstream tag or range. Do not drift to newer upstream tags or branches.
- Follow upstream structure when upstream changed the codebase. Restructure and minimize fork patches instead of preserving old fork shape.
- Every kept fork delta must be accounted for by `USER_FLOWS.md` or `FORK_CHANGELOG.md`. If coverage is unclear, stop and escalate before keeping or adding that delta.
- Keep detailed upstream analysis and conflict notes in `/tmp/` or `.codex/internal/`. Keep public PR text concise and reviewer-focused.

## Startup Evidence

Before planning or editing:

1. Verify the worktree, current branch, remotes, and clean or known-dirty state.
2. Fetch the fork and upstream remotes.
3. Record the requested upstream target tag or range and its exact commit.
4. Find and record the last upstream OpenCode commit already present in the fork.
5. Find and record the exact fork merge commit that carried that upstream commit.
6. Use that fork merge commit as the anchor evidence for upstream range analysis, merge-shape checks, and count reconciliation. Do not infer the anchor from version names alone.
7. Read the relevant bounded sections of `USER_FLOWS.md` and `FORK_CHANGELOG.md` before classifying fork deltas.

Useful command patterns:

```bash
git rev-parse <upstream-tag>
git merge-base --is-ancestor <upstream-sha> <fork-branch>
git log --merges --first-parent --oneline <fork-base>..<fork-branch>
git show --no-patch --pretty=raw <fork-merge-sha>
```

## Upstream Analysis Worker

Before a merge attempt, assign a separate worker to analyze upstream changes from the recorded anchor to the requested target. The worker must produce a detailed internal document in `/tmp/` or `.codex/internal/`.

The upstream-analysis document must cover:

- structural shifts, moved files, renamed packages, and changed module boundaries;
- likely conflict areas and files with both upstream changes and fork deltas;
- upstream changes that may replace, obsolete, or narrow existing fork patches;
- blockers, dependency or build-system changes, and validation impacts;
- recommended merge strategy and specific areas that need fork-delta minimization.

Do not publish this document unless the user explicitly asks.

## Merge Attempts

- Use a separate isolated worktree for each merge attempt.
- Start each attempt from the mandated fork base or PR branch after fetching current refs.
- Merge only the recorded upstream target.
- Throw away ambiguous attempts instead of stacking guesses. Preserve only the useful evidence or notes in `/tmp/` or `.codex/internal/`.
- Resolve conflicts by applying the core model: upstream structure first, then the smallest accounted fork patches needed to preserve approved fork behavior.
- Preserve the behavior described in `USER_FLOWS.md` and the intentional divergence recorded in `FORK_CHANGELOG.md`.
- If upstream and fork behavior conflict and `USER_FLOWS.md` or `FORK_CHANGELOG.md` does not decide the outcome, stop and escalate.

## Fork Delta Reconciliation

After conflict resolution:

- Compare the final tree against the requested upstream target and classify every non-trivial fork delta.
- Keep a line-or-hunk-level internal classification for the sync branch.
- Remove or reshape fork code when upstream now provides the behavior or structure.
- Treat upstream-owned feature areas as upstream-owned unless `USER_FLOWS.md` or `FORK_CHANGELOG.md` proves a fork patch is required.
- Update public docs or changelog only when the sync mandate explicitly includes that work.
- Do not include private process, internal worker notes, or detailed conflict worksheets in public PR text.

## Count And Shape Checks

Before presenting the sync as ready:

- Refresh any sync PR branch onto the live fork default branch after fetching current refs. If rebasing or rebuilding is unsafe, stop and escalate before merge-readiness.
- Record the upstream commit count from the last present upstream commit to the requested target.
- Record branch commits from the fork base to the PR head.
- Inspect the merge commit parents and confirm the upstream parent matches the requested target commit.
- Reconcile counts with the merge shape. A normal sync should account for the upstream commit range, the merge commit, and any explicit follow-up fork-resolution commits.
- After the upstream merge and runtime conflict-resolution commits are stable, add one small docs/SOP follow-up commit that records the exact upstream-sync merge commit in `FORK_CHANGELOG.md`. Do not try to record a commit's final SHA inside that same commit.
- Investigate or escalate any mismatch before asking for merge, release, or review approval.

Useful command patterns:

```bash
git rev-list --count <upstream-anchor>..<upstream-target>
git rev-list --count <fork-base>..<pr-head>
git show --no-patch --pretty=%P <fork-merge-sha>
```

## Workflow-Equivalent Validation

Before push or readiness:

- Maintain a current internal workflow timing map from recent GitHub Actions runs for the upstream-sync branch or matching default-branch workflows. Do not guess runtimes.
- Run every local workflow-equivalent check whose normal local runtime is under 5 minutes.
- Name each slower workflow with its median hosted duration, then either run it on GitHub or explicitly track it as pending or non-blocking based on checked evidence.
- Keep workflow timing notes internal. Public PR text should only summarize final relevant check state.

## Final Review

Before handoff:

- Review the sync as fork work on top of the requested upstream target, not as a full review of upstream-owned commits.
- Do not run whole-branch review against the fork default branch when that would traverse the imported upstream range. Whole-upstream diff is audit data, not the review target.
- Review these surfaces instead: merge shape and upstream parent, final fork delta against the requested upstream target, explicit follow-up commits after the upstream merge, and any changed repo policy, skill, or public docs.
- Use `git diff <upstream-target>..<head>` for the fork-delta surface and `git diff <merge-commit>..<head>` for post-merge commits.
- If a review tool starts spending time on upstream-owned commits or files, stop it, record why, and switch to scoped review artifacts.
- Reread the changed public policy, docs, and skill files if this sync touched them.
- Verify fork-minimality against upstream and the two fork source-of-truth files.
- Verify public PR text is short, technical, and reviewer-focused.
- Keep internal analysis documents private unless the user approves publication.
- Report blockers as concrete alignment, evidence, or source-of-truth gaps.

## Skill Maintenance

- Keep this repo skill current whenever the upstream-sync SOP changes or a sync proves a better route.
- Do not call upstream-sync process work complete while known SOP improvements live only in notes, chat, or review comments.
