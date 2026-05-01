---
name: claude-cli-review
description: Guard that shadows old Claude review routes; do not use Claude for review gates, code fixes, patches, commits, or pushes.
---

# Claude CLI Review Guard

Claude review artifacts are not allowed in this repo. This skill exists only to shadow old `claude-cli-review` triggers and redirect them to the current counsel-only rule.

## Required Routing

- Do not run Claude for code, policy, pull-request, merge, release, or review-gate work.
- If any user, plugin, global, or non-guard `claude-cli-review` skill is selected instead of this checked-in guard, stop before using Claude.
- Use `.codex/skills/codex-cli-review` for review gates.
- Use `.codex/skills/claude-cli-counsel` only for non-authoritative discussion or counsel.

## Output

Report that Claude review is disallowed here and name the allowed Codex review or Claude counsel path.
