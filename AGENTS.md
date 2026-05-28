# agentswarm-cli Primer

This is the public repo-specific supplement for `agentswarm-cli`.
`CLAUDE.md` must stay a symlink to `AGENTS.md`.

Keep this file focused on repository identity, fork invariants, release gates, and validation sources. Put global workflow rules in shared policy and step-by-step procedures in skills.

## Repository Identity

- `agentswarm-cli` is the generic, customizable Agent Swarm CLI/TUI foundation maintained as a fork of OpenCode.
- This repo owns the reusable foundation: the launcher, TUI shell, Agency Swarm bridge, product-profile inputs, packaging, generated client/plugin surfaces, and release mechanics.
- Downstream products such as OpenSwarm consume this foundation. They define concrete agents, product configuration, and downstream packaging values through the generic product-profile inputs. Do not hard-code downstream product behavior, add-on lists, agent catalogs, or product-specific defaults here unless the change is a generic extension point with stable Agent Swarm defaults.
- Keep the fork rebuildable from upstream with a small, auditable delta. Every fork-only change needs a concrete Agency Swarm integration, fork packaging/release, downstream-profile, or approved branding reason.

## Key Areas

- `packages/opencode` is the CLI core: command entry points, server routes, session flow, provider state, storage, TUI control, and Agency Swarm integration.
- `packages/opencode/src/agency-swarm/product.ts` owns Agent Swarm defaults and downstream `AGENTSWARM_PRODUCT_*` profile inputs.
- `packages/opencode/src/agency-swarm/adapter.ts`, `packages/opencode/src/session/agency-swarm.ts`, and `packages/opencode/src/agency-swarm/npx.ts` are the main bridge, session, and launcher paths for Agency Swarm-backed runs.
- `packages/app` is the shared Solid UI; `packages/desktop` and `packages/desktop-electron` wrap desktop surfaces around it.
- `packages/sdk/js` and `packages/plugin` define generated client and extension surfaces that must stay aligned with server and transport contracts. Regenerate the JavaScript SDK with `./packages/sdk/js/script/build.ts`.
- `packages/web`, `packages/docs`, and `specs/` carry public docs and protocol specs.
- `e2e/agent-swarm-tui` is the Agent Swarm terminal QA harness. Use it for TUI Run mode, launcher, Agency Swarm bridge, add-ons/product-profile, and terminal-flow changes.

## Source Of Truth

- Upstream means the OpenCode `dev` branch at `https://github.com/anomalyco/opencode`, not this fork's default branch.
- `FORK_CHANGELOG.md` is the authoritative map of intentional fork-specific differences. If a fork delta is not clearly covered there, looks accidental, or changes a listed user flow without proof, stop and escalate before editing further.
- `USER_FLOWS.md` is the fork release QA source. Build-impact fork changes should be reflected there at the workflow level when they change what users can do or what release proof must cover.
- The TUI Product Doc is the external product reference for Agent Swarm CLI behavior: `https://github.com/VRSEN/agency-swarm/blob/main/docs/core-framework/agencies/agent-swarm-cli.mdx`.
- Before non-trivial edits to a file that also exists upstream, read the upstream version and shape the smallest fork delta that preserves upstream compatibility. If upstream already has the needed behavior, use it instead of building a parallel path.
- For fork-delta checks, compare against upstream OpenCode. Use this fork's default branch only for fork-branch drift, PR base, or publish-state checks.

## Fork Discipline

