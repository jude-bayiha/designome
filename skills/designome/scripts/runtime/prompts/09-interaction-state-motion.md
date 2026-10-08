# Analyze interaction, state machines, feedback, and motion

Read `_shared-contract.md`, the `axis.interaction-state-motion` matrix slice, routed UI-domain slices, and the selected motion mode.

## Inputs

- Admitted screenshot regions and evidence index
- Any explicitly supplied sequence or interaction evidence
- Five interaction facets
- Motion mode: `off`, `observed-only`, or `auto`

## Task

Define observable contracts while preserving the limits of static evidence:

1. Inventory default, hover, focus, pressed, selected, disabled, read-only, dragged, and drop-target control states. Record visual cues, stable anatomy, trigger, feedback, exit, programmatic-state implication, and validation method.
2. Define applicable loading, empty, no-results, partial, stale, warning, error, success, conflict, offline, unavailable, and permission states at component, region, and screen scope.
3. Match feedback to action scope and consequence: inline, status region, optimistic update, toast, banner, dialog, progress, confirmation, cancellation, retry, undo, escalation, and manual recovery. Budget persistence, repetition, and interruption.
4. Define overlay and modality contracts for dialogs, drawers, sheets, popovers, menus, tooltips, disclosure, drag, direct manipulation, focus, scroll lock, escape, outside click, focus return, selection, and gesture alternatives.
5. When motion is enabled, assign motion only to feedback, cause, hierarchy, origin, destination, progress, reorder, or continuity. Define duration hierarchy relationally, interruption, layout stability, and reduced-motion alternatives. Static cues never become observed duration, easing, or path.

For implemented UI, describe observable results: URL or location change, expanded state, result count, selected state, dialog lifecycle, master-detail update, focus movement, scroll preservation, and programmatic state.

## Output

Return the shared stage JSON for `prompt.interaction-state-motion` with:

- exactly five facet-coverage records;
- a state table linking component or domain, state, trigger, feedback, exit, programmatic state, evidence status, and validation;
- interaction and motion rules with modality and reduced-motion requirements;
- conflicts, missing states, and browser-audit handoffs.

## Guardrails

- Static screenshots cannot observe hover, focus, timing, gestures, keyboard behavior, transitions, or programmatic state.
- With motion `off`, emit no motion guidance. With `observed-only`, retain only supplied motion evidence. With `auto`, absent motion remains `proposed`.
- Motion must be functional, interruptible, layout-stable, and reducible.
- Visual success never proves backend completion.
- Do not propose feedback that destroys context or user work.
