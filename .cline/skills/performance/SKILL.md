---
name: performance
description: Use when a task has a measurable performance target — latency, throughput, query time, or bundle size.
---

# Performance

Meet the task's measurable performance targets by fixing the proven bottleneck — not by guessing.

## When To Use
Task's Suggested Skills include `performance`, with a measurable target.

## Inputs / Outputs
- **In:** target metric, current measurement, task Requirements.
- **Out:** a measured improvement to the target, guarded by a test/benchmark.

## Rules

**Do**
- Measure before and after; target the proven bottleneck.
- Optimize against the task's stated metric.
- Guard the improvement with a benchmark or budget test.

**Don't**
- Don't micro-optimize without evidence (over-engineering).
- Don't trade correctness or readability for tiny gains.
- Don't change architecture for perf without an ADR.

## Commands

```bash
node --prof src/...       # v8 profile
npm run bench             # project benchmark suite
# DB: EXPLAIN ANALYZE <query>
```

Optimize only what you measured; escalate structural changes.

## Examples

**Measure first** — profile before changing anything; fix the top bottleneck (e.g. an N+1 query), then re-measure.

**Guard the win** — add a benchmark/assertion so the improvement can't silently regress.

## Checklist

- [ ] Baseline measured
- [ ] Bottleneck proven, not guessed
- [ ] Change hits the target metric
- [ ] Re-measured improvement recorded
- [ ] Benchmark/budget guards regression
- [ ] Correctness + readability preserved