- Avoid unrelated refactors, reformatting, style drift, opportunistic cleanup, and made-up abstraction layers in fork work.
- Keep line-or-hunk-level rationale for non-trivial fork deltas in review notes, PR review artifacts, or tests. Keep `FORK_CHANGELOG.md` high-level rather than turning it into a raw diff log.
- Treat bug-like divergence as a bug candidate. Check upstream, `git blame`, and `FORK_CHANGELOG.md`; escalate if the reason is still unclear.
- In code, PR, and release-candidate reviews, treat fork-minimality drift, unintentional divergence, missing QA or evidence, repo-rule violations, and PR compliance failures as findings. Use `P0` for release, data, security, destructive-action, or core Agent Swarm/TUI harm; `P1` for real regressions, user-visible behavior changes, or fork-alignment risk; and `P2` for unjustified drift, unrelated churn, or missing evidence.
- Do not hide local-only drift. A PR from the wrong base, wrong diff, or wrong artifact is release-risk work until the live state is audited.
- Verify remote URLs before fetch, push, compare, or release work. Local remote names are not proof of ownership.
- Treat `dev` and other shared long-lived fork branches as append-only. Do not rewrite published shared history without explicit emergency approval.
- Fork sync should merge upstream OpenCode `dev` into the fork default branch, or the reverse equivalent, then fast-forward push after the required public-mutation approval. Avoid restacking published commit series.

## Pull Requests And Public Artifacts

- Work from a named branch based on the mandated target branch. Build-impact changes must go through a pull request before reaching the fork default branch.
- Build-impact includes runtime code, packaging, release scripts, generated binaries, dependency manifests or lockfiles, CI/build workflows, and tests or harnesses that gate shipped behavior.
- Before opening or materially updating a pull request, check the live repo rules that apply to the touched change: `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/workflows/pr-standards.yml`, `.github/workflows/compliance-close.yml`, and relevant touched workflows.
- Pending GitHub checks, hosted reviews, unresolved PR comments, unresolved official review findings, and visible workflow blockers remain open work until fixed, rerun green, or classified as non-blocking with checked evidence.
- Keep private paths, internal task IDs, ledgers, work-in-progress review notes, and private chat context out of public repo policy, docs, issues, comments, PRs, release notes, and other public artifacts.

## Release And Binary Gates

- For any npm-published package in this repo, release follows this required order:
  1. Build the fresh local change.
  2. Install that local build globally so the user's normal command points to it.
  3. The user tests that local build by hand and gives explicit approval.
  4. Only then tag the release, create the GitHub Release, and publish to npm.
- Before release approval or any release safety claim, prove the exact release commit against the repo's release checks, the relevant `USER_FLOWS.md` flows, TUI harness checks when relevant, installed-build proof, and the human QA gate.
- No tag, GitHub Release, or npm publish may happen without a green Codex pre-release review of the exact release commit against the fork default branch.
- Regenerate and commit `bun.lock` on release work when package manifests, resolved dependencies, or generated package artifacts changed.
- For public release work, verify the exact release commit is reachable from the fork default branch and the target version is already present in the release input files before any public mutation.

## TypeScript And Runtime Shape

- Prefer Bun APIs where they fit, and use package-local scripts from `package.json` for validation.
- Run `bun typecheck` from the relevant package or repo root for TypeScript proof. Do not call `tsc` directly unless a package script requires it.
- Do not use `any`. Enforce declared types at boundaries instead of adding loose runtime fallbacks.
- In Effect code, follow the repo's existing `Effect.gen`, `Effect.fn`, `Context`, `Layer`, and `Schema` patterns before adding helpers or bypassing typed boundaries.
- In Drizzle schemas, use snake_case field names so column names do not need to be redefined as strings.
- In `src/config`, follow the existing self-export pattern at the top of the file when adding a config module, such as `export * as ConfigAgent from "./agent"`.

## Documentation

- User-facing docs should lead with the user benefit, point to the code files that match the behavior, and keep the shortest path to value obvious.
- Do not mention upstream fork origins in user-facing docs unless the user explicitly asks for that comparison.
- Before changing a user-visible TUI flow, read the TUI Product Doc and update the relevant docs or `USER_FLOWS.md` proof path in the same task when behavior changes.
- Docs-only and `FORK_CHANGELOG.md` edits do not need product QA, but default-branch mutation still needs explicit approval.

## References

- Fork Repo: `https://github.com/VRSEN/agentswarm-cli`
- Upstream Repo: `https://github.com/anomalyco/opencode`
- TUI Product Doc: `https://github.com/VRSEN/agency-swarm/blob/main/docs/core-framework/agencies/agent-swarm-cli.mdx`
