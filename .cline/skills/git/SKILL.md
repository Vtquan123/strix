---
name: git
description: Use whenever a task produces committed work — branching, committing, and following the project's git conventions.
---

# Git

Manage branches, commits, and history per the project's git conventions — clean, traceable, task-linked.

## When To Use
Any task that produces committed work.

## Inputs / Outputs
- **In:** task ID, git conventions.
- **Out:** conventional commits on a correctly-named branch.

## Rules

**Do**
- Follow the project's branch naming + commit format.
- Reference the task ID in commits.
- Keep commits focused and green.

**Don't**
- Don't commit on the default branch directly (branch first).
- Don't push or open PRs unless the task/user asks.
- Don't mix unrelated changes in one commit.

## Commands

```bash
git checkout -b feat/TASK-<id>-<slug>
git add -p
git commit -m "type(scope): summary (TASK-<id>)"
git status
```

Commit/push/PR only when the task or user requests it.

## Examples

**Branch + commit** — branch `feat/TASK-014-login-rate-limit`; commit `feat(auth): add login rate limit (TASK-014)`.

**Small commits** — commit in logical steps so review + revert are easy.

## Checklist

- [ ] Work on a task-named branch (not default)
- [ ] Commits follow the convention + reference task ID
- [ ] Commits focused, tree green
- [ ] No unrelated changes bundled
- [ ] Push/PR only if requested
