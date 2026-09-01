# Concept matrix v0.3

The [v0.3 matrix](../concepts/concept-matrix.v0.3.json) is the canonical routing contract for deep UI extraction. It separates four structures that are often collapsed in shallow screenshot analysis:

- 13 specialist axes define independent reasoning passes;
- five mandatory facets per axis define 65 auditable UI/UX questions;
- 33 cross-cutting concepts preserve coherence between specialists;
- 20 UI domains route recognizable parts of an interface without inventing page families.

The matrix also owns prompt order, token and rule categories, the request-contract version, and the 51-document installation projection. A matrix change is therefore a contract change: schema, prompts, runtime, examples, skills, tests, and documentation move together.

## Thirteen specialist axes

|   # | Axis                                                | Senior-level responsibility                                                                              |
| --: | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
|   1 | Spatial composition and layout system               | Regions, containment, grids, alignment, rhythm, density, hierarchy, and depth                            |
|   2 | Typography and content hierarchy                    | Role-based type, readability, numeric treatment, wrapping, truncation, and content pressure              |
|   3 | Color, surfaces, assets, and visual identity        | Semantic color, themes, surfaces, depth, shape language, icons, imagery, and brand expression            |
|   4 | Component morphology and composition                | Anatomy, variants, density, states, composition, constraints, exceptions, and anti-patterns              |
|   5 | Navigation, information architecture, and task flow | Orientation, hierarchy, action priority, disclosure, continuity, and visible task structure              |
|   6 | Forms, input, and workflow integrity                | Labels, controls, selection, validation, formatting, save models, recovery, and sensitive input          |
|   7 | Data display, statistics, and visualization         | KPIs, comparisons, tables, lists, charts, scales, legends, precision, uncertainty, and alternatives      |
|   8 | Interaction, state machines, feedback, and motion   | Triggers, control and business states, feedback, exits, focus, modality, and functional motion           |
|   9 | Responsive, platform, and device adaptation         | Intrinsic reflow, containers, orientation, safe areas, virtual keyboards, device input, and conventions  |
|  10 | Accessibility, inclusion, and localization          | Semantics, reading/focus order, contrast, zoom, target size, modality, localization, and verification    |
|  11 | Content design, trust, privacy, and ethics          | Terminology, voice, actionability, provenance, permission, consequence, consent, and informed choice     |
|  12 | Perceived performance and resilience                | Loading, stability, scale, degradation, work preservation, recovery, and perceived latency               |
|  13 | Design system grammar and governance                | Semantic tokens, component contracts, provenance, coverage, integration, enforcement, and non-regression |

Every axis owns exactly five facets. Each facet has a stable ID, a testable question, an inspection checklist, and screenshot limits. A routed specialist must return a record for every owned facet. Unsupported facets are `unknown`; irrelevant UI domains can be `not-applicable`. Neither is omitted.

## Cross-cutting concepts

Concepts connect specialists that must reach one coherent result. The 33 concepts cover:

- spatial, typographic, color, surface, icon, asset, and brand systems;
- component anatomy, state coverage, affordance, navigation, information hierarchy, and disclosure;
- forms, validation, comparison context, visualization integrity, data scale, and content resilience;
- responsive reflow, platform conventions, modalities, spatial continuity, localization, and accessibility semantics;
- reversibility, feedback proportionality, motion, visual stability, and media resilience;
- content voice, trust/privacy/transparency, ethical interaction, and design-to-code governance.

Every concept declares reciprocal axis references, inspection targets, screenshot limits, stress tests, and output targets. Concepts prevent local specialist output from becoming contradictory—for example, a color specialist cannot define a positive/negative KPI meaning that the data specialist or trust specialist cannot justify.

## Twenty routable UI domains

UI domains are visible pattern families, not screens, roles, or product inventories.

