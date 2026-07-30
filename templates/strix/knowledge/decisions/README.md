# Architecture Decision Records (ADRs)

This directory stores **ADRs** — the durable record of *why* the architecture is
the way it is, and what alternatives were rejected.

## Rules

- **Writer:** Claude only (`knowledge-agent`, `ADR` skill). Cline is read-only.
- **One decision per file.** Never edit a decided ADR's meaning; supersede it
  with a new ADR instead.
- **Numbering:** `NNNN-kebab-title.md`, zero-padded, sequential. `0000` is the
  template.
- **Immutability:** once `Accepted`, an ADR's decision is fixed. To change
  course, add a new ADR and mark the old one `Superseded by ADR-NNNN`.

## When To Write One

Write an ADR for significant or hard-to-reverse decisions: architecture,
convention changes, a new module boundary, a tech-stack choice, or a business
rule with structural impact. Skip ADRs for typos, renames, CSS, and minor bugs.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](./0000-adr-template.md) | ADR Template | Template |
| 0001 | Adopt the Strix Workflow Framework | Accepted (example — see the plugin's `reference/examples/`) |

See the template: [0000-adr-template.md](./0000-adr-template.md).
