- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- Re-read this file at the start of each new task.
- Use fresh tool output before acting; do not rely on memory.
- Protect the context window. Avoid tool calls with unbounded or irrelevant output, prefer bounded reads/searches, and use one-off subagents for broad exploration so the main context only receives the relevant findings.
- If a focused task can be isolated and described clearly, delegate it to a subagent. If it is too messy to describe cleanly, keep it local.
- Do not over-specify delegated work. Give the goal, constraints, and success condition, not a script of exact steps or exact file edits.
- Keep this file short. Consolidate or tighten rules before adding new ones.
- The operational branch for this repo is `dev`. Use `origin/dev` as the default baseline for diffs, review, and sync work.
- If `origin/dev` is unavailable, escalate. Do not silently substitute another baseline.
- Prefer automation for read, edit, and test work.
- Before destructive commands, branch rewrites, force operations, releases, or process changes you did not start, get explicit user approval.

## Review Policy

- For non-trivial functional/code changes, run one Codex-based review path that is available (fresh subagent review or local Codex CLI review).
- If Codex review tooling is unavailable, continue with manual review and state that limitation.
- Keep code changes and docs-only changes in separate review streams when practical. Combine them only when the docs are inseparable from the exact code change.

## AGENTS.md Policy

- `AGENTS.md` changes are user-reviewed manually and do not require Codex review.
- Do not open PRs for `AGENTS.md`-only changes.
- Commit and push `AGENTS.md`-only changes directly to the default branch (`dev` in this repo) after user approval.
- Before shipping unshipped work, ask the user for explicit shipping approval in one clear sentence and wait for approval before proceeding.

## Execution Ledger

- Default operating mode is asynchronous execution, not chat. Push the task queue to the furthest safe shipped state before replying. If the next corrective or shipping step is clear and inside mandate, do it instead of explaining it.

- Use the plan/todo list as the live ledger for every user request, blocker, and dependency that is not fully shipped and approved.
- Tasks are not code-only. Branches, PRs, and commits are optional artifacts, not the work itself.
- Do not drop a task from that ledger until it is shipped, explicitly deferred, or explicitly removed by the user.
- Track the escalation state of each surfaced item: not yet surfaced to the user, already surfaced and waiting on the user, or resolved and no longer needs a user decision.
- If you realize you forgot earlier task details that affect the current work, recover the relevant transcript or task history before proceeding, including `.codex` session history when it is part of the source of truth.
- If a critical-path step needs user approval or input, surface that blocker immediately and do not drift into unrelated work until it is resolved or explicitly deprioritized.

## Mandate Boundary

- Work only inside the active mandate for the task. The mandate must cover the action, the target repo/branch/artifact, and the visibility of the result.
- A direct user request authorizes the subordinate steps needed to complete that exact task only inside the same repo, branch, artifact, and visibility boundary.
- Mandate does not expand by implication. Permission to edit or review does not by itself authorize repo creation, forks, publication, merges, releases, deploys, destructive actions, or writes to a different target.
- If the next step would cross that boundary, or the boundary is partial or unclear, stop and escalate before acting.

## Escalation Gate

- Escalate when there is no active mandate for the next step, the mandate boundary is unclear, or a required precondition for shipping is missing.
- Escalate before creating a repo or fork, changing the target remote or visibility, merging, releasing, or deploying unless the current mandate explicitly covers it.

## Fork Context

- This is `agentswarm-cli`, a minimal OpenCode fork for Agency Swarm.
- Treat `origin/dev` as the upstream baseline and keep the fork delta limited to Agency Swarm integration, required fork packaging/release work, and approved product branding.
- Remote model:
  - `origin` = upstream OpenCode
  - `vrsen` = canonical fork remote for `dev` pushes
- `dev` on fork remotes is append-only. Do not force-push, rebase, or rewrite published `dev` history.
- Upstream sync policy for fork `dev`: merge `origin/dev` into fork `dev` (or merge fork `dev` into a branch from `origin/dev`), then fast-forward push. Avoid restacking published commit series.
- Commit preservation is mandatory. If a rewrite is explicitly approved as an emergency exception, create immutable backup tags/refs first and record a `range-diff` proof before and after.
- Default delegated-review model policy: use Codex CLI with `gpt-5.4` at `xhigh`.
- Sync workflow:
  - run `git fetch --all --prune`
  - verify `origin/dev...vrsen/dev` counts
  - push `dev` to `vrsen`

## Style Guide

## Release Gate

- Regenerate and commit `bun.lock` on every release when package metadata, dependency metadata, or generated package outputs change.
- Before any release, build the CLI from source, reinstall it from the fresh local build, and run end-to-end validation through the Agency Swarm terminal demo path.
- Release validation must cover the real auth/onboarding flow, the exact functionality changed in the release, and focused regression checks for all touched areas.

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream

### Naming

Prefer single word names for variables and functions. Only use multiple words if necessary.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.
