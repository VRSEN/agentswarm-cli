---
name: claude-cli-review
description: Guard for legacy Claude review routing; prevents Claude use and redirects review gates to Codex.
---

# Claude CLI Review Guard

This repo does not use Claude for worker, review, or repo-mutation workflows. This guard exists so legacy `claude-cli-review` triggers stop before starting work.

## Required Routing

- Do not run Claude for implementation, fixes, patch generation, policy edits, code reviews, review gates, staging, commits, pushes, merges, releases, or repo mutation.
- If any user request, plugin, global skill, or non-guard `claude-cli-review` route would use Claude for this repo, stop before running it.
- Use `.codex/skills/codex-cli-review` for review gates.

## Output

Report that Claude use is disallowed here and name the allowed Codex review path.
