# Agent Operating Contract

This file is the public repo-specific supplement for `agentswarm-cli`.
CLAUDE.md must stay a symlink to AGENTS.md.

Use this file for repo invariants, fork policy, code style, release gates, and repo skill routing. Do not duplicate detailed global manager/process policy here.
Policy summaries live in AGENTS.md files. Do not check in duplicate copies of global workflow skills. If this repo adds a skill, it must carry only narrow repo-specific procedure, command routing, validation detail, or harness facts.

## Project Context

- When project context has been lost, condensed, or is unclear, rebuild it from current user instructions, this file, `FORK_CHANGELOG.md`, `USER_FLOWS.md`, and relevant source or docs before planning, delegation, policy work, deep analysis, implementation, or release decisions.
- If relevant context is still present and has not been reduced to a stale summary, agents may use it without rereading every source.
- Keep private ledger IDs, private local paths, internal task IDs, and internal review artifacts out of public repo policy, pull requests, issues, comments, release notes, docs, and other public artifacts.

## Codebase Orientation

- `packages/opencode` is the Agent Swarm CLI core: command entry points, server routes, session flow, providers, storage, TUI control, and Agency Swarm integration.
- `packages/app` is the shared Solid UI; `packages/desktop` and `packages/desktop-electron` wrap desktop surfaces around it.
- `packages/sdk/js` and `packages/plugin` define generated client and extension surfaces that must stay aligned with server and transport contracts.
- `packages/web`, `packages/docs`, and `specs/` carry public docs and protocol specs; use package-local scripts from `package.json` for validation.
- The Agent Swarm terminal QA harness lives in `e2e/agent-swarm-tui`.

## Fork Context

- This repo is `agentswarm-cli`, our maintained fork of OpenCode. Here, `upstream` means the OpenCode `dev` branch at `https://github.com/anomalyco/opencode`, never this fork's own default branch.
- Treat the upstream OpenCode `dev` branch as the baseline and keep the fork delta limited to Agency Swarm integration, required fork packaging or release work, and approved branding.
- Before any non-trivial edit to a file that also exists in upstream, read the upstream version first and prove that the change still fits one of those buckets. Ask: can you shape the change so the next upstream merge is easier, and do any changed lines look accidental or unexplained? If yes, treat those lines as a bug candidate, check `git blame` or `FORK_CHANGELOG.md`, and escalate to the user if you still cannot explain them.
- Unrelated refactors, reformatting, style drift, while-you're-here cleanup, and made-up abstraction layers are not allowed in fork-only work.
- Every fork-only line needs a concrete reason. If a line is not strictly required, remove it or restore the upstream shape. State why upstream behavior is not enough in the commit message or `FORK_CHANGELOG.md`.
- Why: keep the fork rebuildable from upstream with a small, auditable delta.
- Treat every divergence from upstream as expensive and risky. It should feel painful to add or keep fork-only code because every extra line increases rebase, release, and debugging risk.
- In code, pull-request, and release-candidate reviews, treat code bugs, repo-rule violations, PR compliance failures, missing official review gates, missing required QA or evidence, fork-minimality drift, excessive scope, and unintentional divergence as findings, not style notes. Mark them `P0` when they risk release harm, data loss, security, privacy, destructive behavior, or the core Agent Swarm/TUI release path; `P1` when they risk real regressions, user-visible behavior changes, or fork-minimality/upstream-alignment breakage; and `P2` when they add unjustified drift, unrelated churn, missing evidence, or unapproved fork delta.
- Treat `FORK_CHANGELOG.md` and `USER_FLOWS.md` as the fork priming path for coding, review, release, and delegation. Read the relevant bounded sections before fork work; `FORK_CHANGELOG.md` approves intentional divergence, and `USER_FLOWS.md` owns fork user-flow expectations. If code differs from upstream and the behavior is not clearly covered there, looks unintentional, or changes a listed user flow without matching proof, stop and escalate before editing further.
- Keep a line-or-hunk-level classification for every non-trivial fork delta before merge. The classification may live in an internal review artifact, PR review notes, or tests; `FORK_CHANGELOG.md` stays high-level and should summarize categories, not become a raw line dump.
- If the needed feature or behavior already exists upstream, use that implementation. Do not build a parallel path.
- Keep the clean test checkout clean and current before you use it as proof. If that checkout is stale or has unowned local changes, escalate before you rely on it.
- Do not hide local-only drift.
- Any task that edits files must run in a separate git worktree. Do not edit from a detached checkout or the shared main checkout.
- Before any commit, pull request, or release, compare your state to the right clean baseline: use upstream OpenCode for upstream comparisons and fork-delta checks, and use this fork's default branch only for fork-branch drift or publish-state checks. Revert or justify anything that is not tied to a deliberate requirement.
- Why: preserve rebuild-from-upstream capability and stop silent fork drift.
- Local remotes may differ by checkout. Verify remote URLs before fetch, push, compare, or release work; do not rely on a remote alias name as proof of ownership.
- Treat `dev` and other shared long-lived fork branches as append-only. Do not force-push, rebase, or rewrite their published history unless the user explicitly asks for that exact recovery.
- A stale-branch mistake is severity one. If a pull request comes from the wrong base, wrong diff, or wrong artifact, stop product work and do a full live audit before you mutate pull requests again.
- To sync the fork default branch, merge upstream OpenCode `dev` into the fork default branch, or do the reverse equivalent, then fast-forward push. Avoid restacking published commit series.
- For upstream tag or range sync work, load `.codex/skills/upstream-sync/SKILL.md` before planning, merging, resolving conflicts, or reviewing the sync.
- If a rewrite is explicitly approved as an emergency exception, make backup refs first and save proof that compares the old commit range to the new one before and after.
- Sync workflow:
  - verify local remote URLs point to the expected upstream and fork repositories
  - run `git fetch --all --prune`
  - verify upstream-branch to fork-default-branch counts
  - push the local fork default branch to the fork repository
- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.

## Repo Work And Pull Requests

- Docs-only and `FORK_CHANGELOG.md` edits do not need product QA, but mutating the fork default branch for them still needs explicit user approval.
- After verifying the local remote model, if the relevant remotes are reachable, run `git fetch --all --prune` and work from a named branch based on the mandated target branch before analysis, edits, or tests.
- If the task spans more than one repo or worktree, fetch the relevant remotes, run `git status -sb` and `git rev-parse --short HEAD`, or the repo-tooling equivalent, in each one and confirm the active branch before you edit.
- For pushes to the fork default branch, verify the upstream-branch to fork-default-branch counts before you push.
- For public release work, verify that the exact release commit is already reachable from the fork default branch and that the target version is already present in the release input files.
- If the remote is unavailable, you may continue, but say that you are assuming the branch is already synced.
- Keep pull-request branches linear on top of their base branch. Rebase onto the live base branch; do not merge the base branch into a pull-request branch.
- Before opening a pull request, open and satisfy the live repo rules: `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/workflows/pr-standards.yml`, `.github/workflows/compliance-close.yml`, and any workflow that will gate the touched change.
- Build-impact changes must go through a pull request before they reach the fork default branch. Build-impact includes runtime code, packaging, release scripts, generated binaries, dependency manifests or lockfiles, CI/build workflows, and tests or harnesses that gate shipped behavior. Direct default-branch commits for build-impact changes are forbidden unless the user explicitly approves an emergency exception for that exact change.
- Pull-request-specific work includes comment review, thread replies, issue-link checks, pull-request body edits, outside-signal polling, and other GitHub-side mutations. Keep those checks tied to the live pull request, current head SHA, and repo gates.
- Before requesting merge approval, verify the final diff, source/base/head SHAs, required checks, unresolved threads, and official review findings. The latest head is merge-ready only with a clean current-head local Codex review, green required checks, and zero unresolved threads.
- Every pull-request merge needs explicit user approval and a human alignment gate. Pull requests with user-testable behavior also need a human QA gate. Worker review can inform these gates but cannot replace them.
- Pending GitHub checks, hosted reviews, unresolved pull-request comments, unresolved official review findings, and other agent-visible workflows are open work until fixed, rerun green, or classified as non-blocking with checked evidence.

## Danger Zone: Public And Irreversible Operations

