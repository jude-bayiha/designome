# Analyze typography and content hierarchy

Read `_shared-contract.md`, the `axis.typography-content-hierarchy` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible text, value, label, metadata, and numeric samples
- Five typography facets and routed UI domains

## Task

Create a role-based typographic grammar without naming an unevidenced font:

1. Inventory display, page-title, section-title, component-title, body, label, input, metadata, caption, link, status, code, and data-value roles. Merge only roles with repeated relational evidence.
2. Describe relative size, weight, line height, tracking, case, color, decoration, and spacing. Identify the role transitions that establish hierarchy and the exceptions that carry special emphasis.
3. Evaluate readability relationships: line measure, paragraph rhythm, dense-label treatment, multi-line alignment, minimum apparent size, and the proposed bounds needed to keep compact UI legible.
4. Analyze numerals and structured values: unit placement, signs, decimals, percentages, currencies, dates, abbreviations, tabular alignment cues, primary value, comparison, target, timeframe, and freshness.
5. Record wrapping, clamping, ellipsis, growth zones, long-word risks, enlarged-text implications, alternate scripts, localization expansion, and RTL behavior as observed, inferred, proposed, or unknown.
6. Describe visible type character where resolution supports it: apparent glyph width, geometric or humanist cues, x-height relative to capitals, stroke contrast and numeral shapes. These observations can guide a later font comparison without identifying a font family. Record ambiguity from scale, antialiasing and perspective.
7. For the most important role transitions, propose audit-only size, line-height or spacing ranges/ratios with target roles, units, tolerance and a matched-region review. Numeric proposals must not masquerade as measurements of the original CSS.

For `domain.stats-kpis`, separately model label, primary value, unit, qualifier, trend, comparison, target, timeframe, and freshness hierarchy. For forms, distinguish persistent labels from placeholders. For marketing/editorial content, distinguish expressive display roles from utility text roles.

## Output

Return the shared stage JSON for `prompt.typography-content-hierarchy` with:

- exactly five facet-coverage records;
- semantic typography and size token candidates with roles and relationships;
- numeric-format and value-hierarchy rules;
- content-resilience and localization handoffs;
- calibration candidates where exact implementation bounds remain proposed.

## Guardrails

- Do not identify font families, font files, OpenType features, or exact metrics from resemblance.
- Do not turn every visually different text sample into a token.
- Do not call a type size accessible or readable without implementation and usage validation.
- Do not infer DOM heading levels from visual prominence.
- Short source copy never proves wrapping, localization, or overflow behavior.
- A declared CSS font stack does not prove the face actually rendered. Handoff font availability and fallback verification to the browser stage; keep substitute families proposed.
