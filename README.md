# Agent Swarm CLI

Agent Swarm CLI is a terminal app for running and testing Agency Swarm projects.
It is built on the OpenCode codebase, with Agent Swarm-specific packaging, branding, auth, and TUI flows.

The main user path is **Run mode**: start the TUI from an Agency Swarm project, authenticate a model provider, connect to the local Agency Swarm server, and send prompts to your agency.

## Install

```bash
npm install -g agentswarm-cli
agentswarm --version
```

Other package managers can run the same published npm package:

```bash
bun install -g agentswarm-cli
pnpm add -g agentswarm-cli
yarn global add agentswarm-cli
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
