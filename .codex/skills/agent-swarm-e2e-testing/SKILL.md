---
name: agent-swarm-e2e-testing
description: Use when designing, running, or reviewing Agent Swarm fork E2E, release QA, TUI automation, starter-template, agency.py, or handoff behavior proof.
---

# Agent Swarm E2E Testing

Use this skill for Agent Swarm fork behavior that reaches the terminal UI, launcher, local Agency project, Agency Swarm bridge, or handoff routing.

## Sources

- Prime from `FORK_CHANGELOG.md` for approved fork divergence.
- Prime from `USER_FLOWS.md` for release flows and expected user outcomes.
- Keep fork E2E coverage under `e2e/agent-swarm-tui` and separate from upstream OpenCode tests.

## Proof Gate

- Do not call Agent Swarm fork behavior fixed, release-ready, or regression-closed unless proof drives the real terminal UI through automated E2E or manager-driven manual automation.
- Treat unit tests, adapter tests, protocol-only fixtures, and direct model payload checks as supporting evidence only.
- If automation cannot prove the behavior at 100% confidence, stop and escalate user manual QA as the last resort.

## Real Project Rule

1. Start from a copied real `agency-ai-solutions/agency-starter-template` checkout or a real project containing `agency.py`.
2. Launch the TUI with the exact absolute project path being tested.
3. Keep fixture servers and mocked protocol frames out of the proof path unless the test also exercises a real project launch and TUI flow.
4. Record which `FORK_CHANGELOG.md` behavior or `USER_FLOWS.md` flow the proof covers.

## Handoff Rule

- Handoff tests must use real Agency Swarm handoff semantics: a `transfer_to_*` event transfers and persists control for later turns.
- `SendMessage` is delegation, not handoff. It must not be used as handoff proof and must not switch the user's active recipient.
- Tests that compare handoff and delegation should assert both the immediate event and the next-turn recipient.

## Review Checklist

- The test is fork-owned and not mixed into upstream OpenCode coverage.
- The command or harness passes the same project path a user would pass to `agentswarm`.
- The proof observes the real TUI state or terminal output, not only serialized payloads.
- Any remaining manual QA request names the exact behavior, build or command, project path, and blocker.
