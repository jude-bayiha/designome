# Analyze data display, statistics, and visualization

Read `_shared-contract.md`, the `axis.data-display-visualization` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible metrics, comparisons, collections, charts, maps, and status patterns
- Five data facets and applicable data-oriented UI domains

## Task

Treat data presentation as a decision-support grammar, not decoration:

1. For every statistic or KPI, identify label, primary value, unit, qualifier, comparison, trend, baseline, target, timeframe, segment, status, freshness, explanation, and action. Record absent context as unknown rather than inventing it.
2. Determine which comparison makes the value meaningful: absolute, relative, previous period, target, benchmark, range, rank, contribution, segment, or uncertainty. Analyze precision, rounding, signs, abbreviations, and beneficial-versus-adverse ambiguity.
3. For tables and lists, extract row and column anatomy, alignment, density, hierarchy, actions, selection, grouping, sorting, filtering, pagination, expansion, batch action, empty, long-content, and small-screen implications.
4. For every chart or map, record the user question, mark, encoding channels, axes, scale type, domain, baseline, ordering, legend, labels, gridlines, annotations, reference lines, series semantics, interaction implications, and comparison structure.
5. Analyze series count, label collision, aggregation, missing values, estimates, forecasts, uncertainty, color vision, non-color encoding, text summary, table alternative, focus order, tooltips, brushing, zoom, responsive transformation, and rendering cost.

Do not merge KPI cards, charts, tables, progress, and status into a single “dashboard style.” They may share tokens while requiring distinct anatomy, semantics, states, and accessibility contracts.

## Output

Return the shared stage JSON for `prompt.data-display-visualization` with:

- exactly five facet-coverage records;
- dedicated contributions for `domain.stats-kpis`, `domain.charts-data-visualization`, `domain.tables-lists`, and any other detected data domain;
- typed component candidates and data-display or visualization rules;
- numeric, color, typography, spacing, and data-visualization token candidates;
- scale, uncertainty, missing-data, accessibility, performance, and responsive stress tests.

## Guardrails

- Do not infer metric formulas, data correctness, data volume, query behavior, or business meaning.
- A green arrow or saturated color does not prove that a change is beneficial.
- Do not reconstruct exact data values or scale transforms from chart pixels.
- Visible controls do not prove sorting, filtering, pagination, virtualization, tooltip, zoom, or brush behavior.
- A chart is incomplete as reusable guidance when its question, comparison, encoding, context, and accessible alternative remain unspecified.
