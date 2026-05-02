---
name: claude-cli-review
description: Guard that shadows old Claude review routes; do not use Claude for review gates, fixes, implementation, patches, commits, pushes, merges, releases, or repo mutation.
---

# Claude CLI Review Guard

This repo disallows Claude review artifacts. This guard exists so old `claude-cli-review` triggers stop before starting a review.

## Required Routing

- Do not run Claude for code, policy, pull-request, merge, release, or review-gate work.
- Do not ask Claude to write, edit, patch, test, stage, commit, push, publish, or otherwise mutate repo artifacts.
- If any user, plugin, global, or non-guard `claude-cli-review` skill is selected instead of this checked-in guard, stop before using Claude.
- Use `.codex/skills/codex-cli-review` for review gates.
- Claude may be used only as non-authoritative discussion or counsel when no repo mutation, review gate, completion claim, or approval gate depends on it.

## Output

Report that Claude review is disallowed here and name the allowed Codex review path.
