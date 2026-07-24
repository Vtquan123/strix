# Rules: Next.js

## Do
- Respect the server/client boundary; keep client bundles small.
- Follow the project's chosen router (app or pages) — don't mix.
- Use the project's data-fetching + caching conventions.

## Don't
- Don't switch rendering strategy without an ADR (that is a Claude decision).
- Don't leak secrets into client components.
- Don't add middleware beyond the task.
