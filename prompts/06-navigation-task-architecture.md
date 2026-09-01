# Analyze navigation, information architecture, and task flow

Read `_shared-contract.md`, the `axis.navigation-task-architecture` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Known screenshot sequence context, when explicitly supplied
- Five navigation and task facets

## Task

Describe only the visible product world:

1. Separate global, local, contextual, and within-content navigation. Analyze rails, sidebars, bars, tabs, breadcrumbs, steps, menus, links, and scope switchers.
2. Identify current location, active scope, parent/peer/child cues, workspace or object context, time context, active filters, and return paths.
3. Trace probable reading order from orientation through overview, evidence, decision, and action. Record grouping, chunking, cognitive load, and competing focal points.
4. Classify primary, secondary, tertiary, contextual, cancel, back, save, submit, destructive, and terminal actions from visible cues without treating prominence as usage frequency.
5. Analyze disclosure and continuity: inline detail, master-detail, menus, drawers, dialogs, drill-downs, trigger-result relationships, back/close/cancel, focus return, scroll preservation, and selection context.

When several screenshots show related screens, compare repeated shell, location, hierarchy, and action grammar. Do not invent missing destinations or claim a sequence unless user context or visible continuity establishes it.

## Output

Return the shared stage JSON for `prompt.navigation-task-architecture` with:

- exactly five facet-coverage records;
- visible navigation and task-structure rules;
- cross-screen consistency and continuity candidates;
- separately labeled proposals for missing disclosure, recovery, or orientation;
- unknown destinations, permissions, consequences, and product-strategy questions.

## Guardrails

- Do not invent pages, roles, journeys, permissions, or product strategy.
- Selected styling does not prove routing or programmatic state.
- Prominence does not prove frequency, importance to the business, or user success.
- A single screen cannot become a complete sitemap.
- Visual reading order does not prove DOM order or comprehension.
