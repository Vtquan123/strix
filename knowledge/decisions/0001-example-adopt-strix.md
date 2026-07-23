# ADR-0001: Adopt the Strix Workflow Framework

- **Status:** Accepted (example ADR — illustrates the format)
- **Date:** 2026-07-24
- **Deciders:** Strix architecture (Claude) + project owner
- **Related tasks:** —
- **Supersedes / Superseded by:** —

## Context

The project needs a repeatable way to move from human intent to shipped code
without blurring reasoning and execution. Ad-hoc prompting leads to large
contexts, over-engineering, and knowledge drift. We need clear runtime
boundaries, a task-driven flow, and a governed knowledge base.

## Decision

We will adopt **Strix**: a hybrid, task-driven, layered workflow that separates
a Claude **Planning Runtime** (reasoning) from a Cline **Execution Runtime**
(implementation), routed by a single Claude Triage Router that consults a
capability matrix.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Strix (chosen)** | Clear separation; auditable; small contexts; extensible to future engines | Upfront structure to learn |
| B. Single-agent free-form | Simple to start | Context bloat; scope creep; knowledge drift |
| C. Multiple ad-hoc agents, no router | Some specialisation | No single decider; agents self-select; inconsistent |

## Consequences

- **Positive:** every code change traces to a task; knowledge stays coherent;
  prompts stay small; new engines are a capability-matrix edit.
- **Negative:** contributors must respect runtime boundaries and the task
  lifecycle.
- **Follow-ups:** fill the knowledge templates; author project-specific tasks.

## Compliance

Enforced by `claude/rules/*`, `.clinerules/*`, the capability matrix, and
`reviewer-agent` checks.
