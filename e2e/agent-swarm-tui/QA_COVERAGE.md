# Agent Swarm Terminal TUI E2E Coverage

`USER_FLOWS.md` is the release QA source of truth. `FORK_CHANGELOG.md` defines approved fork deltas. This file only records which terminal E2E checks currently automate parts of those flows and which launcher work remains manual.

## Automated

- `USER_FLOWS.md` Detected Local Project: launcher mode shows the detected-project choice before `.venv` work begins.
- `USER_FLOWS.md` Startup `/auth` and In-TUI `/connect`: `/auth` and `/connect` stay separate in the real terminal UI.
- `USER_FLOWS.md` Run Mode: native `/editor`, `/variants`, `/init`, and `/review` slash commands stay hidden.
- `USER_FLOWS.md` Run Mode: `/agents` uses Swarm and agent wording, live agency labels, swarm-row routing, and specific-agent routing against an Agency Swarm TUI-demo-shaped swarm.
- `USER_FLOWS.md` Run Mode: prompt submit reaches a local Agency Swarm protocol server with the configured agent.
- `USER_FLOWS.md` Run Mode: bracketed-paste image paths reach the local Agency Swarm protocol server as structured Responses `message` content.
- `USER_FLOWS.md` Run Mode: ordinary and nested `SendMessage` delegation does not switch the user's active recipient.
- `USER_FLOWS.md` Run Mode: `transfer_to_*`, top-level handoff, and `agent_updated_stream_event` handoffs switch control to the target agent for the next turn.
- Harness setup: a copied real `agency.py` project path plus deterministic protocol server proves the same Run Mode delegation and handoff semantics without claiming launcher or Python bridge startup coverage.

## Manual Gap

Full launcher project preparation, cold-start `.venv` creation, Python bridge execution, and live LLM decisions intentionally stay manual because the deterministic CI path cannot depend on Python 3.12 availability, network package install, live credentials, or the live `agency-swarm[fastapi,litellm]` package. The real-project automated handoff test copies a real `agency.py` project and launches the TUI directly with that exact project path plus file config for a local protocol server, so it proves project-path wiring and handoff semantics without claiming launcher or Python bridge startup coverage.

Manual QA command from a clean detected Agency project with no `.venv`:

```sh
AGENTSWARM_LAUNCHER=1 bun --cwd packages/opencode --conditions=browser ./src/index.ts /absolute/path/to/project
```

Expected result: choose `Use detected Agency Swarm project`, approve `.venv` creation, verify the local FastAPI bridge starts, and verify the TUI opens in Run mode against the detected project.