- Pull-request merges, release notes, tags, GitHub Releases, npm publishing, yanks, unpublishes, and any public package or release change are danger-zone operations.
- Right before each public step, recheck the live repo state, exact commit, relevant workflow status, version files, release and tag state, package-index state, and release-notes compare range.
- If live public state, the real source of truth, or the next mutation is not fully checked, stop and escalate.
- For release notes, recheck the compare range and shipped pull-request set right before you draft or edit. If tags, versions, or the compare base changed, throw the old draft away and rebuild it from fresh proof.
- If GitHub releases or tags, package-index state, and repo version files disagree, treat that as recovery work. First prove what is really shipped. Then get approval for the exact repair.
- Never merge, tag, draft, publish, yank, unpublish, or edit release notes just to make the state look right before you prove what is already live.

## Release Gate

- For any npm-published package in this repo, follow this four-step release flow and never skip step 3:
  1. Build the fresh local change.
  2. Install that local build globally so the user's normal command points to it.
  3. The user tests that local build by hand and gives explicit approval.
  4. Only then tag the release, create the GitHub Release, and publish to npm.
- Regenerate and commit `bun.lock` on every release when package manifests, resolved dependencies, or generated package artifacts changed.
- Before release approval or any release safety claim, prove the exact release commit against the repo's release checks, TUI flow checks when relevant, installed-build proof, and human QA gate.
- No tag, GitHub Release, or npm publish may happen without a green Codex pre-release review of the exact release commit against the fork default branch; if any review finding remains, stop and surface it to the user.

## Documentation Rules

- Keep private process out of public repo artifacts. Public pull-request descriptions, comments, issues, and docs must state final intent, technical facts, and reviewer-relevant context only. Do not mention private chats, ledgers, internal drafts, personal ownership cues, or wording that makes the work look externally misaligned.
- Do not publish work-in-progress decision artifacts. Intermediate classification files, audit reports, keep/drop decision sheets, and other internal review artifacts stay internal. Keep them under `.codex/internal/` (gitignored) or `/tmp/`. Exception: if the user explicitly asks for a public review artifact.
- Why: public process exposure creates noise for reviewers, leaks internal unclassified problems, and muddles what the repo actually ships.
- Do not mention upstream fork origins in user-facing docs unless the user asked for that comparison.
- Point to the code files that match the documented behavior.
- Lead with the user benefit before the technical steps.
- In the main user flow, prefer product words over implementation details unless those details are required.
- Update docs and examples when behavior or APIs change, and make sure they match the code.
- Spell out the real workflows or use cases the change unlocks. Group related information together so the full recipe is in one place. Cut filler and repetition. Keep the shortest path to value obvious.
- Before you plan or edit a user-visible flow, read the TUI Product Doc. If the user asks to change user-visible behavior, update that doc in the same task or record it as an active artifact.
- Before you edit docs, read the target page and any linked official references that matter, and review nearby docs so you place the change in the right spot.
- When you add docs, add related links where they help the reader.

## TypeScript, Effect, Bun, And Schema Requirements

- Prefer Bun APIs when you can, like `Bun.file()`.
- Do not use `any`.
- Let types infer where that is clear. Add explicit types only when needed for exports or clarity.
- Enforce declared types at boundaries. Do not add runtime fallbacks or shape checks just to support multiple loose types.
- Run `bun typecheck` from the package directory when that is the right scope, or from repo root for monorepo-wide proof. Do not call `tsc` directly unless a package script requires it.
- In Effect code, follow the repo's existing `Effect.gen`, `Effect.fn`, `Context`, `Layer`, and `Schema` patterns before adding helpers or bypassing typed boundaries.
- In Drizzle schemas, use snake_case field names so you do not need to redefine column names as strings.

## Code Quality

- Keep files maintainable: one clear responsibility, a small public surface, local dependencies and effects, and enough focus to review and understand in one sitting.
- Treat 1,200 lines as a repo-wide soft cap. This is a planning and refactor signal, not a blocker.
- Aim for methods under 100 lines, and prefer 10 to 40.

### Large Files

- When planning, implementing, or refactoring hand-authored production TypeScript or TSX, start split planning at the 1,200-line cap.
- If you add to an already-over-cap file, keep the change focused and be ready to explain why splitting first would be worse.
- Exclude generated files, declarations, schemas, data blobs, icons, legal or static copy, and cohesive tests, fixtures, snapshots, or stories from the cap.

