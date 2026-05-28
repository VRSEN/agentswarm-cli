---
name: manual-qa-binary-proof
description: Own manual QA scripts and user-testable binary proof for functional AgentSwarm CLI changes before approval, merge, or release.
---

# Manual QA And Binary Proof

Use this skill for functional AgentSwarm CLI changes before asking the user to test, approve, merge, or release the change.

Functional changes alter runtime behavior, user-visible flows, build, install, release, API, schema, generated shipped artifacts, or tests that gate shipped behavior. Non-functional changes do not use this skill unless they need a manual repro path; they still need a clean Codex review before approval under `AGENTS.md`.

## Owner

The manual QA owner prepares the final user-testable proof package. Other workers may run checks, but this owner is responsible for the binary handoff and QA script.

## Required Proof

1. Record the exact branch plus commit or dirty working-tree state being tested.
2. Record logical/static proof separately: types, contracts, invariants, diff reasoning, or relevant static checks.
3. Run the smallest automated checks that match the touched surface, then broaden only when the risk requires it.
4. Build the exact local AgentSwarm CLI binary from that state, or install the local build so the user's normal `agentswarm` command points to it.
5. Write a manual QA script with prerequisites, setup, reset or cleanup, exact user steps, expected results, and evidence to capture.
6. Record empirical proof separately: automated checks, build and install commands, the binary path or command the user will run, minimal smoke output such as `agentswarm --version`, and the manual QA script.
7. Stop before approval if either proof section, the binary, checks, or manual QA script cannot be produced.

Do not substitute a source checkout, dev server, or theoretical command for the user-testable binary without explicit user approval.
