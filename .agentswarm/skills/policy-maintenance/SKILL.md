---
name: policy-maintenance
description: Use when editing AGENTS.md, CLAUDE.md, or .agentswarm/skills/** policy and skill files. Keeps durable operating rules concise, separates general policy from manager-only policy, and requires review for distorted meaning or regressions.
---

# Policy Maintenance

Use this skill for policy and repo-skill changes.

## Workflow

1. Read the live `AGENTS.md`, the current diff, and any directly related policy branch or skill.
2. Preserve the active policy branch or artifact when one exists. Create a new branch or artifact only when the mandate needs one; create a pull request only when the user asks.
3. If the policy edit is self-initiated, ask the user before changing files.
4. Stay tightly scoped: use `AGENTS.md`, the current diff, and directly authorized policy inputs. Avoid unrelated repo exploration unless the mandate requires it.
5. Classify each rule before editing: universal policy, manager-only policy, repo-specific invariant, or skill procedure.
6. Keep `AGENTS.md` for rules that apply most of the time. Move step-by-step playbooks, commands, and path-specific procedures into repo skills.
7. Use the shortest coherent path: challenge the status quo, remove before adding, merge duplicates into one owner section, put intent before details, and compress without weakening behavior.
8. Preserve public/private boundaries. Do not publish private chats, ledgers, internal drafts, or work-in-progress review artifacts unless the user asks.
9. A manager must personally review the final policy diff, challenge every unexplained line, and iterate until the structure is coherent.
10. Run a fresh review worker after implementation to check for distorted meaning, lost protections, duplicate rules, and regressions.

## Policy Branch Rules

- Do not commit policy directly to `vrsen/dev` unless the user explicitly asks.
- Do not mix policy changes into feature pull requests.
- Create or reuse a policy branch as needed inside the mandate. Push the policy branch and provide a compare link by default; open a pull request only when the user asks.
- Preserve already-approved behavior. Wording may change only when the behavior is clearly retained or improved.

## Validation

Run these before commit:

```bash
git diff --check
bun x prettier --check AGENTS.md .agentswarm/skills/*/SKILL.md
```

For repo-skill changes, also reread the changed `SKILL.md` files and verify their descriptions trigger only the intended work.
