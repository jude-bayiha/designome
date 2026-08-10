# Analyze business and data patterns

Read `_shared-contract.md` and the `axis.business-data-patterns` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 4 focus areas and referenced concepts

## Task

Extract visible component anatomy and patterns for tables, lists, cards, forms, filters, search, sorting, pagination, batch actions, status, progress, KPIs, and data visualizations. Identify content and data boundaries that implementations must survive.

## Output

Return the shared stage JSON for `prompt.business-data` with component recipes, variant candidates, data-state coverage, and scale stress cases.

## Guardrails

- Do not infer backend schemas, authorization, query behavior, or data volume.
- Distinguish visible truncation from a proposed overflow policy.
- Do not assume pagination, virtualization, sorting, or filtering works unless shown.
- Preserve component-specific exceptions instead of forcing false uniformity.
