# Analyze component morphology and composition

Read `_shared-contract.md`, the `axis.component-morphology` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Repeated controls, content structures, and visible variants
- Five component facets and routed UI domains

## Task

Promote a visual structure to a component candidate only when repetition, stable anatomy, or a clear semantic contract supports reuse:

1. Define required, optional, conditional, and repeatable parts. Give every part a purpose, content constraints, and applicable token references.
2. Record the proportions that make each component recognizable: height relative to the body text or the row pitch, radius relative to height (fully rounded, rounded or square), border or stroke width band, icon size relative to its label, internal padding relative to peer gap, and the weight band of each text part. Prefer these ratios to absolute pixels.
3. Define variants by purpose and selection condition, not merely appearance. Cover size, density, emphasis, intent, layout, media, and context variants; list unsupported combinations.
4. Build a state matrix for default, hover, focus, pressed, selected, disabled, read-only, loading, empty, error, success, warning, stale, and offline as applicable. Each state records trigger, feedback, exit, programmatic-state requirement, evidence status, and validation.
5. Define valid composition: parent-child ownership, sibling grouping, toolbars, field groups, cards, lists, nested surfaces, spacing ownership, repetition, and responsive transformations.
6. Count the variants of every repeated component across all admitted screenshots, such as KPI tiles, list rows, cards, chips and badges. When the same component keeps one anatomy everywhere, record that as a rule with its parts, order and proportions, so a generator reuses one recipe on every screen. When it varies, record each variant with its selection condition; an unexplained second look is a contradiction to report, not a variant.
7. Record how content stays inside its container: the width or line limit of chips, badges, labels and cells, the minimum visible characters of each text part, which part yields first, and what happens past the limit (ellipsis, wrap, a dropped optional part, "+N" overflow count, clipping). Mark the behavior `unknown` when no long content is visible.
8. State the need each component serves, in words a different product can match, such as "shows a connected outside service with its health, a few usage figures and a switch to turn it on", not "integration card". Synthesis indexes recipes by these needs, so a generator reuses the recipe whenever a new product has the same need, including on screens the sources never showed.
9. Preserve exceptions and anti-patterns. State when a deviation is one-off, when a new component is warranted, and which nesting, density, action, or variant combinations would collapse meaning.

Use UI-domain definitions to avoid generic components. A KPI card, media card, settings row, notification row, and commerce line item may share surface tokens while retaining different anatomy and state contracts.

For each variant, describe a concrete change to part presence, order, alignment, density, emphasis or action placement and the condition selecting it. Each condition and difference has an independent assertion; generic restatements of the variant name are insufficient. Independently label every state field and every composition, content, adaptation and accessibility requirement. The visible selected appearance cannot prove keyboard selection, ARIA state or the effect of activation.

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
