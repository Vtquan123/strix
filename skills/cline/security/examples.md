# Examples: Security

## Example 1 — Validate + encode
Validate input at the boundary; encode output for its sink (HTML/SQL/shell) to
stop injection.

## Example 2 — Secrets
Read secrets from env/secret store, never hard-code; keep them out of logs.
