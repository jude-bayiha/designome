# Concept matrix

The [v0.2 matrix](../concepts/concept-matrix.v0.2.json) routes screenshot analysis through eight complementary axes and 18 cross-cutting concepts. An axis defines a focused pass. A concept defines a concern that must remain coherent across several passes and later implementation.

The matrix also declares `requestContractVersion`. Every prompt stage consumes the normalized request contract needed for its bounded work. Per-source directives are applied before axis analysis, so a capture restricted to colors or data patterns cannot become evidence for unrelated layout claims.

## Eight axes

|   # | Axis                                 | Primary question                                                           |
| --: | ------------------------------------ | -------------------------------------------------------------------------- |
|   1 | Perceptual foundations               | What creates immediate visual order and hierarchy?                         |
|   2 | Task architecture                    | How does the visible screen orient and move a user through a task?         |
|   3 | Interactions and state machine       | Which states, feedback, recovery, and modalities are required?             |
|   4 | Business and data patterns           | Which reusable component and data contracts are visible or necessary?      |
|   5 | Adaptation and inclusion             | How must meaning and action survive context, content, and ability changes? |
|   6 | Perceived performance and resilience | How does the UI remain stable and understandable during degradation?       |
|   7 | Content, trust, and privacy          | How do language, consequences, provenance, and permissions support trust?  |
|   8 | System and governance                | How do claims become reusable, installable, and verifiable rules?          |

## Cross-cutting concepts

| Concept                             | What it prevents                                         |
| ----------------------------------- | -------------------------------------------------------- |
| State and edge-case coverage        | Happy-path-only components                               |
| Iconographic coherence              | Mixed or ambiguous icon language                         |
| Content and layout resilience       | Long text, nulls, or extreme values breaking layout      |
| Semantic responsiveness and reflow  | Breakpoint-only layouts that lose task priority          |
| Localization and bidirectionality   | English-only geometry and direction assumptions          |
| Affordance and discoverability      | Controls that do not look or behave actionable           |
| Input-modality equivalence          | Pointer-only outcomes                                    |
| Spatial continuity                  | Lost focus, scroll, or orientation                       |
| Progressive disclosure              | Unnecessary initial complexity                           |
| Reversibility and forgiveness       | High-cost user mistakes                                  |
| Feedback and interruption budget    | Overuse of toasts, banners, or dialogs                   |
| Data-scale resilience               | Tables and charts that work only with sample data        |
| Asset and media resilience          | Broken crops, loading shifts, or missing fallbacks       |
| Visual stability                    | Layout shift and state-induced geometry changes          |
| Motion grammar                      | Decorative or inaccessible animation                     |
| Accessibility semantics             | Visual accessibility claims without implementation proof |
| Trust, permission, and transparency | Unexplained access, freshness, or consequences           |
| Design-to-code governance           | Guidance that cannot be installed or audited reliably    |

## Concept contract

Every concept declares:

- the axes that own part of its analysis;
- what the agent should inspect;
- what a screenshot cannot prove;
- stress cases for a generated UI;
- downstream artifacts that should carry the result.

This makes the matrix both an extraction checklist and an audit-routing contract. New concepts require all five fields and reciprocal axis references.

## Documentation projection

The matrix also owns `documentationLayoutVersion` and exactly 22 `documentationProjection` entries. Each entry binds a stable path and purpose to relevant concepts, token categories, rule categories, and a deterministic renderer. Installation adds the dossier index, producing 23 files in total.

This projection prevents the documentation surface from shrinking to whichever claims happen to be most abundant in one extraction. It does not authorize invention: missing evidence becomes an `unknown` boundary or a `proposed` stress test in the expected document. Changing a projected path, renderer, or routing contract requires coordinated matrix, schema, prompt, installer, test, and documentation updates.

## Why multiple prompts

A single prompt encourages shallow coverage, repeated claims, and lost uncertainty. Specialized prompts reduce the active context and produce reviewable fragments. The synthesis stage alone resolves duplication and contradictions, while the audit stage tests whether accepted rules changed the generated product outcome.
