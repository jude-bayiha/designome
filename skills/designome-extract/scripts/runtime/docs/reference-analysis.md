# Reference screenshot analysis — 2026-08-10 set

## Source health

| ID            | File        |  Dimensions | SHA-256                                                            | Useful coverage                                                         |
| ------------- | ----------- | ----------: | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `source.ed-1` | `ed-1.jpeg` | 3072 × 4096 | `af65121a2d22602919b1e89b660ae6a1a34b23448a64ae9d5c9aceaffbcc60f3` | Left application shell, navigation, and beginning of the main dashboard |
| `source.ed-2` | `ed2.jpeg`  | 3072 × 4096 | `5e6327c0782adf63748a21dfffd8eea1e8f0215818cbfc6a8aa062dd1b8ddee9` | Right dashboard actions, metrics, chart, and campaign rows              |

Both files are progressive JFIF JPEG images. Their overlapping labels, values, and geometry strongly indicate complementary crops of the same desktop dashboard and state. They support structural analysis, but not exact CSS dimensions, interaction behavior, responsive rules, or accessibility certification.

## Observed

- A persistent-looking vertical navigation region is separated from a light main canvas.
- The page proceeds from filtering controls to action summaries, performance metrics, larger analytics, and campaign rows.
- Cards use low-contrast surfaces and borders, with little dominant shadow.
- Summary cards repeat icon, label, value, supporting context, and optional action regions.
- Metric cells repeat label, value, direction indicator, and comparison.
- A large dotted revenue chart receives greater visual weight than adjacent analytics.
- Campaign rows align identity, waiting status, live posts, budget, revenue, and review action into stable columns.
- Accent colors are localized to primary actions, semantic icons, trends, and data series.
- Positive and negative trends combine color, direction symbols, and numeric text.
- Iconography is predominantly compact outline geometry, with filled or colored containers used for emphasis.

## Inferred

- Spatial relationships, nearby neutral surfaces, and thin borders carry more structural meaning than accent color.
- Analytic content follows a data-first hierarchy: identity or label, value, then interpretation or action.
- Card families use stable internal zones rather than arbitrary composition.
- The dashboard balances dense local controls with larger gaps between major sections.
- The icon language appears intentionally coherent, but no exact library can be identified from the screenshots.

Each inference must retain references to specific source regions in a real extraction run. The two crops are not independent proof when they show the same element.

## Proposed

The following are robustness proposals, not visible behavior:

- define loading, empty, no-results, partial, error, warning, success, stale, and disabled states where applicable;
- preserve card geometry while states change;
- stack or reorganize regions by semantic priority on narrow viewports;
- provide deliberate overflow behavior for long labels, descriptions, identifiers, and large values;
- preserve keyboard, touch, pointer, and assistive-technology outcomes;
- provide accessible alternatives for dense visualizations;
- use functional motion only when enabled, with reduced-motion and interruption behavior.

## Unknown

- Exact font family, weights, type sizes, line heights, and tracking.
- CSS viewport, device-pixel ratio, and export scaling.
- Exact color, radius, spacing, border, and elevation tokens.
- Hover, focus, pressed, selected, disabled, and keyboard behavior.
- Loading, empty, error, partial, stale, offline, and recovery behavior.
- Narrow viewport, zoom, localization, RTL, and dark-theme behavior.
- DOM order, semantics, accessible names, hit targets, live regions, and screen-reader announcements.
- Tooltip, chart navigation, data-table alternative, sorting, pagination, and large-data behavior.
- Product meaning behind the blue and dark primary-looking action variants.

## Visible strengths

- Clear reading hierarchy despite high information density.
- Repeated component anatomy and stable cross-card alignment.
- Calm neutral palette that reserves accent for meaning and action.
- Distinctive visualizations that remain consistent with surrounding surfaces.
- Rich campaign rows whose status and action remain easy to scan.

## Risks to forward-test

- Secondary text, thin borders, and dotted chart marks may have insufficient contrast in some environments.
- Compact metadata and controls may become difficult under zoom or touch input.
- Two visually strong action treatments need a semantic usage rule to prevent drift.
- Large numbers of chart marks need a text or table alternative.
- Short sample content hides overflow and localization failures.

The schema-valid [v0.3 example](../examples/design-dna.reference-v0.3.json) demonstrates how these categories remain separate while adding typed source classification, UI-domain routing, component anatomy/variants/states/composition, and complete 13-axis/65-facet/20-domain coverage. It intentionally uses relative token relationships instead of pretending to know exact production values.
