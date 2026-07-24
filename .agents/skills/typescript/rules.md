# Rules: TypeScript

## Do
- Prefer precise types and unions over `any`.
- Narrow with guards; avoid `as` unless unavoidable.
- Keep public types explicit at module boundaries.

## Don't
- Don't disable strict flags to make errors go away.
- Don't add generic type machinery the task doesn't need.
- Don't change tsconfig conventions (escalate).
