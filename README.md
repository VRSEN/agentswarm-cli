# Agent Swarm CLI

Agent Swarm CLI is a terminal app for running and testing Agency Swarm projects.
It is built on the OpenCode codebase, with Agent Swarm-specific packaging, branding, auth, and TUI flows.

The main user path is **Run mode**: start the TUI from an Agency Swarm project, authenticate a model provider, connect to the local Agency Swarm server, and send prompts to your agency.

## Install

```bash
npm install -g agentswarm-cli
agentswarm --version
```

Or run it without installing:

```bash
npx @vrsen/agentswarm
```

## Start

From an Agency Swarm project:

```bash
agentswarm .
```

You can also pass a project folder:

```bash
agentswarm /path/to/my-agency
```

On startup, the CLI can detect the project, prepare the project Python environment, start the local Agency Swarm server, and open the terminal UI.

## Main TUI Flows

- `/auth` manages OpenAI and Anthropic credentials used by Agency Swarm runs.
- `/connect` chooses a local or external Agency Swarm server.
- `/agents` switches the active swarm or agent from live Agency Swarm metadata.
- `/models` is limited in Run mode to providers that the Agency Swarm path supports.

Agent Builder and Plan are preserved from the OpenCode backbone, but they are currently hidden from the normal Run mode surface.

## Sharing

`/share` is still the upstream OpenCode share flow and currently posts to `https://opncd.ai`.
This is intentional for now, so users can keep using upstream-compatible session links while a fork-hosted share service is not available.

Do not share sessions that contain secrets, private code, private customer data, or credentials.

## Telemetry

Release builds may send privacy-safe product analytics to PostHog so maintainers can understand which Agent Swarm TUI features are used. Events cover app start, `/auth` provider setup, command usage for built-in commands, route changes, prompt submission shape, task success or failure, project initialization, and selected add-ons. They do not include prompt text, credentials, file paths, tool payloads, message content, raw model IDs, project IDs, session IDs, message IDs, source content, environment variables, raw error text, tool inputs, or tool outputs.

Set `OPEN_SWARM_TELEMETRY=0`, `AGENTSWARM_TELEMETRY=0`, or pass `--no-telemetry` to disable this telemetry.

Supported events and properties:

- `app_started`: `entrypoint`, `framework_mode`, `provider_id`.
- `provider_requested`: `provider_id`, `framework_mode`, `source`, `connected_before`.
- `provider_auth_started`: `provider_id`, `auth_method`, `framework_mode`, `source`.
- `provider_auth_configured`: `provider_id`, `auth_method`, `framework_mode`, `source`.
- `provider_auth_failed`: `provider_id`, `auth_method`, `framework_mode`, `source`, `step`, `error_bucket`.
- `ui_command_executed`: `category`, `command`, `keybind`, `source`.
- `ui_prompt_submitted`: `framework_mode`, `has_agent_parts`, `has_editor_selection`, `has_file_parts`, `mode`, `provider_id`, `type`.
- `task_succeeded`: `framework_mode`, `provider_id`, `mode`, `duration_bucket`, `has_agent_parts`, `has_file_parts`.
- `task_failed`: `framework_mode`, `provider_id`, `mode`, `duration_bucket`, `has_agent_parts`, `has_file_parts`, `error_bucket`.
- `ui_route_changed`: `route`, `to_route`.
- `project_initialized`: `source`, `vcs`.
- `integration_requested`: `provider_id`, `integration_id`, `source`, `already_configured`.

Dashboard metrics are derived from those events where possible. `first_run` and D1/D7/D30 retention cohorts use `app_started`; `sessions_per_user` counts `app_started`; `first_task_started` uses `ui_prompt_submitted` with `type=prompt`; `first_successful_task`, `time_to_first_success`, and `tasks_completed` use `task_succeeded`; docs clicks use `ui_command_executed` with `command=docs.open`; `provider_demand` uses provider requested, started, configured, and failed events.

Deferred telemetry includes agent run internals, generated artifacts, crashes, build or release failures, signup or demo funnels, book-demo flows, and Agent Swarm connect funnel metrics.

## Customizing Agent Swarm CLI

This repository is useful if you want to build a custom CLI for your own Agent Swarm distribution.
Keep these rules in mind:

- Keep fork-specific behavior small and easy to audit.
- Prefer reusing upstream OpenCode mechanisms over copying or rewriting them.
- Keep Agent Swarm-specific code in clearly named modules when that does not make the code worse.
- Update `FORK_CHANGELOG.md` when you intentionally keep behavior that differs from upstream.
- Update `USER_FLOWS.md` when a user-facing flow changes.
- Run the Agent Swarm-specific TUI tests before publishing your own build.

## Development

Install dependencies:

```bash
bun install
```

Run focused tests from the package you changed:

```bash
cd packages/opencode
bun test test/cli/tui
```

Run type-checks before pushing:

```bash
bun typecheck
```

Run the contained Agent Swarm TUI e2e suite when TUI behavior changes:

```bash
cd packages/opencode
bun run test:agentswarm:e2e
```

## Relationship To OpenCode

Agent Swarm CLI is a fork of OpenCode. OpenCode remains the upstream foundation for the TUI, session model, command system, and many developer workflows.

The fork keeps the MIT license and preserves the upstream copyright notice. Fork-specific changes are tracked in `FORK_CHANGELOG.md` so the project can keep merging upstream safely.

## Links

- Agent Swarm CLI repository: <https://github.com/VRSEN/agentswarm-cli>
- Agency Swarm docs: <https://agency-swarm.ai/>
- Upstream OpenCode repository: <https://github.com/anomalyco/opencode>
- npm package: <https://www.npmjs.com/package/agentswarm-cli>
