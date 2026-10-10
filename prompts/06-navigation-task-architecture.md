# Analyze navigation, information architecture, and task flow

Read `_shared-contract.md`, the `axis.navigation-task-architecture` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Known screenshot sequence context, when explicitly supplied
- Five navigation and task facets

## Task

Describe only the visible product world:

1. Separate global, local, contextual, and within-content navigation. Analyze rails, sidebars, bars, tabs, breadcrumbs, steps, menus, links, and scope switchers. Record the navigation budget: destinations per group, the number of groups and how each is labeled, and how many depth levels show at once, with the carrier of each level (sidebar or rail, tabs, breadcrumb, back control).
2. Identify current location, active scope, parent/peer/child cues, workspace or object context, time context, active filters, and return paths. Record every carrier of the current location (tint, weight, indicator bar, icon fill, accent), whether the page title repeats the term of the active navigation item, and where the way back sits on a screen below a top-level destination.
3. Trace probable reading order from orientation through overview, evidence, decision, and action. Record grouping, chunking, cognitive load, and competing focal points.
4. Classify primary, secondary, tertiary, contextual, cancel, back, save, submit, destructive, and terminal actions from visible cues without treating prominence as usage frequency. Count the action budget: primary-styled actions per screen, region and dialog, inline actions a row or card shows before an overflow menu, the order of primary, secondary and cancel actions, and how a destructive action is set apart (position, tone, divider or menu).
5. Analyze disclosure and continuity: inline detail, master-detail, menus, drawers, dialogs, drill-downs, trigger-result relationships, back/close/cancel, focus return, scroll preservation, and selection context. Record the disclosure grammar the screenshots show even when what lies behind it does not: each trigger type ("View all" link, count, chevron row, overflow menu, collapsed section, tab, drawer handle), what it attaches to, how many items a preview shows before it, how the trigger says what it reveals, and which content stays outside any disclosure, such as the primary action, required fields, status and errors. Content behind a closed trigger stays `unknown`.

When several screenshots show related screens, compare repeated shell, location, hierarchy, and action grammar. Do not invent missing destinations or claim a sequence unless user context or visible continuity establishes it.

## Output

Return the shared stage JSON for `prompt.navigation-task-architecture` with:

- exactly five facet-coverage records;
- visible navigation and task-structure rules;
- cross-screen consistency and continuity candidates;
- navigation, location, action, and disclosure budgets as counts, orders, and carriers;
- separately labeled proposals for missing disclosure, recovery, or orientation;
- unknown destinations, permissions, consequences, and product-strategy questions.

## Guardrails

- Do not invent pages, roles, journeys, permissions, or product strategy.
- Selected styling does not prove routing or programmatic state.
- Prominence does not prove frequency, importance to the business, or user success.
- A single screen cannot become a complete sitemap.
- A count is the budget the design carries on this capture, not the product's full set of destinations or actions.
- Visual reading order does not prove DOM order or comprehension.
