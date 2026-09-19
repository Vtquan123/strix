# TASK-000: Add rate limiting to the login endpoint

| Field | Value |
|-------|-------|
| **ID** | TASK-000 |
| **Workstream** | general |
| **Title** | Add rate limiting to the login endpoint |
| **Priority** | P1 |
| **Complexity** | STANDARD |
| **Status** | In Review |
| **Base** | 4f1c2a9d0b7e6c5a3f2e1d0c9b8a7f6e5d4c3b2a |

## Goal

Protect the login endpoint from brute-force attempts by limiting failed
authentication attempts per IP.

## Background

Security review flagged unbounded login attempts. Convention for middleware and
error responses is defined in `knowledge/coding-conventions.md`; the auth module
is described in `knowledge/architecture.md`. This is an example task showing the
full contract.

## Requirements

- [ ] Limit to 5 failed attempts per IP per 15 minutes
- [ ] Return the project's standard `429` error shape on limit exceeded
- [ ] Successful login resets the counter for that IP
- [ ] Limit is configurable via existing config mechanism

## Out of Scope

- Global/API-wide rate limiting (separate task)
- CAPTCHA or account lockout flows
- Distributed rate-limit store — in-memory is acceptable for this task

## Dependencies

- none

## Suggested Skills

- `node`, `typescript`, `security`, `testing`

## Estimated Files

- `src/middleware/rate-limit.ts` — created
- `src/routes/auth/login.ts` — modified
- `src/config/index.ts` — modified
- `test/middleware/rate-limit.test.ts` — created

## Acceptance Criteria

- [ ] 6th failed attempt within the window returns `429` with the standard shape
- [ ] Counter resets on successful login and after the window
- [ ] Limit value reads from config
- [ ] Tests cover: under limit, at limit, over limit, reset-on-success

## Definition of Ready (DoR)

- [x] Goal and Requirements are unambiguous
- [x] Dependencies are listed (none)
- [x] Suggested Skills and Estimated Files are set
- [x] Acceptance Criteria are testable

## Definition of Done (DoD)

<!-- Not ticked by hand: the executor attests each item in the Execution Report,
and the reviewer verifies them. -->

- [ ] All Acceptance Criteria met
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass (new rate-limit tests added)
- [ ] No Out-of-Scope work introduced
- [ ] Changes committed, each commit carrying a `Strix-Task:` trailer with this task's ID
- [ ] Execution Report filled
- [ ] Knowledge/ADR updated if triggered (new middleware pattern → note in
      architecture.md; else "n/a")

## Execution Report

**2026-09-17T15:42:10Z · executor**

```
$ npm run build      → exit 0
$ npm run lint       → exit 0
$ npm test -- rate-limit
  ✓ under limit (4 ms)
  ✓ at limit (3 ms)
  ✓ over limit returns 429 (5 ms)
  ✓ resets on success (3 ms)
  Tests: 4 passed, 4 total   → exit 0
```

Definition of Done: all Acceptance Criteria met (the four tests above); build,
lint, and tests pass; no Out-of-Scope work; knowledge: `n/a` for the executor
(the new middleware pattern is flagged for the orchestrator).

Commits (each ends with `Strix-Task: TASK-000`):
- `9c8b7a6` Add login rate-limit middleware
- `1d2e3f4` Read the login limit from config

## Review Checklist

<!-- Empty unless the reviewer requests changes. -->

## History

- 2026-09-17T14:05:31Z · queue → active · quan · —
- 2026-09-17T15:42:18Z · active → review · executor · —

