# Agent Swarm Terminal TUI E2E Coverage

Source of truth: `FORK_CHANGELOG.md` defines intentional fork behavior, and `USER_FLOWS.md` defines release QA flows. This harness covers only Agent Swarm fork behavior and stays outside upstream app Playwright tests.

## Automated

- `FORK_CHANGELOG.md` CLI/TUI UX: `/auth` and `/connect` stay separate in the real terminal UI.
- `FORK_CHANGELOG.md` CLI/TUI UX: Run mode hides native `/editor`, `/variants`, `/init`, and `/review` slash commands.
- `FORK_CHANGELOG.md` CLI/TUI UX: `/agents` uses Swarm and agent wording against an Agency Swarm TUI-demo-shaped swarm.
- `FORK_CHANGELOG.md` CLI/TUI UX: selecting a swarm row clears stale explicit agent routing before the next prompt.
- `FORK_CHANGELOG.md` CLI/TUI UX: selecting a specific agent routes the next prompt to that agent.
- `FORK_CHANGELOG.md` Agency Swarm Integration: prompt submit reaches a local Agency Swarm protocol server with the configured agent.
- `FORK_CHANGELOG.md` Agency Swarm Integration: ordinary `SendMessage` delegation with `recipient_agent` does not switch the user's active recipient.
- `FORK_CHANGELOG.md` Agency Swarm Integration: nested `SendMessage` handoff-like metadata does not switch the user's active recipient.
- `FORK_CHANGELOG.md` Agency Swarm Integration: `transfer_to_*` handoff events switch control to the target agent for the next turn.
- `FORK_CHANGELOG.md` Agency Swarm Integration: `agent_updated_stream_event` handoffs without separate transfer tool parts switch control to the target agent.
- `USER_FLOWS.md` Auto-Start Detected Local Project: launcher mode shows the detected-project choice before `.venv` work begins.

## Manual Gap

Full cold-start `.venv` creation and repair intentionally stays manual because the deterministic CI path cannot depend on Python 3.12 availability, network package install, or the live `agency-swarm[fastapi,litellm]` package.

Manual QA command from a clean detected Agency project with no `.venv`:

```sh
AGENTSWARM_LAUNCHER=1 bun --cwd packages/opencode --conditions=browser ./src/index.ts /absolute/path/to/project
```

Expected result: choose `Use detected Agency Swarm project`, approve `.venv` creation, verify the local FastAPI bridge starts, and verify the TUI opens in Run mode against the detected project.
