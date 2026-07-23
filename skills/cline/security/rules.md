# Rules: Security

## Do
- Validate all input at the boundary; encode output per sink.
- Enforce authz on every protected path.
- Keep secrets out of code, logs, and images.
- Add tests for the risky paths.

## Don't
- Don't roll your own crypto.
- Don't weaken a security convention to pass a task (escalate).
- Don't log sensitive data.
