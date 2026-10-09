# Analyze color, surfaces, assets, and visual identity

Read `_shared-contract.md`, the `axis.color-surface-identity` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible color, surface, icon, imagery, and brand cues
- Five color and identity facets
- Motion mode where asset or surface change implies transition

## Task

Extract semantic relationships instead of raw sampled palettes:

1. Inventory canvas, surface, elevated, inset, text, icon, border, action, focus, selection, destructive, warning, success, neutral, and data-series roles. Record pairings, hierarchy, repetition, and exceptions.
2. Describe nested surface tiers, borders, radii, elevation, transparency, scrims, overlays, selected and disabled states, and the strength of each depth cue.
3. Identify evidenced theme modes. For unshown dark, high-contrast, or branded modes, preserve semantic roles and propose verification without inventing palettes.
4. Analyze icon family, stroke/fill balance, optical size, bounding box, cap and corner language, alignment, semantic role, directionality, labels, and state treatment. Analyze imagery, avatar, logo, illustration, crop, mask, ratio, fallback, and placeholder implications.
5. Describe repeated visual-identity cues: shape language, saturation, contrast, photography, illustration, decoration, tone, and where expressive brand moments give way to neutral utility surfaces.
6. Record the accent budget: which roles may carry each saturated or high-contrast color, how many accented elements a typical screen shows, and the approximate share of screen area that stays neutral. Record where the darkest fill is used, such as only the primary action and the active navigation item, because overusing it changes the identity as much as a new hue does.
7. Record the tone of every fill that is not an action or a selection: progress bars, segmented indicators, meters and chart marks. Say whether each uses the accent, the darkest fill, a neutral grey or a status color, so a generator does not promote them to the accent by default.
8. Count the status colors. Record how many distinct saturated hues carry status, the order they follow (for example neutral, in progress, attention, done), the carrier of each (text, dot, tinted pill, icon) and whether statuses outside that set share a hue or stay neutral. A source with six status hues records six; do not reduce it to a preferred number.

For charts, separate categorical, sequential, diverging, status, selection, and annotation color roles. For theme-only sources, admit color and surface evidence but reject unrelated layout, component, or behavior claims.

## Output

Return the shared stage JSON for `prompt.color-surface-identity` with:

- exactly five facet-coverage records;
- semantic color, opacity, border, radius, elevation, layer, iconography, and asset token candidates;
- surface-tier, theme, icon, imagery, and visual-identity rules;
- contrast, fallback, crop, directionality, and motion handoffs;
- explicit uncertainty about source values and asset libraries.

## Guardrails

- Do not report screenshot RGB values as source design tokens.
- Do not identify an icon library, logo source, image license, or asset pipeline by resemblance.
- One theme cannot establish another theme.
- Relative visual contrast is not WCAG certification.
- Color alone is never a sufficient proposed status or chart encoding.
