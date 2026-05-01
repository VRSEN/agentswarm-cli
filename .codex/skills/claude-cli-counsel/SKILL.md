---
name: claude-cli-counsel
description: Use only when Claude CLI is explicitly chosen for non-authoritative discussion or counsel; not for code review gates, fixes, patches, commits, or pushes.
---

# Claude CLI Counsel

Use Claude only for discussion or counsel when `AGENTS.md` and Tool And Model Policy allow it. Claude output can raise questions or tradeoffs, but it is not evidence for code, policy, pull-request, merge, or release gates.

## Hard Limits

- Do not ask Claude to write, edit, patch, implement, test, run review gates, stage, commit, push, publish, or mutate repo artifacts.
- Do not use Claude to generate code-review findings, approval records, release review artifacts, or policy-review proof.
- Do not copy Claude-generated patches or code into the repo. If counsel suggests a direction, verify it independently and implement through an approved non-Claude path.
- Keep private user wording out of prompts and saved notes unless the user explicitly approves exact wording.

## Counsel Pattern

1. Ask a discussion-only question about tradeoffs, risks, or possible interpretations.
2. Bound the context to the smallest source excerpts needed.
3. Treat the answer as a hypothesis to verify against repo evidence before acting.
4. Record only the verified conclusion or unresolved question in user-facing output.

## Output

Report only the verified takeaway, unresolved uncertainty, and whether Claude was used for counsel.
