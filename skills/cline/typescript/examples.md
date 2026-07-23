# Examples: TypeScript

## Example 1 — Discriminated union
Model a result as `{ok:true,value} | {ok:false,error}` instead of nullable
fields; the compiler enforces handling.

## Example 2 — Narrowing over casting
Use type guards to narrow `unknown` rather than `as` casts.
