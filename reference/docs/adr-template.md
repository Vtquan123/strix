# ADR Template

Architecture Decision Records capture *why* the architecture is the way it is.
The canonical, copy-paste template lives at
[../../templates/strix/knowledge/decisions/0000-adr-template.md](../../templates/strix/knowledge/decisions/0000-adr-template.md);
this page documents how to use it.

## Structure

An ADR has these sections:

| Section | Contents |
|---------|----------|
| Header | Status, Date, Deciders, Related tasks, Supersedes/Superseded |
| Context | The problem, forces, and constraints |
| Decision | The choice, in active voice ("We will …") |
| Options Considered | Chosen + rejected options with pros/cons |
| Consequences | Positive, negative, follow-ups |
| Compliance | How we verify the decision is honoured |

## Status Values

`Proposed` → `Accepted` → (`Superseded by ADR-NNNN`) or `Rejected`.

## Rules

- **One decision per file.** Numbered `NNNN-kebab-title.md`, sequential.
- **Immutable once Accepted.** Do not rewrite a decided ADR — write a new ADR
  and mark the old one `Superseded by ADR-NNNN`.
- **Claude only.** Cline never authors or edits ADRs.
- **When to write one:** architecture, convention, module boundary, tech-stack,
  or business-rule decisions with structural impact.
- **When not to:** typo, rename, CSS, minor bug.

## Example

A worked, accepted ADR:
[../examples/0001-example-adopt-strix.md](../examples/0001-example-adopt-strix.md).

## Index

Keep the index in
[../../templates/strix/knowledge/decisions/README.md](../../templates/strix/knowledge/decisions/README.md) current when
adding an ADR.
