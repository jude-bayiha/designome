# Analyze perceived performance and resilience

Read `_shared-contract.md`, the `axis.performance-resilience` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible loading, placeholder, progress, error, stale, offline, media, and scale implications
- Five performance and resilience facets

## Task

Define a stable perceived-performance and degradation contract without claiming measured runtime performance:

1. Prioritize critical, supporting, deferred, streamed, and action-blocking content. Distinguish skeleton, placeholder, spinner, progress, optimistic, incremental, and flash-avoidance needs.
2. Identify geometry that must remain reserved across fonts, media, banners, validation, loading, data, errors, and responsive changes. Preserve focus, selection, scroll, and action position.
3. Define partial, stale, sync, offline, unavailable, permission, dependency, and cached-data implications at region and screen scope. Preserve reading and editing where safe.
4. Define retry, reconnect, resume, restore, draft, queue, conflict, duplicate, timeout, partial-success, rollback, support escalation, and work-preservation requirements.
5. Identify potential cost from long collections, dense charts, maps, media grids, blur, shadows, large assets, and motion. Propose progressive media, aggregation, simplification, local scrolling, or deferral only as implementation guidance.

For every routed UI domain, specify the minimum usable degraded state and which content or action must remain available. A chart can degrade to a summary or table; a file upload must preserve queued input; a form failure must preserve entered values.

## Output

Return the shared stage JSON for `prompt.performance-resilience` with:

- exactly five facet-coverage records;
- loading and degradation priorities;
- visual-stability, recovery, work-preservation, media, and scale rules;
- measurable implementation checks and runtime questions;
- explicit separation between screenshot implications and executed performance evidence.

## Guardrails

- Pixels cannot prove latency, layout shift, caching, virtualization, network resilience, or memory cost.
- Do not diagnose performance from visual complexity alone.
- Avoid loading indicators that flash for near-instant operations; record timing as a validation question.
- Recovery must not silently discard input, selection, or context.
- Runtime behavior remains proposed or unknown until sequence or implementation evidence exists.
