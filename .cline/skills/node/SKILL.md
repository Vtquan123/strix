---
name: node
description: Use when a task involves backend services, REST/API endpoints, or Node.js scripts.
---

# Node

Implement backend services, APIs, and scripts in Node following the project's API and error conventions.

## When To Use
Task's Suggested Skills include `node`.

## Inputs / Outputs
- **In:** task Requirements, API + security conventions, architecture.
- **Out:** endpoints/services + tests, green build/lint.

## Rules

**Do**
- Follow the project's request/response + error conventions exactly.
- Validate input at the boundary.
- Keep handlers thin; push logic into services.

**Don't**
- Don't invent a new error format.
- Don't add endpoints or config beyond the task.
- Don't block the event loop with sync heavy work.

## Commands

```bash
npm install            # deps
npm run build          # compile (tsc/bundler)
npm run lint
npm test               # unit + integration
node --watch src/...   # local run (adjust to project)
```

Use the project's scripts; do not add new tooling without a task.

## Examples

**New endpoint** — mirror an existing route's validation, auth, and error shape; add integration tests.

**Async error handling** — wrap async handlers so rejected promises return the standard error response, not an unhandled rejection.

## Checklist

- [ ] Input validated at boundary
- [ ] Error shape matches conventions
- [ ] Handlers thin; logic in services
- [ ] Tests (unit + integration) added
- [ ] Build + lint green
- [ ] No out-of-scope endpoints/config
