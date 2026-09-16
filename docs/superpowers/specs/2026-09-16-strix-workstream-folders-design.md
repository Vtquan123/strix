# Workstream Folders for the Strix Task Board

**Status:** implemented 2026-09-17 in `850aee1..0b36526`
**Date:** 2026-09-16 (designed), 2026-09-17 (built)
**Affects:** `config/`, `scripts/`, `bin/`, `agents/`, `skills/`, `hooks/`, `templates/`, `reference/`

---

## Problem

The Strix task board is five flat directories:

```
.strix/tasks/{queue,active,review,done,archive}/TASK-<n>.md
```

Every task from every line of work lands in the same `queue/`. With two people
running two unrelated EPICs, the board gives no signal about which tasks belong
to which effort. Scanning `queue/` does not answer "what is mine" or "what is
this feature's remaining work".

Two secondary problems follow from the flat layout:

- **ID collision.** Both people mint `TASK-012` on their own branches. The board
  looks fine until merge, when two different files claim the same ID and
  `Dependencies: TASK-012` becomes ambiguous.
- **Git churn.** Stage transitions are file moves. Two people moving files inside
  one directory produce more rename noise in diffs than two people moving files
  inside separate directories.

## Solution

Group tasks by **workstream** — a named line of work, normally one EPIC — as a
directory level inside every stage.

```
.strix/tasks/
├── workstreams.yaml
├── TEMPLATE.md
├── queue/
│   ├── billing-system/BILL-012-add-invoice-model.md
│   ├── search-revamp/SRCH-004-reindex-nightly.md
│   └── general/TASK-030-fix-footer-typo.md
├── active/
│   └── billing-system/BILL-011-add-invoice-api.md
├── review/
├── done/
└── archive/
```

Task IDs carry their workstream's prefix, so each workstream has an independent
counter and neither person coordinates ID allocation with the other.

A `bin/strix-task` CLI owns all board mutation, so no human or agent ever
constructs a nested path by hand.

