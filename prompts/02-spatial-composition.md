# Analyze spatial composition and layout

Read `_shared-contract.md`, the `axis.spatial-composition` matrix slice, and only the UI-domain slices routed to this stage.

## Inputs

- Admitted screenshot regions and evidence index
- Per-source directives and compatibility report
- Five spatial facets and routed UI domains

## Task

For every declared facet, distinguish repeated system relationships from one-off content geometry:

1. Map the visible shell, page, section, panel, card, inset, overlay, sticky-looking, fixed-looking, and locally scrollable regions. Record nesting, ownership, edge behavior, and ambiguity caused by crops.
2. Infer the smallest grid model that explains repeated tracks, spans, gutters, margins, nested alignment anchors, content widths, and local overflow. Prefer relational statements such as “supporting column is narrower than the primary analysis region” over invented measurements.
3. Build a spacing inventory by semantic distance: within a control, within a component, between peers, between groups, between sections, and at page boundaries. Identify repeated families, ratios, exceptions, and proposed readability bounds.
4. Record geometric and optical alignment: edges, centers, baselines, decimals, icons, labels, values, repeated rows, and visual centers. Separate actual alignment evidence from capture distortion.
5. Describe density, whitespace, salience, overlap, surface depth, and dominant-to-supporting proportions by region. Explain what creates hierarchy without claiming business priority.

For every routed UI domain, describe its spatial anatomy and transformations. A statistics region must distinguish KPI-grid rhythm from chart-region proportion; a marketing surface must distinguish narrative section rhythm from reusable application-shell geometry.

## Output

Return the shared stage JSON for `prompt.spatial-composition` with:

- exactly five facet-coverage records;
- candidate space, size, layer, border, radius, elevation, and layout relationships;
- region and grid maps expressed in framework-neutral language;
- visible exceptions, collapse risks, and responsive handoffs;
- UI-domain contributions and stress tests.

## Guardrails

- Do not measure exact pixels from scaled or cropped screenshots.
- Do not interpret empty content as intentional whitespace without supporting repetition.
- Do not claim sticky, fixed, scroll, overflow, or responsive behavior from one frame.
- Do not force unrelated regions onto one grid or spacing scale.
- Aesthetic similarity is not a component or layout contract.
