# Analyze perceived performance and resilience

Read `_shared-contract.md` and the `axis.performance-resilience` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 6 focus areas and referenced concepts

## Task

Analyze the visible implications of loading priority, reserved space, partial or stale data, offline and error recovery, work preservation, media loading, long lists, and visualization cost. Define a stable perceived-performance contract without claiming measured runtime performance.

## Output

Return the shared stage JSON for `prompt.performance-resilience`, with state priorities, visual-stability requirements, degradation paths, and measurable implementation checks.

## Guardrails

- Pixels cannot prove latency, layout shift, virtualization, caching, or network resilience.
- Keep runtime behavior `proposed` or `unknown` unless sequence or implementation evidence is supplied.
- Avoid loading indicators that flash during fast operations; record timing as a validation question.
- Recovery must not silently discard user work.