### Decisions made

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Grouping key | Epic / workstream | Person (churns on reassignment; an EPIC's tasks scatter); both nested (deep paths, two segments rewritten per move); header field only (board stops being scannable) |
| Epic-less tasks | Reserved `general/` bucket — everything nests | Loose at stage root (two board shapes, conditional move instructions in ~20 files); force a workstream on everything (ceremony TRIVIAL exists to avoid) |
| ID uniqueness | Workstream-prefixed, per-workstream counter | Shared counter file (guaranteed merge conflict per task creation); global ID by convention (races across branches); date-stamped (unsortable, workstream-opaque) |
| Implementation reach | Schema-driven + CLI | Prose-only edits (drift returns; the repo migrated to YAML specifically to prevent this) |

### Explicitly out of scope

- Any change to the five stage names or their meanings
- Any change to the task template's body sections
- Per-person folders, assignment tracking, or scheduling
- Multi-repo or multi-project boards

---

## Data model

### Board layout

The path convention becomes a single generated fact:

```
{stage}/{workstream}/{id}-{slug}.md
```

Workstream directories are **not** seeded. They are created on demand and
disappear when empty — `queue/billing-system/` vanishes once its last task moves
to `active/`. Git does not track empty directories, so this self-cleans with no
`.gitkeep` litter. The five stage directories keep their existing `.gitkeep`.

### Registry — `.strix/tasks/workstreams.yaml`

```yaml
workstreams:
  - id: billing-system      # == folder name
    prefix: BILL            # == task ID prefix
    owner: quan
    status: active          # active | closed
  - id: search-revamp
    prefix: SRCH
    owner: colleague
    status: active
  - id: general             # reserved bucket, always present
    prefix: TASK
    owner: shared
    status: active
```

A registry rather than deriving the prefix from the folder name: derivation
collides (`search-revamp` and `search-index` both yield `SRCH`) and leaves
nowhere to record `owner`.

The registry is shared mutable state, but workstreams are minted once per EPIC,
not once per task, and edits are appends — conflicts are rare and resolve by
keeping both entries. This is materially different from a counter file, which
mutates a single line on every task creation.

### The `general` bucket uses prefix `TASK`

Deliberate, and the reason migration is safe. Existing flat `TASK-012.md` files
move into `general/` by pure `mv`: no rename, no ID churn, and no rewriting of
`Dependencies: TASK-012` references in other task files. New one-off tasks
continue the existing `TASK-<n>` sequence.

A distinct prefix such as `GEN` would have required a dependency-rewrite pass
across every task file — the one migration step most likely to silently corrupt
a board.

### ID allocation — no counter file

`strix-task new` derives the next number by scanning all five stage directories
for the highest existing ID in that workstream. There is no shared mutable
counter.

**Known limitation.** This isolates two people because they are on *different*
workstreams. Two people minting into the *same* workstream from *different*
branches can still collide. Accepted: that scenario implies collaboration close
enough to coordinate directly. The `general` bucket is the real exposure — both
people dumping typo fixes there — and is also accepted, since the fix is a file
rename at merge time with no dependency impact.

### Task schema changes

In `config/task-schema.yaml`, a new header field after `ID`:

```yaml
  - name: Workstream
    meaning: The workstream folder this task lives in
    placeholder: <workstream-id>
```

`ID` changes meaning from `Unique, sequential (TASK-<n>)` to
`<PREFIX>-<n>, sequential within its workstream`.

New top-level block:

```yaml
board:
  path: "{stage}/{workstream}/{id}-{slug}.md"
  default_workstream: general
  registry: workstreams.yaml
```

`config/schemas/task-schema.schema.json` is updated to require `board`.

### Invariants: one becomes four

Today the reviewer checks one thing — the `Status` field agrees with the task's
directory. After this change:

1. `Status` field matches the stage directory
2. `Workstream` field matches the parent directory name
3. ID prefix matches that workstream's registered `prefix`
4. The workstream exists in `workstreams.yaml`, and carries `status: active`
   unless the task sits in `done/` or `archive/`

This is the honest cost of the feature: three more ways to drift. It is
mitigated by `strix-task doctor` checking all four mechanically, and by the CLI
making hand-violation unlikely in the first place.

---

## `bin/strix-task`

### Command surface

```
strix-task new <workstream> --title "..." [--complexity STANDARD] [--priority P1]
    Mints the next ID in that workstream; writes
    queue/<ws>/<PREFIX>-<n>-<kebab-title>.md from TEMPLATE.md with header
    fields filled.

strix-task move <id> <stage>
    Moves the file, rewrites the Status field, creates the destination
    workstream directory, removes the source directory if it emptied.

strix-task where <id>
    Prints the task's absolute path.

strix-task ls [--workstream <id>] [--stage <s>] [--owner <o>]
    Board view, grouped.

strix-task workstream add <id> --prefix <P> --owner <o>
strix-task workstream close <id>
    Sets status: closed. Refuses if the workstream still has tasks outside
    done/ or archive/ — a closed workstream must have no live work, since
    invariant 4 requires an active workstream for any task not yet finished.

strix-task doctor
    Checks the four invariants across the whole board. Exit 1 on violation.

strix-task migrate
    Idempotent flat-to-nested migration. See Migration below.
```

### `where` is load-bearing

Every executor is currently handed a literal task path and never searches for
one. Nesting breaks that assumption: locating `BILL-012` now requires a glob
across unknown workstream directories. `where` restores a stable lookup so no
agent or prompt file constructs a nested path itself.

### `move` reduces prose surface rather than adding to it

This is what justifies building the CLI rather than documenting a convention.
Twelve sites across the executor templates currently say a variant of:

> move the task file from `.strix/tasks/active/` to `.strix/tasks/review/` and
> set `Status: In Review`

Each hardcodes a path pair *and* a manual field edit — two chances to break
invariant 1. Each becomes:

> run `.strix/bin/strix-task move <ID> review`

The nesting convention then appears in no prose at all. Net drift surface is
lower than today's.

### Implementation: Node, zero runtime dependencies

`bin/strix-init` is bash, but this tool must read `workstreams.yaml` and rewrite
markdown header tables — poor fits for sed.

Plain Node has a problem: `yaml` is a **devDependency** of the plugin, and target
projects install nothing, so it is absent at runtime.

Resolution: keep the registry shape deliberately trivial — a flat list of
four-scalar-key maps, no nesting, no anchors, no multi-line strings — and
hand-roll a small reader (~20 lines). The plugin's own `npm run validate` checks
the template registry with the real `yaml` parser, enforcing the strict shape
upstream where the dependency exists. `doctor` refuses to guess on anything
outside that shape rather than mis-parsing it.

### Getting it onto PATH

The binary lives in the plugin, but the docs need one stable invocation string.
`bin/strix-init` gains a step: write `.strix/bin/strix-task`, a short shim that
resolves the plugin root exactly as `strix-init` already does and execs the real
binary. Docs refer to `.strix/bin/strix-task` throughout.

**Trade-off.** One more generated file to keep in sync, and it breaks if the
plugin relocates. The alternative — assuming a global `strix-task` on PATH —
breaks more often, since the plugin is not globally installed.

### Manual fallback is retained

Copilot prompt files already carry "If you cannot move files, …" escapes, and
some executors cannot shell out. Every CLI-using instruction keeps a documented
manual form beside it. `doctor` is what catches a hand-move done wrong.

---

## Propagation

### Config — source of truth

- `config/task-schema.yaml` — `Workstream` field, new `ID` meaning, `board:` block
- `config/schemas/task-schema.schema.json` — require `board`
- `scripts/validate-config.mjs` — registry shape, prefix uniqueness, `default_workstream` resolves

### Generated

`task-header-table` and `task-fields` render directly from `header_fields`, so
`Workstream` reaches `templates/strix/tasks/TEMPLATE.md` and
`reference/docs/task-templates.md` with no renderer work.

Two new renderers in `scripts/gen-docs.mjs`:

- `board-path` — renders `.strix/tasks/<stage>/<workstream>/<ID>.md`
- `board-layout` — renders the directory tree

Markers for these are then added to the docs that currently hardcode paths in
prose.

### Hand-edited

Not generatable; each needs judgment:

- `agents/triage-agent.md` — triage now also assigns a workstream
- `agents/task-creator-agent.md` — call `strix-task new` instead of writing files directly
- `agents/reviewer-agent.md` — one invariant becomes four
- `skills/task-breakdown/SKILL.md` — see below
- `skills/review/SKILL.md` — the four invariants
- `hooks/strix-context.md` — the per-request step list
- Executor templates, twelve sites across cline / copilot / claude
- `reference/examples/TASK-000-example.md` — gains a `Workstream` row
- `reference/workflow/{task-lifecycle,task-driven-workflow}.md`,
  `reference/docs/{workflow,contribution-guide}.md`,
  `templates/strix/tasks/README.md`

### An EPIC is a workstream

Worth stating explicitly in `skills/task-breakdown/SKILL.md`. That skill already
decomposes an EPIC into N STANDARD tasks with dependencies; it now mints the
workstream first and creates those tasks inside it. The two-people-two-EPICs
case then falls out of the existing flow rather than introducing a concept
beside it.

---

## Migration

`strix-task migrate`, idempotent:

1. Create `workstreams.yaml` with the `general` entry if absent
2. `mv` every loose `<stage>/*.md` into `<stage>/general/`
3. Insert the `Workstream: general` header row into each moved task
4. Run `doctor`

No renames and no dependency rewrites, because `general` uses prefix `TASK`.
Re-running is a no-op.

---

## Testing

The repo has no test framework. `npm run check` is the only gate, wired to CI in
`.github/workflows/config.yml`.

Add `scripts/test-strix-task.mjs`:

- Builds a throwaway board in a temp directory
- Exercises `new → move → where → ls → doctor`
- Asserts `doctor` **fails** on each of the four invariants deliberately broken
- Zero-dep, plain Node assertions, matching the repo's existing script style

Wire it into `npm run check` so CI covers it with no workflow edit.

---

## Sequencing

Seven steps, each independently green:

1. Schema + registry + validate rules — inert; nothing consumes it yet
2. `bin/strix-task` + its test — works standalone on a temp board
3. gen-docs renderers + `npm run gen` — docs catch up
4. Agents + skills + hooks
5. Executor templates (twelve sites)
6. `strix-init` shim + `migrate`
7. Reference docs + example task

Steps 1–3 are safely shippable alone: the board still works flat, because
nothing enforces nesting until step 4 tells the agents to use it.

---

## Risks

| Risk | Mitigation |
|---|---|
| Four invariants instead of one | `strix-task doctor` checks all four; CLI prevents hand-violation; reviewer treats a mismatch as a defect |
| Same-workstream ID collision across branches | Accepted. Implies close collaboration; fix is a rename with no dependency impact |
| `general` bucket collisions between the two people | Accepted, same reasoning |
| Shim breaks if the plugin relocates | Shim resolves the plugin root the same way `strix-init` does; `doctor` reports a broken shim |
| Hand-rolled YAML reader mis-parses the registry | Strict shape enforced upstream by `npm run validate` with the real parser; reader refuses to guess outside that shape |
| Executors that cannot shell out | Manual path form documented beside every CLI instruction; `doctor` catches errors |

---

## Changed during implementation

Three things differed from the design as approved. Each is reflected in the text
above; this section is the record of what moved and why.

### Filenames keep the board's kebab-title

The approved `board.path` was `{stage}/{workstream}/{id}.md`. That would have
silently dropped the existing convention — `TASK-014-add-login-rate-limit.md` —
which the flat board already used and which `templates/strix/tasks/README.md`
documented. Readable filenames matter more on a nested board, not less: they are
how a directory listing stays scannable once tasks are one level deeper.

Shipped as `{stage}/{workstream}/{id}-{slug}.md`, with `strix-task` deriving the
slug from `--title`. Task lookup reads the ID off the front of the filename, so a
slugless pre-migration `TASK-012.md` still resolves and `migrate` still needs no
renames.

### The review skill's "no terminal commands" line was narrowed, not kept

`skills/review/SKILL.md` carried the line _"No terminal commands — Claude reads,
never executes."_ Taken literally, the reviewer could not run `strix-task
doctor`, which the design depends on.

The line was wrong before this change, not because of it: `config/capabilities.yaml`
grants `run_terminal` to Claude as a shared capability with `on_demand_confirm`,
and `reference/rules/permissions.md` explicitly allows running the terminal to
inspect state and verify. It now says Claude reads source and never edits it,
and that running `strix-task` is verification while build, lint and tests remain
the executor's.

### A gen-docs guard was added for a bug this work hit

Adding a `strix:gen` marker to a file absent from `gen-docs.mjs` TARGETS renders
the region **empty** and ships it blank. Nothing warned — the existing check only
catches the reverse case, a renderer with no marker, which is the harmless
direction. This was hit on `reference/workflow/task-lifecycle.md` and would have
shipped an empty region into the reference docs.

`gen-docs` now errors on a marker in a non-target file. Fenced code blocks are
excluded first, so `config/README.md` can keep documenting the marker syntax by
showing it.

## Verification performed

- `npm run check` green: config validation, 38 `strix-task` checks, drift gate.
- Three throwaway projects scaffolded through `strix-init`: the two-person
  parallel-EPIC scenario, a Copilot scaffold, and a simulated pre-workstream flat
  board.
- Migration confirmed on the flat board: `TASK-011` and `TASK-012` moved into
  `general/` with IDs untouched, the `Dependencies: TASK-011` cross-reference
  still resolving, and a second run reporting no work.
