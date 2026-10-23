# Claude Routing Rules

Claude, as the orchestrator, runs the Router on every request. The rules — the
five functions, the full routing table, and the invariants — are in
[../workflow/router.md](../workflow/router.md). The routing data is
[`config/routing.yaml`](../../config/routing.yaml).

The short version:

- The Router always decides. Agents never pick their own skills, context, or
  successor, and they return results to the orchestrator.
- Every intent × complexity cell has exactly one route.
- The executing engine is chosen through the
  [capability matrix](../workflow/capability-matrix.md), never by name.
- An EPIC is decomposed before anything is executed.