## Style Guide

### General Principles

- Keep things in one function unless reuse or composition clearly helps.
- Avoid `try` and `catch` when you can.
- Prefer short local names when they stay clear.
- Prefer array methods like `flatMap`, `filter`, and `map` over `for` loops when they keep the code clear. Use type guards on `filter` when needed to keep type inference.
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.

### Naming

- Prefer one-word names for variables and functions unless that would be unclear.
- Default to one-word names for new locals, params, and helpers.
- Multi-word names are fine only when one word would be vague.
- Do not add new camelCase compounds when a short one-word name is clear.
- Before you finish, shorten new identifiers where you can.
- Good short names include `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, and `timeout`.
- Inline values that are used only once when that keeps the code clear.

### Destructuring

- Avoid unnecessary destructuring. Use dot access when that keeps context clear.

### Variables

- Prefer `const` over `let`. Prefer ternaries or early returns over reassignment.

### Control Flow

- Avoid `else` when an early return is clearer.

## Type Safety

- Treat weak typing as a bug.
- If you reach for `Any`, duck typing, or runtime field probing, stop and use proper types first.
- Avoid `# type: ignore` in production code.
- Use typed dependency models when they exist, and access their fields directly.
- Before you change runtime code, explore the widest relevant type context first.
- Prefer top-level imports. If you need a local import, call it out.

## During Refactoring: Avoid Functional Changes

### Allowed

- Code movement, method extraction, renaming, file splitting, and upstream-alignment refactors that keep behavior the same.

### Forbidden

- Changing logic, behavior, APIs, or error handling unless the task explicitly asks for it.
- Fixing bugs unless the task asks for bug fixes.

### Verification

- Cross-check the current `dev` branch when needed.
- Ship refactors in a separate pull request or commit stream from functional changes when practical.

## Refactoring Strategy

- Split large modules. Respect codebase boundaries. Understand the existing design before you add code.
- Keep one domain per module. Keep coupling low.
- Prefer clear, descriptive names over artificial abstractions.
- Prefer action words over vague names.
- Apply renames atomically across imports, call sites, and docs.

## Git Practices

Why: hosted CI (Windows e2e, 30 min) is a final gate, not a per-commit gate; broken pushes burn quota.

- Review diffs and status before and after changes. Read the full `git diff` and `git diff --staged` outputs before you plan new changes or commit.
- Verify the change yourself before you push.
- Local commits need at least `90%+` confidence. Pushes need `100%` confidence unless the user explicitly allows otherwise.
- Include a probability estimate in any escalation under this gate. If you cannot verify the change yourself, escalate.
- Treat staging, committing, and pushing as user-approved actions. Do not do them unless the user clearly asked. Once approval is clear and the change is verified, do them right away.
- Never modify staged changes unless the user explicitly asked.
- Use non-interactive git defaults so editors do not pop up.
- If you must stash, keep staged and unstaged changes in separate stashes when needed.
- If a pre-commit hook changes files, stage the hook changes and rerun the commit with the same message.
- Build commit messages from the staged diff and use a title plus bullet body.
- After each commit, check what you committed with `git show --name-only -1`.

### GitHub `@`-Mention Discipline

- Every `@` mention on GitHub is an action, not just text.
- `@username` notifies that person. `@codex review` and similar phrases trigger the Codex bot.
- This repo treats `@codex ...` lines in pull requests and issues as commands. Do not write them casually.
- Do not write long chatty pull-request comments.
- If a review comment is truly needed, keep it short, technical, and action-focused.
- If you do not know what a mention will trigger, look it up before you post. When in doubt, do not post.
- Why: a recent free-form PR comment paged the maintainer and re-triggered the Codex bot unnecessarily; `@` on GitHub is a side effect, not prose.

## References

Why: without a hardcoded source of truth, agents re-derive behavior from code each task.

- TUI Product Doc: `https://github.com/VRSEN/agency-swarm/blob/main/docs/core-framework/agencies/agent-swarm-cli.mdx`
- Fork Repo: `https://github.com/VRSEN/agentswarm-cli`
- Upstream Repo: `https://github.com/anomalyco/opencode`
