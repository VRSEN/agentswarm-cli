---
name: test-workflow
description: Use when selecting, writing, reviewing, running, or weighing tests, E2E coverage, manual QA, installed-build proof, release proof, live-service validation, and version/path-cache proof in agentswarm-cli.
---

# Test Workflow

Use this skill for test strategy, test edits, focused validation, release proof, QA evidence, and deciding whether evidence proves the changed behavior.

## Source Order

- Binding user words are the highest source of truth.
- Ground docs, QA claims, and test expectations in user words, inspected code, `USER_FLOWS.md`, `FORK_CHANGELOG.md`, existing tests, logs, screenshots, or live behavior.
- Do not invent docs, coverage claims, flows, failures, or manual QA steps that are not grounded in checked evidence.
- Ask when a required behavior, source, credential, artifact, or proof target remains unclear after bounded inspection.

## Proof Selection

- Define the changed behavior boundary before choosing proof: local logic, process boundary, API or transport boundary, persistence, startup, CLI/app wiring, streaming, TUI, release, or user workflow.
- Default to test-driven work for runtime behavior when feasible.
- Unit tests prove local logic. Keep them offline, deterministic, and based on realistic minimal objects.
- Integration or E2E tests prove behavior that crosses process, API, transport, persistence, startup, CLI/app wiring, streaming, workspace, or runtime boundaries.
- Unit tests are not acceptable proof for pure integration behavior.
- Pull-request checks and unit tests are useful evidence, but they do not replace end-user proof when the report came from a user-visible flow.
- When persisted state, queued work, history, fork-only metadata, SDK payloads, UI state, or similar internal state crosses a process, API, or transport boundary, prove both local behavior and the exact serialized outbound payload or boundary contract.
- For docs-only or formatting-only edits, use a formatter or linter instead of runtime tests.
- Do not continue if a required command fails.

## Bug Proof

- Reproduce the reported failure before fixing it.
- Add or extend an automated test that fails for the report before runtime code changes.
- Rerun the exact failed flow against the same kind of build or artifact and starting state before calling the bug fixed.
- TUI and visual bugs need a real screenshot or rendered terminal frame from the installed or user-visible build; text-only dumps do not close visual bugs.
- CLI bugs need the exact command against the released build or a fresh install.
- Do not claim a fix is done, and do not close a requirement, until end-user proof exists and is cited.

## User Flow Coverage

- Read the relevant `USER_FLOWS.md` and `FORK_CHANGELOG.md` sections when fork behavior, release QA, or a listed user flow is touched.
- Every `USER_FLOWS.md` flow should have automated E2E coverage or a documented manual QA path.
- Record terminal TUI coverage and manual gaps in `e2e/agent-swarm-tui/QA_COVERAGE.md` unless another checked-in source already owns that flow.
- If a changed flow lacks E2E coverage and no honest manual QA path can be documented inside the mandate, stop and escalate with the missing flow and why it cannot be proven.
- Keep Agent Swarm-specific coverage named and mapped to `FORK_CHANGELOG.md` or `USER_FLOWS.md` when feasible so upstream test drift cannot hide fork regressions.

## Agent Swarm TUI E2E

Use the checked-in terminal harness for Agent Swarm TUI behavior, especially Run mode, `/agents`, `/auth`, `/connect`, handoffs, queued prompts, attachment-visible flows, launcher startup, and release QA that needs terminal evidence.

Read only the relevant bounded files before acting:

- `e2e/agent-swarm-tui/terminal-tui.test.ts` for covered user flows and assertions.
- `e2e/agent-swarm-tui/harness.ts` for the canonical PTY harness, environment isolation, fake Agency Protocol server, and terminal screen model.
- `e2e/agent-swarm-tui/QA_COVERAGE.md` for automated coverage and manual gaps.
- `USER_FLOWS.md` for release QA flow intent when a change affects a listed fork flow.

If these files are missing or do not cover the requested behavior enough to build a reliable test or QA step, stop and escalate instead of inventing a workflow.

Agent Swarm TUI proof rules:

- Add or extend a terminal E2E test when a change affects a listed Agent Swarm TUI user flow.
- Prefer extending `e2e/agent-swarm-tui/terminal-tui.test.ts` and `harness.ts` over adding a new harness.
- Agent Swarm TUI fixes need real automated TUI evidence against a real Agency Swarm swarm when feasible.
- Handoff fixes especially need proof that the handoff path works, or a recorded blocker explaining why real-swarm proof was not feasible.
- Prove routing behavior at the protocol boundary by asserting captured request bodies, not only rendered text.
- For slash commands and pickers, assert user-visible text and hidden native commands when filtering matters.
- For launcher cold-start, use the documented manual gap unless the test can avoid live Python package installs and live credentials.

Canonical harness facts:

