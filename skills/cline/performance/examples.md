# Examples: Performance

## Example 1 — Measure first
Profile before changing anything; fix the top bottleneck (e.g. an N+1 query),
then re-measure.

## Example 2 — Guard the win
Add a benchmark/assertion so the improvement can't silently regress.
