# Analyze accessibility, inclusion, and localization

Read `_shared-contract.md`, the `axis.accessibility-inclusion-localization` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible labels, order, contrast, focus, controls, charts, media, and language
- Five accessibility and localization facets

## Task

Use screenshots to identify risks and verification needs, never to certify conformance:

1. Map probable headings, landmarks, lists, tables, forms, groups, labels, descriptions, roles, names, values, states, live regions, dialogs, and custom-control semantics. Keep DOM assertions unknown until implemented evidence exists.
2. Define keyboard requirements: logical focus order, visible focus, skip paths, trapping, restoration, roving focus, composite-widget navigation, shortcuts, and equivalents for pointer, drag, hover, and gesture actions.
3. Identify apparent contrast risks for text, controls, focus, graphics, statuses, and chart encodings. Require redundant icon, label, shape, pattern, position, or text meaning and tests for high contrast and forced colors.
4. Define tests for 200 percent text size, zoom, reflow, enlarged targets, low precision, reduced motion, reduced transparency, reading width, clipping, overlap, time pressure, error prevention, and cognitive clarity.
5. Analyze language expansion, pluralization, alternate scripts, names, addresses, dates, times, numbers, currencies, units, sorting, RTL, mirroring, directional icons, and mixed-direction identifiers.

For charts require text summaries and data alternatives where appropriate. For forms require explicit labels and error associations. For overlays require naming, focus containment, escape, and restoration. For mobile require large text, screen reader, safe-area, and touch-target validation.

## Output

Return the shared stage JSON for `prompt.accessibility-inclusion-localization` with:

- exactly five facet-coverage records;
- evidenced visual implications separated from implementation requirements;
- accessibility, localization, modality, and platform rules;
- a verification matrix naming the required DOM, browser, assistive-technology, contrast, zoom, direction, and motion checks;
- unknowns for every property screenshots cannot prove.

## Guardrails

- Do not certify WCAG, ARIA, platform accessibility, or localization support from screenshots.
- Visual order does not prove DOM or screen-reader order.
- Apparent contrast is not a measured ratio.
- A visible label does not prove an accessible name or association.
- A focus-looking outline does not prove focus behavior.
