<p align="center">
  <a href="https://github.com/VRSEN/agentswarm-cli">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Agent Swarm CLI logo">
    </picture>
  </a>
</p>
<p align="center">Terminal UI for agency-swarm.</p>

> [!NOTE]
> This repository is the private `agentswarm-cli` fork used to ship Agency Swarm integration on top of the OpenCode TUI.
> Keep OpenCode client/server contracts intact while extending the runtime under `packages/opencode/src/agency-swarm/`.

## Agency Swarm Integration Notes

- Agency Swarm runtime integration is limited to the existing FastAPI endpoints:
  - `get_metadata`
  - `get_response_stream`
  - `cancel_response_stream`
  - `get_response`
- OpenCode session/message/event contracts remain the UI source of truth. Agency frames are translated into standard processor stream parts (`text-*`, `reasoning-*`, `tool-*`, `finish-step`, `finish`) before persistence.
- Provider-specific logic should not bypass `SessionProcessor` with direct message writes.
- `chat_history` is required by the current Agency API contract, so a transport sidecar is maintained in `packages/opencode/src/agency-swarm/history.ts`. This is request continuity state, not a replacement for OpenCode session storage.
- Recipient-agent routing is validated against live `get_metadata` on each turn before `recipient_agent` is sent. Stale saved recipients are ignored instead of causing 422 failures.

<p align="center">
  <a href="https://www.npmjs.com/package/agentswarm-cli"><img alt="npm" src="https://img.shields.io/npm/v/agentswarm-cli?style=flat-square" /></a>
  <a href="https://github.com/VRSEN/agentswarm-cli"><img alt="GitHub" src="https://img.shields.io/badge/github-VRSEN%2Fagentswarm--cli-black?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a>
</p>

[![Agent Swarm CLI Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli)

---

### Installation

```bash
npm i -g agentswarm-cli

# Then run
agentswarm
```

If you are using the Python framework, do not install the CLI separately. Install `agency-swarm` and call `agency.terminal_demo()` instead. The framework will provision the matching terminal binary automatically.

### Agents

The TUI includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

### Documentation

For the current product workflow, use the `agency-swarm` docs:

- [Agent Swarm CLI](https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli)
- [Running an Agency](https://agency-swarm.ai/core-framework/agencies/running-agency)
- [API Reference](https://agency-swarm.ai/references/api)

### Local Development

Run the TUI fork locally:

```bash
bun install
bun dev .
```

For the normal product path, develop against `agency-swarm` and let Python own the launch flow:

```bash
cd ../agency-swarm
uv sync
uv run python examples/interactive/terminal_demo.py
```

To work on the TUI against a manually started backend:

```bash
cd ../agency-swarm
uv sync
uv run python examples/fastapi_integration/server.py
```

Then start this repo with `bun dev .` and use `/connect` to attach to `http://127.0.0.1:8080`.

### Contributing

If you're contributing to this fork, keep Agency Swarm-specific behavior under `packages/opencode/src/agency-swarm/` where possible and keep shared OpenCode contracts syncable with upstream.

---
