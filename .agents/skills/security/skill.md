---
name: security
kind: implementation
engine: cline
---

# Skill: Security

## Purpose
Apply the project's security conventions during implementation — input
validation, authn/authz, secret handling, safe output.

## When To Use
Task's Suggested Skills include `security`, or the change touches auth, data, or
user input.

## Inputs / Outputs
- **In:** task Requirements, security conventions, risk-analysis notes.
- **Out:** code that meets the security bar, with tests for the risky paths.

## Files
- `skill.md` · `examples.md` · `rules.md` · `commands.md` · `checklist.md`

## Related
[node](../node/skill.md) · [sql](../sql/skill.md) · [risk-analysis](../../claude/risk-analysis/skill.md)