| Domain                           | Includes                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Application shell and navigation | Persistent and contextual orientation structures                                     |
| Marketing and editorial content  | Heroes, narratives, proof, feature sections, calls to action, and long form          |
| Actions and controls             | Buttons, links, menus, toggles, segmented controls, and action groups                |
| Forms and data entry             | Inputs, selection, validation, uploads, staged editing, and save behavior            |
| Search, filter, and sort         | Query, refinement, scope, criteria, result counts, no-results, and reset             |
| Tables and lists                 | Dense collections, rows, columns, hierarchy, actions, selection, and navigation      |
| Cards and collections            | Bounded summaries, tiles, media items, and heterogeneous collections                 |
| Statistics and KPIs              | Values, units, context, deltas, targets, timeframes, precision, and freshness        |
| Charts and data visualization    | Encodings, axes, scales, legends, labels, annotations, uncertainty, and alternatives |
| Status and progress              | Badges, health, severity, progress, lifecycle, and state communication               |
| Overlays and disclosure          | Dialogs, drawers, sheets, popovers, menus, tooltips, and expanders                   |
| Media and galleries              | Images, video, audio, avatars, thumbnails, galleries, previews, and crops            |
| Messaging and notifications      | Conversation, activity, alerts, banners, toasts, inboxes, and unread state           |
| Calendars and timelines          | Dates, schedules, events, ranges, time zones, dependencies, and chronology           |
| Maps and spatial UI              | Maps, layers, markers, clusters, routes, regions, legends, and location detail       |
| Commerce and transactions        | Products, prices, carts, totals, checkout, payment, orders, and confirmation         |
| Authentication and onboarding    | Sign-in, verification, recovery, setup, permissions, and first-run progression       |
| Settings and configuration       | Preferences, defaults, inheritance, scopes, save models, and destructive controls    |
| Mobile native shell              | Safe areas, app bars, bottom regions, sheets, gestures, and system conventions       |
| Files and content management     | Upload, preview, versions, folders, metadata, transfer, processing, and lifecycle    |

Each domain declares detection cues, related axes and concepts, a specialist inspection contract, screenshot limits, and stress tests. One screenshot can route several domains. A dashboard may simultaneously support shell, control, table, card, KPI, chart, and status evidence.

Domain detection does not grant unlimited evidence. A capture marked `only` for `domain.stats-kpis` can support the visible KPI grammar but cannot silently support corporate-site navigation or mobile-native behavior.

## Per-source and global routing

Request contract v1.1 routes ordinary conversational instructions through:

- global `focusAxisRefs` and `focusUiDomainRefs`;
- per-source `axisRefs`, `conceptRefs`, `uiDomainRefs`, token categories, and rule categories;
- one evidence mode: `all`, `only`, `prefer`, or `exclude`.

The source-evidence stage classifies the visible surface and detects additional domains with evidence, confidence, and limitations. It may add visually supported routes but cannot override a hard per-source boundary.

This supports instructions such as:

```text
Use capture-1 and capture-2 only for statistics and charts.
Use capture-3 only for color, surfaces, and visual identity.
Adapt the result for a corporate website.
```

In direct mode, a target-specific accuracy claim still requires matching source families. Dashboard references do not establish corporate marketing composition, and desktop/web references do not establish a mobile-native shell. Explicit adaptation keeps unsupported destination rules `proposed`.

## Coverage contract

Design DNA v0.3 contains two complete ledgers:

1. `coverage.axes`: exactly 13 axis records, each with exactly the matrix's five facets;
2. `coverage.uiDomains`: exactly 20 domain records, including detected, requested, not-detected, and not-applicable domains.

Facet and domain records retain summary, epistemic status, evidence references, artifact references, gaps, and a validation method/status. Coverage completeness means every question has an honest record; it never means every question is visually proven.

## Documentation projection

The matrix owns `documentationLayoutVersion` and exactly 51 `documentationProjection` entries:

- 7 foundation documents;
- 6 typed component documents;
- 20 UI-domain pattern documents;
- 11 behavior documents;
- 7 governance documents.

Installation adds the dossier index, producing 52 files total. Specialized renderers expose component variants and composition, per-domain grammar, source routing, and full facet/domain coverage. Missing evidence becomes an `unknown` boundary or a `proposed` stress test in the stable expected path.

Changing a projected path, renderer, axis, facet, domain, or routing rule requires coordinated matrix, schema, prompt, runtime, test, skill, and documentation updates.

## Why multiple prompts

A monolithic prompt encourages shallow coverage, claim duplication, and status inflation. The v0.3 pipeline has intake, 13 specialist axes, synthesis, integration, and audit stages. Each specialist reads only its matrix slice and admitted evidence. Synthesis resolves conflicts into one canonical grammar; integration renders it without mining the target project; audit tests accepted rules against real implementation evidence.
