# State Of The Fork

This file is the canonical, state-only description of the maintained fork delta from `origin/dev` to `vrsen/dev`.
It records only behavior and files that still exist on `vrsen/dev`. Reverted work, merge history, and user decision history are intentionally omitted.

## Baseline

- `origin/dev`: `d6dea3f3e00598a734d2fb61dbc9d74ccbd1781c`
- `vrsen/dev`: `e0259d7fd25d77990214b46d5c6b4dce0c62a40f`
- `git rev-list --left-right --count origin/dev...vrsen/dev`: `752 247`

## Maintained Fork Delta

### Distribution And Launch

- **The published product is `agentswarm-cli` / `agentswarm`, not upstream OpenCode.**
  Files: `packages/opencode/package.json`, `packages/opencode/bin/{agentswarm,agentswarm-npx}`, `packages/opencode/script/{build.ts,postinstall.mjs,publish.ts,auth-smoke-test.py}`, `packages/opencode/Dockerfile`, `install`, `bun.lock`, `packages/opencode/src/agency-swarm/{brand.ts,product.ts}`, `packages/opencode/src/cli/{logo.ts,error.ts}`, `packages/opencode/src/cli/cmd/{run.ts,serve.ts,agent.ts,mcp.ts,plug.ts,pr.ts,providers.ts,web.ts}`, `packages/opencode/src/{agent/display.ts,flag/flag.ts,global/index.ts}`, `README.md`.
  Why: the fork was created to ship a VRSEN-owned Agent Swarm CLI with fork-owned package names, commands, URLs, install paths, and release plumbing instead of anomalyco/opencode metadata.
  Upstream merge impact: high because upstream frequently changes package metadata, wrappers, installer text, public copy, and release scripts.

- **Launcher mode bootstraps, repairs, and reconnects Agency Swarm projects before the TUI opens.**
  Files: `packages/opencode/src/agency-swarm/{npx.ts,server-launcher.ts,run-session.ts}`, `packages/opencode/src/config/{config.ts,paths.ts}`, `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/{uninstall.ts,upgrade.ts}`, `packages/opencode/test/agency-swarm/npx.test.ts`, `packages/opencode/test/{installation/source-install-wrapper.test.ts,config/config.test.ts}`.
  Why: users wanted the launcher to detect an existing Agency Swarm project, create or connect a starter project, heal a broken `.venv`, rerun the canary after dependency installs, and resume local runs without manual setup steps.
  Upstream merge impact: high because this is fork-only pre-TUI orchestration that upstream does not carry.

### Agency Swarm Runtime

- **Prompt execution goes through a fork-owned Agency Swarm adapter layer for discovery, metadata parsing, stream transport, cancellation, and tool-call translation.**
  Files: `packages/opencode/src/agency-swarm/{adapter.ts,client-config.ts,tui.ts}`, `packages/opencode/src/provider/provider.ts`, `packages/opencode/src/session/{agency-swarm.ts,agency-swarm-utils.ts,index.ts,processor.ts,prompt.ts}`, `packages/opencode/src/index.ts`, `packages/opencode/test/agency-swarm/{adapter.test.ts,client-config.test.ts,tui.test.ts}`, `packages/opencode/test/provider/agency-swarm-provider.test.ts`, `packages/opencode/test/session/{agency-swarm.test.ts,agency-swarm-utils.test.ts,prompt.test.ts,prompt-effect.test.ts}`.
  Why: the fork exists to drive Agency Swarm backends from the OpenCode client, including agency discovery, recipient routing, streamed responses, structured tool events, and cancellation.
  Upstream merge impact: high because these are hot core paths and upstream has no equivalent Agency Swarm abstraction.

- **History rebuild, run-session recovery, transcript export, and chat compaction are fork-client responsibilities, not backend behavior.**
  Files: `packages/opencode/src/agency-swarm/{history.ts,run-session.ts}`, `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/cli/cmd/tui/util/transcript.ts`, `packages/opencode/test/agency-swarm/{history.test.ts,run-session.test.ts}`, `packages/opencode/test/cli/tui/transcript.test.ts`.
  Why: users wanted local Agency Swarm sessions to survive port changes, resume correctly, keep caller-agent context, and preserve compacted transcript state even when the local bridge is restarted.
  Upstream merge impact: high because this local state logic lives inside session flow that upstream also changes often.

- **The fork keeps a temporary client-side guard that strips Codex OAuth `base_url` from mixed-provider Agency Swarm requests.**
  Files: `packages/opencode/src/session/agency-swarm.ts`, `packages/opencode/src/agency-swarm/litellm-provider.ts`, `packages/opencode/test/session/agency-swarm.test.ts`.
  Why: users hit Anthropic and other non-OpenAI LiteLLM failures when upstream Agency Swarm applied Codex `client_config.base_url` to every provider, so the fork now filters that payload before transport.
  Upstream merge impact: low because the change is narrowly scoped and can be removed once upstream fixes provider-scoped `base_url`.
  Known tradeoff: until upstream agency-swarm scopes `client_config.base_url` per provider, the fork may strip Codex OAuth fields conservatively when agency metadata exposes non-OpenAI models.

