# Analyze component morphology and composition

Read `_shared-contract.md`, the `axis.component-morphology` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Repeated controls, content structures, and visible variants
- Five component facets and routed UI domains

## Task

Promote a visual structure to a component candidate only when repetition, stable anatomy, or a clear semantic contract supports reuse:

1. Define required, optional, conditional, and repeatable parts. Give every part a purpose, content constraints, and applicable token references.
2. Define variants by purpose and selection condition, not merely appearance. Cover size, density, emphasis, intent, layout, media, and context variants; list unsupported combinations.
3. Build a state matrix for default, hover, focus, pressed, selected, disabled, read-only, loading, empty, error, success, warning, stale, and offline as applicable. Each state records trigger, feedback, exit, programmatic-state requirement, evidence status, and validation.
4. Define valid composition: parent-child ownership, sibling grouping, toolbars, field groups, cards, lists, nested surfaces, spacing ownership, repetition, and responsive transformations.
5. Preserve exceptions and anti-patterns. State when a deviation is one-off, when a new component is warranted, and which nesting, density, action, or variant combinations would collapse meaning.

Use UI-domain definitions to avoid generic components. A KPI card, media card, settings row, notification row, and commerce line item may share surface tokens while retaining different anatomy and state contracts.

## Output

Return the shared stage JSON for `prompt.component-morphology` with:

- exactly five facet-coverage records;
- v0.3 component candidates using typed anatomy, variants, states, composition rules, content constraints, adaptation rules, accessibility requirements, and anti-patterns;
- candidate component and state rules with evidence and exceptions;
- conflicts between apparent reuse and domain-specific behavior.

## Guardrails

- Repeated rectangles are not automatically one component family.
- A visual variant does not prove a supported implementation prop.
- Unshown states remain proposed or unknown.
- Do not force domain-specific exceptions into a universal primitive.
- Do not bind component contracts to React, Vue, shadcn/ui, CSS classes, or another framework during extraction.
