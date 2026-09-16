# Strix Config — Single Source of Truth

Everything in this directory is **data**. Every Markdown rendering of it is
**generated**. If a table, enum, or catalog exists both here and in a doc, the
copy in the doc is output, not input.

## Files

| File | Owns |
|------|------|
| [`routing.yaml`](./routing.yaml) | Intents, complexity levels + heuristics, the routing table, the Router decision-record example |
| [`capabilities.yaml`](./capabilities.yaml) | Engines and the capability matrix |
| [`skills.yaml`](./skills.yaml) | Built-in reasoning skill catalog and the four Claude agents |
| [`task-schema.yaml`](./task-schema.yaml) | Task header fields, body sections, enums, lifecycle stages |
| [`schemas/`](./schemas/) | JSON Schemas (draft-07) validating the four files above |

`package.json` is the single source for the **version**; `gen` writes it into
`.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

## Workflow

```bash
npm run validate   # schemas + cross-file references + disk layout + frontmatter + versions
npm run gen        # render config → generated regions in the docs
npm run check      # validate, then fail if `gen` would change anything (CI drift gate)
```

Edit a `.yaml` file → `npm run gen` → commit both the config and the regenerated
docs. `npm run check` in CI fails the build when someone edits a doc by hand or
forgets to regenerate.

## Generated regions

A generated region in a Markdown file looks like this:

```markdown
<!-- strix:gen start id=routing-table -->
...generated, do not edit...
<!-- strix:gen end id=routing-table -->
```

Prose **around** a region is hand-written and safe to edit. Anything **inside**
one is overwritten on the next `npm run gen`. Marker ids map to renderers in
[`../scripts/gen-docs.mjs`](../scripts/gen-docs.mjs); an unknown id is a build
error, and a renderer with no marker anywhere prints a warning.

A marker in a file **missing from `TARGETS`** is a build error too. That case is
worse than an unrendered renderer: the region ships blank instead of loudly
missing, so it fails rather than warns. Fenced code blocks are excluded from the
scan, which is why the example above does not trip it.

### Known leak: markers ship to consuming projects

`templates/strix/tasks/TEMPLATE.md` and `templates/strix/tasks/README.md` each
contain generated regions, and `bin/strix-init` copies both verbatim into
`<project>/.strix/tasks/`. The `strix:gen` comments travel with them. They are
inert there — `gen` only ever runs in the plugin repo, and `TARGETS` lists each
file's path inside the plugin, not the copy. Accepted as harmless noise rather
than adding a strip-on-copy step to `bin/strix-init`. Two constraints follow:

- No generated region in a shipped template may contain a `../../config/` link;
  it would dangle once copied.
- Attribution lines pointing at `config/` belong in `reference/`, never in
  `templates/` or `hooks/strix-context.md` (which is injected into every project).

## Editor support

Each YAML file opens with a modeline:

```yaml
# yaml-language-server: $schema=./schemas/routing.schema.json
```

VS Code (and any editor running the Red Hat YAML language server) picks this up
for autocomplete, hover docs, and inline validation — errors surface before you
save, not at generation time.

## Invariants the validator enforces

Beyond schema shape, `npm run validate` checks what a schema cannot:

- Every `routes[].intent` / `.complexity` / `.agent` / `.skills[]` resolves to a
  declared intent, level, agent, or skill.
- Every intent has at least one route.
- `decision_record_example` uses a real intent, level, capability, and skills.
- Each capability declares access for **every** engine; `mode: exclusive` means
  exactly one owner.
- `config/skills.yaml` matches the `skills/` directories **exactly**, both ways.
- `config/skills.yaml` agents match `agents/*.md`.
- `task-schema.yaml`'s `Status` enum matches the lifecycle stage statuses.
- `task-schema.yaml` declares a `Workstream` header field, since `board.path`
  groups by one and the reviewer's invariant has nothing to check without it.
- The seeded workstream registry
  (`templates/strix/tasks/workstreams.yaml`) matches `workstreams.schema.json`,
  has unique ids and unique prefixes, and registers `board.default_workstream`
  as `active`. `bin/strix-task` reads this file in consuming projects with a
  dependency-free reader that understands only that flat shape, so validating
  the seed here — with the real parser — is what keeps that reader safe.
- Every `SKILL.md` / agent frontmatter: opens at byte 0, `name` matches its
  directory or filename, `description` ≤ 1024 chars, `metadata.kind` and
  `metadata.engine` present, `metadata.engine` is a declared engine, and no
  `<` or `>` anywhere in the frontmatter (they can inject instructions into the
  system prompt — Agent Skills spec).
- `plugin.json` and `marketplace.json` versions equal `package.json`.

## YAML conventions

The `yaml` package parses **YAML 1.2**, so `no` stays the string `"no"` rather
than becoming `false`. Even so:

- **Quote anything that could be coerced** — version strings, ranges (`"1–3"`),
  numeric-looking ids. A bare `1.20` becomes `1.2` in a YAML 1.1 parser.
- Keep values plain data. No templating, no conditionals — if it needs logic it
  belongs in `scripts/`, not here.
- Adding a key to a config means adding it to the matching schema; the schemas
  use `additionalProperties: false` so typos fail loudly.
