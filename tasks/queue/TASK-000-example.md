# TASK-000: Add rate limiting to the login endpoint

| Field | Value |
|-------|-------|
| **ID** | TASK-000 |
| **Title** | Add rate limiting to the login endpoint |
| **Priority** | P1 |
| **Complexity** | STANDARD |
| **Status** | Queued |

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
- [x] Dependencies are Done (none)
- [x] Suggested Skills and Estimated Files are set
- [x] Acceptance Criteria are testable

## Definition of Done (DoD)

- [ ] All Acceptance Criteria met
- [ ] Build passes
- [ ] Lint passes
- [ ] Tests pass (new rate-limit tests added)
- [ ] No Out-of-Scope work introduced
- [ ] Knowledge/ADR updated if triggered (new middleware pattern → note in
      architecture.md; else "n/a")
