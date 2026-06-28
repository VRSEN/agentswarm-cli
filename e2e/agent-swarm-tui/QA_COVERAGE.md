# Agent Swarm Terminal TUI E2E Coverage

`USER_FLOWS.md` is the release QA source of truth. `FORK_CHANGELOG.md` defines approved fork deltas. This file only records which terminal E2E checks currently automate parts of those flows and which launcher work remains manual.

## Automated

- `USER_FLOWS.md` Detected Local Project: launcher mode shows startup project-file checking, the detected-project choice before `.venv` work begins, unreadable `agency.py` recovery choices, and Agent Swarm connect copy.
- `USER_FLOWS.md` Startup `/auth` and In-TUI `/connect`: `/auth` and `/connect` stay separate in the real terminal UI.
- `USER_FLOWS.md` Run Mode: native `/editor`, `/variants`, `/init`, and `/review` slash commands stay hidden.
- `USER_FLOWS.md` `/modes`, Build, and Plan: `/modes` appears as the product switch, Build and Plan work without an Agency Swarm server, restore native `/review` and `/init`, keep `/compact` and shell-command reopen flows on OpenCode routing, and switching back to Run hides native commands again.
- `USER_FLOWS.md` `/modes`, Build, and Plan: users can repair or change a swarm in Build, return to Run, and verify the fixed swarm; users can also recover from a failed Run attempt by switching to Build, then back to Run for a successful response.
- `USER_FLOWS.md` `/modes`, Build, and Plan: when the Run server is unreachable, the reconnect UI appears and the user can switch to Build for a server-free repair prompt.
- `USER_FLOWS.md` `/modes`, Build, and Plan: Tab switches OpenCode agents in Build and Plan, and Agency Swarm targets in Run.
- `USER_FLOWS.md` `/modes`, Build, and Plan: native Plan approval keeps keyboard input on the approval question, switches to Build after approval, and keeps the approved Build follow-up off the Agency Swarm server.
- `USER_FLOWS.md` `/modes`, Build, and Plan: mixed-mode message actions keep Run undo/redo surfaces hidden while preserving native Build redo.
- `USER_FLOWS.md` Run Mode: the sidebar shows the selected swarm and main/subagent counts; `/agents` uses Swarm and agent wording, live agency labels, swarm-row routing, and specific-agent routing against an Agency Swarm TUI-demo-shaped swarm.
- `USER_FLOWS.md` Run Mode: prompt submit reaches a local Agency Swarm protocol server with the configured agent.
- `USER_FLOWS.md` Run Mode: simulated visible OpenAI model state does not pull prompts, slash-command `/new`, run-session local-project marking, `/connect`, or runtime auth recovery out of Agency Swarm routing.
- `USER_FLOWS.md` Run Mode: bracketed-paste image paths reach the local Agency Swarm protocol server as structured Responses `message` content.
- `USER_FLOWS.md` Run Mode: ordinary and nested `SendMessage` delegation does not switch the user's active recipient.
- `USER_FLOWS.md` Run Mode: `transfer_to_*`, top-level handoff, and `agent_updated_stream_event` handoffs switch control to the target agent for the next turn, and a default single-swarm handoff shows the target agent as active in the sidebar.
- Harness setup: a copied real `agency.py` project path plus deterministic protocol server proves the same Run Mode delegation and handoff semantics without claiming launcher or Python bridge startup coverage.

## Manual Gap

Full launcher project preparation, cold-start `.venv` creation, Python bridge execution, and live LLM decisions intentionally stay manual because the deterministic CI path cannot depend on Python 3.12 availability, network package install, live credentials, or the live `agency-swarm[fastapi,litellm]` package. The real-project automated handoff test copies a real `agency.py` project and launches the TUI directly with that exact project path plus file config for a local protocol server, so it proves project-path wiring and handoff semantics without claiming launcher or Python bridge startup coverage.

OpenAI browser/headless auth-method picker visibility remains manual because the deterministic terminal E2E disables default plugins and only exposes API-key auth in the isolated provider catalog. The local unit test for `getVisibleProviderAuthMethods` owns the filter behavior until a plugin-enabled terminal harness exists.

Full replacement-server reconnect after a dead Run server remains manual or future harness work because the current deterministic terminal harness can prove the reconnect UI and Build fallback, but selecting and validating a replacement server through the live `/connect` dialog would need brittle cursor navigation or new harness support.

Manual QA command from a clean detected Agency project with no `.venv`:

```sh
AGENTSWARM_LAUNCHER=1 bun --cwd packages/opencode --conditions=browser ./src/index.ts /absolute/path/to/project
```

Expected result: choose `Use detected Agent Swarm project`, approve `.venv` creation, verify the local FastAPI bridge starts, and verify the TUI opens in Run mode against the detected project.