### TUI Workflow

- **Run mode has fork-owned auth, connect, reconnect, model gating, recipient selection, and first-send recovery behavior.**
  Files: `packages/opencode/src/cli/cmd/agencii.ts`, `packages/opencode/src/cli/cmd/tui/app.tsx`, `packages/opencode/src/cli/cmd/tui/component/{dialog-agent.tsx,dialog-model.tsx,dialog-provider.tsx,prompt/index.tsx,startup-loading.tsx}`, `packages/opencode/src/cli/cmd/tui/context/{agency-swarm-connection.tsx,helper.tsx,local.tsx,sync.tsx}`, `packages/opencode/src/cli/cmd/tui/{plugin/runtime.ts,routes/session/{footer.tsx,index.tsx,permission.tsx,sidebar.tsx},session-error.ts,thread.ts,util/{agency-target.ts,provider-auth.ts}}`, `packages/opencode/test/cli/{agencii.test.ts,tui/**}`.
  Why: users wanted `/auth` and `/connect` to be actionable in Agency Swarm framework mode, dead local bridges to prompt reconnect, auth failures to reopen the right dialog, Run mode to target real agency recipients, and the first prompt to reach the session screen without freezing.
  Upstream merge impact: high because these changes sit in active TUI dialog, session, and composer code.

- **The built-in Builder and Plan agents are retuned for Agency Swarm repos and terminology.**
  Files: `packages/opencode/src/session/{agent-builder.ts,agent-planner.ts}`, `packages/opencode/src/session/prompt/{agent-builder.txt,agent-planner.txt}`, `packages/opencode/src/tool/{plan.ts,plan-exit.txt}`, `packages/opencode/src/command/template/initialize.txt`, `packages/opencode/test/session/{agent-builder.test.ts,agent-planner.test.ts}`.
  Why: users wanted the fork’s local helpers to generate Agent Swarm-specific agent plans, templates, and repo instructions instead of upstream OpenCode defaults.
  Upstream merge impact: medium because these prompts and planning helpers drift whenever upstream changes local agent instructions.

- **The TUI ships a fixed Agent Swarm dark palette and wordmark instead of upstream theme selection.**
  Files: `packages/opencode/src/cli/cmd/tui/context/{theme.tsx,theme/opencode.json}`, `packages/opencode/src/cli/cmd/tui/component/logo.tsx`, `packages/opencode/test/cli/tui/{theme-provider.test.tsx,theme-store.test.ts,local-context.test.tsx,local.test.ts}`.
  Why: users wanted the shipped fork to keep the Agent Swarm dark look consistently, including Apple Terminal fallback handling, instead of drifting with upstream theme defaults.
  Upstream merge impact: medium because upstream theme APIs change, but the divergence is localized.

### Docs, Validation, And Release Operations

- **Fork CI and release automation run on VRSEN-owned workflows and add an auth smoke gate before releases.**
  Files: `.github/workflows/{auth-smoke.yml,publish-npm-on-release.yml,deploy.yml,nix-eval.yml,pr-management.yml,test.yml,typecheck.yml}`, `packages/opencode/script/auth-smoke-test.py`.
  Why: release work for the fork needed VRSEN-controlled publishing plus a live OpenAI and Anthropic smoke test before shipping `agentswarm-cli`.
  Upstream merge impact: medium because workflow files are isolated, but they conflict whenever upstream changes CI policy.

- **The fork carries small app, web, docs, and E2E adjustments that keep the branded share surface and release-validation flows working against the forked session model.**
  Files: `packages/app/src/app.tsx`, `packages/app/src/i18n/ko.ts`, `packages/app/e2e/**`, `packages/web/package.json`, `packages/web/src/components/{Share.tsx,share/part.tsx}`, `packages/web/src/pages/s/[id].astro`, `README.md`, `USER_FLOWS.md`.
  Why: users wanted the fork to document Run mode, keep share and build imports aligned with the `agentswarm-cli` package name, and harden the browser checks used to validate fork-specific session and status behavior.
  Upstream merge impact: medium because most of this is support glue, but it touches surfaces upstream still changes.

- **The fork keeps its own governance layer for requirement tracking and fork-state documentation.**
  Files: `.agentswarm/.gitignore`, `.agentswarm/skills/requirement-ledger/{SKILL.md,scripts/requirement_ledger.py}`, `AGENTS.md`, `CLAUDE.md`, `FORK_CHANGELOG.md`.
  Why: users wanted a durable requirement ledger plus a canonical fork-state document so future work can be checked against live fork intent instead of chat memory.
  Upstream merge impact: low because these files are fork-owned, but they still need manual review when fork process rules change.
