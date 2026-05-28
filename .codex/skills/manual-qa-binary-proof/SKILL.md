---
name: manual-qa-binary-proof
description: Use only for functional agentswarm-cli proof work that needs a final user-testable proof package before approval, merge, or release.
---

# Manual QA Binary Proof

Use this skill only for functional `agentswarm-cli` proof work.

Functional changes affect runtime behavior, TUI or other user-visible flows, build, install, release, API or schema contracts, generated shipped artifacts, shipped package surfaces, or tests and harnesses that gate shipped behavior.

Do not use this skill for policy, docs, comments, naming, formatting, or behavior-preserving refactors unless the user explicitly asks for functional proof.

## Proof Package

Prepare one final user-testable proof package. Keep it in the report unless the mandate allows an artifact file.

It must include:

1. Branch and commit state: branch, HEAD SHA, and whether the tree is clean. If dirty, list the changed files included in proof.
2. Shipped-surface identification: map touched files to affected surfaces such as CLI/npm package, TUI, desktop, web, SDK, plugin, server/API/schema, release/build/install, generated artifacts, or behavior-gating tests. Mark untouched shipped surfaces out of scope.
3. Logical/static proof: diff reasoning, invariants, compatibility checks, type/schema/static analysis, and why the shipped surface still matches its contracts.
4. Automated checks: commands and outcomes for checks that match the touched surfaces, plus why those checks cover the change.
5. Exact local build/install proof for affected user-testable surfaces. For CLI or npm changes, build and install from the exact local `agentswarm-cli` package that ships the `agentswarm` binary, normally `packages/opencode`; record package path, name, version, build command, install command, `command -v agentswarm`, and proof the resolved binary comes from the local build.
6. Installed entry-point smoke. When the CLI is touched, run installed `agentswarm --help` or an equivalent installed-entry smoke, and include `agentswarm --version` when relevant. For desktop, web, SDK, plugin, or other shipped surfaces, run user-testable proof that matches that surface instead of CLI-only proof.
7. Empirical proof: automated check output, build and install logs, installed entry-point output, screenshots or terminal logs when UI or TUI behavior changed, and any reset or cleanup used.
8. Manual QA script: prerequisites, setup, exact user steps, expected result for each step, evidence to capture, and cleanup or reset.

## Hard Stop

Stop before asking for approval if branch or commit state, logical/static proof, matching automated checks, shipped-surface install/build proof, installed `agentswarm --help` or equivalent smoke, empirical proof, or the manual QA script cannot be produced.

Do not substitute a source checkout, dev server, environment-variable override, or theoretical command for installed user-testable proof without explicit user approval.