- Start the real terminal UI through `packages/opencode/src/index.ts` with Bun and browser conditions.
- Use a PTY sized `100` columns by `30` rows with `TERM=xterm-256color` and `CI=1`.
- Isolate `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `OPENCODE_CONFIG_DIR`, `OPENCODE_TEST_HOME`, and `OPENCODE_TEST_MANAGED_CONFIG_DIR` under a temporary root.
- Disable unrelated runtime behavior with `OPENCODE_DISABLE_AUTOUPDATE=true`, `OPENCODE_DISABLE_DEFAULT_PLUGINS=true`, `OPENCODE_DISABLE_MODELS_FETCH=true`, `OPENCODE_DISABLE_PROJECT_CONFIG=true`, and `OPENCODE_PURE=1`.
- Use the fixture models file at `packages/opencode/test/tool/fixtures/models-api.json`.
- Scrub parent provider credentials before the TUI process starts.
- Drive the UI through real keyboard or mouse-level controls for the terminal surface, then assert on normalized screen text and raw history tail.
- Close the PTY with Ctrl-C, then `SIGTERM`, then `SIGKILL` only if needed.

For deterministic Agent Swarm TUI tests, prefer the in-process Bun server pattern from `harness.ts`: serve `/openapi.json`, `/<agency>/get_metadata`, `/<agency>/get_response_stream`, and `/<agency>/cancel_response_stream`; capture request bodies; stream SSE events with `meta`, `data`, `messages`, and `end` events as needed. For handoffs, use the TUI-demo-shaped fixture from `harness.ts` and assert the next turn routes to the transferred agent without replaying fork-only internal markers such as `handoff_output_item`.

## Test Writing

- Keep each test function about 100 lines or less.
- Test behavior, not private implementation details, unless the private boundary is the only reliable proof target.
- Use real framework objects and the real implementation when practical.
- Avoid mocks unless they isolate an external dependency that is not the behavior under test.
- Do not copy production logic into tests.
- Prefer extending nearby tests over adding new test files unless nearby tests cannot cleanly cover the behavior.
- Do not duplicate the same proof across unit and integration levels.
- Retire unit tests that hide gaps in real behavior.
- Use precise assertions in one clear order; avoid OR logic in assertions.
- Use stable, descriptive test names.
- Use isolated file systems and temporary directories.
- Avoid hardcoded temp paths or ad-hoc directories.
- Avoid slow or hanging tests. If a skip is necessary, leave a clear `FIXME`.
- Remove dead code you find while testing when it is in scope.
- Do not claim to fix flakiness unless you observed and documented the flake.
- Aim for 90% test coverage or better when coverage is in scope.

## Commands And Credentials

- Use Bun and repo package scripts. Do not use global interpreters or absolute paths when repo tooling can run the check.
- For long-running commands, use timeouts that match the real wait window instead of stopping early.
- Run tests from the touched package or its package script. Never run root `bun test`.
- Run the smallest high-signal focused command first.
- For package tests, start from the package directory, for example `cd packages/<pkg> && bun test <target>`.
- For runtime or behavior changes, run all related behavior you touched before commit, pull request, merge, release, or a done claim.
- Format touched files before each commit: `bun x prettier --write <paths>`.
- Type-check before staging or committing: `bun typecheck`.
- Run `bun turbo test:ci` before build-impact pull requests, merges, releases, or repo-wide health claims. Docs-only and policy-only changes use formatter and diff checks unless a live PR gate requires more.
- For focused Agent Swarm TUI E2E, run from `packages/opencode`: `bun test --timeout 180000 --max-concurrency=1 ../../e2e/agent-swarm-tui`.
- Use `bun run test:agentswarm:e2e` for CI-shaped Agent Swarm TUI E2E when needed.
- For provider-specific integrations or live services, run full related coverage when needed credentials exist; key-based skips are not proof.
- If planned validation needs a real LLM or live service, verify credentials and access before asking the user for keys or permission.

## Manual QA

- Use manual QA only when automation cannot honestly prove the user path within the mandate or when the release gate requires the user to test the local build.
- Write the manual QA target before running it: artifact, command, environment, starting state, expected visible result, and failure evidence to capture.
- Manual QA for TUI or visual behavior must capture a screenshot or rendered terminal frame from the installed or user-visible build.
- Manual QA does not replace automated coverage when the behavior is stable enough to test.
- Record any manual gap in the checked-in owner for that flow, such as `e2e/agent-swarm-tui/QA_COVERAGE.md`, or escalate if no owner exists.

## Installed Binary And Version Proof

- Before saying a local installed binary is updated, verify from a fresh shell that the exact command the user will run resolves to the expected binary path and version.
- Check all likely command names and wrappers for this repo, including `agentswarm`, `openswarm`, `opencode`, `npx`, `bunx`, package-manager shims, shell hash tables, and cached binaries when they can affect the user command.
- Prove that no package manager, cache, PATH entry, symlink, or wrapper returns an older published version.
- Record the resolved command path, version output, package source when relevant, and the fresh-shell command used.
- If a wrapper or package manager still resolves to an older published version, do not claim the local install is updated; fix the install path or escalate with the exact stale resolver.

## Release Proof

- Before release approval, prove the exact release commit satisfies the live repo gates and relevant workflow runs for its ref, or their local equivalents when GitHub cannot run them.
- Required local release proof includes `bun typecheck`, `bun turbo test:ci`, app E2E, Agent Swarm E2E when relevant, auth smoke when configured, and repo-specific release or publish workflow requirements.
- Before any release or safety claim, build and reinstall the CLI from the fresh local build so the user's normal command points to it.
- Verify installed binary and version proof from a fresh shell before handing the build to the user.
- Launch the fresh CLI against the maintainer's canonical local test agency, send a real first message through the connected conversation, and verify that a non-empty streaming assistant response renders.
- Auth-smoke CI alone never passes the release proof gate.
- Any launch failure blocks release proof until the root cause is reproduced.
