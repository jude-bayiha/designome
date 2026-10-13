# Finish checklist

Read `_shared-contract.md` first. This checklist lists the micro-details that make two interfaces with the same structure look different. Each axis prompt covers its own section; synthesis walks the whole list before writing the Design DNA.

## How to use it

- For every item that applies to a visible subject, record a measure: a ratio, an order, a count, a lightness relative to the canvas, a weight band of one step, or a position. An adjective alone ("subtle", "clean", "soft") is not a measure.
- Record absence only when it is visible: "rows have no zebra tint" is a claim; a cue hidden by resolution, crop or compression is `unknown`.
- Faint cues count. A fill two lightness steps off the canvas, a 1px bottom edge or a second border tone is recorded with its strength, never rounded to "none".
- Record the rule, never the asset: a glyph's style and size, not the glyph; a label's case and length, not its words.
- An item that no admitted screenshot shows stays out of the claims, or becomes `unknown` when a generator is likely to need it.

## A. Canvas, surfaces and borders

1. Canvas tone of each shell region (top bar, sidebar, content area) relative to each other: same tone, or which one is tinted and by how much.
2. Card and panel fill relative to the canvas, and whether panels have a header band; the band's tint relative to the panel body and whether a hairline closes it.
3. Border tiers per surface type: containers, controls, inputs, dividers, header cells. Give their order from lightest to darkest and whether a tier has no border.
4. Divider geometry: full-bleed or inset, the inset relative to the container padding, vertical dividers (between top-bar segments, between table header cells) and which regions have none.
5. Radius family: radius of containers, controls, pills and tiles relative to their height, and nested radius relative to the parent radius minus the inset.
6. Elevation per component: none, a 1px darker bottom edge, a soft shadow, or an inner highlight, with its strength band. Name the components that are raised (often buttons, active segments, menus) and the ones that are flat (often cards).
7. Selection and active fills: the tint of the active navigation item, the selected segment and selected rows relative to the canvas, and the inset of that fill from the container edges.
8. Text tone ladder: count the grey levels used for text (primary, secondary, muted, placeholder, disabled) and give their order and approximate lightness. Say which roles share a level.
9. Icon tone relative to adjacent text: same ink, one level lighter, or muted.
10. Status treatment per status: carrier (text, dot, tinted pill, bordered pill), fill tint, border tone and text tone relative to the same hue.
11. Decoration: gradients, noise, blur, transparency, illustrations or none.

## B. Typography

1. Weight band per role, one step wide, with its most likely value, and the total number of weights in use.
2. Size ratio of each role to the body text, including display numerals, table header and cell text, captions, badges and button labels.
3. Gap between stacked pairs (label and value, title and caption, value and description) relative to the body text; the inline qualifier's size ratio and baseline alignment to its value.
4. Line-height ratio of single-line UI text and of multi-line descriptions; the maximum lines a description shows before it stops.
5. Letter-spacing tendency: tighter on large numerals, wider on uppercase labels, or neutral.
6. Case per role: title case, sentence case or uppercase for navigation, buttons, headings, table headers and badges.
7. Numeral formatting: tabular or proportional figures in tables and KPIs, unit and currency placement, decimals, separators, abbreviations such as "k", and how signs and percentages are wrapped (parentheses, color, arrow).
8. Type classification per role (sans-serif kind, serif, monospace) and its apparent width, even when the family is unknown.

## C. Spacing, proportion and scale

1. Scale anchor: the body-text size as a fraction of the UI's own width, and the row pitch, top-bar height, sidebar width and nav-item height relative to the body text.
2. Container padding relative to the gap between sibling containers, and the gap between sections relative to the gap between peers.
3. Alignment anchors: whether card content, table first-column text and section titles share one left edge, and how far that edge sits from the container border.
4. Icon-to-label gap in navigation, buttons and list rows relative to the body text.
5. Sibling panels in one row: shared height, and whether each is filled by its content.
6. Horizontal rules between bands (for example under the action row): presence, inset and the space above and below relative to the section gap.
7. Equal-width or weighted columns in rows of cards, and the ratio between unequal panels.

## D. Controls and components

1. Each button type: fill relative to the canvas, border tier, elevation cue, height relative to the body text, radius relative to height, leading or trailing icon, icon size and gap, and trailing chevron for menus.
2. Icon-only buttons: square or round, tinted or bordered, size relative to the row or the text they sit next to.
3. Inputs and search: height, border tier, leading icon, placeholder tone, trailing keyboard-hint chips (their border, tint and size), and focus treatment when visible.
4. Segmented controls and tabs: track tint, active segment fill and elevation, inset between track and segment, label weight change on the active segment.
5. Badges and count pills: filled or outlined, height relative to the text beside them, radius, and placement (trailing in a nav item, inline after a title).
6. Progress and meters: track height relative to the body text, track tint, fill tone, end caps, and whether a value label sits beside, above or inside.
7. Icon tiles: size relative to the text they introduce, radius, tint and position (above the label or inline).
8. List rows and action rows: leading tile, trailing affordance (arrow, chevron, switch), dividers between rows, and hover or selection tint when visible.
9. Profile or account block: position, anatomy (avatar, name, secondary line, chevron) and separator above it.
10. Switches, checkboxes, radios, selects and menus when visible: size relative to text, track and thumb tones, checked fill.

## E. Iconography

1. Style: outlined or filled, and whether the set mixes both by role.
2. Stroke weight relative to the weight of adjacent text, and cap and corner roundness.
3. Size relative to the cap height or size of the label, per context (navigation, buttons, tiles, table glyphs).
4. Functional glyphs: sort indicators (filled triangles, outlined chevrons, arrows), disclosure chevrons, external-link arrows, overflow dots, close marks. Record style, tone and position in the cell or control.

## F. Data display

1. KPI tiles: part order, value-to-label size and weight ratios, qualifier color roles and their wrapping (plain text or parentheses), description line limit, tile height relative to the body text.
2. Tables: row height and header height relative to the body text, header text tone and size relative to cells, header tint, vertical dividers (header only, all rows, none), zebra or not, numeric alignment, first-column inset, action column header label, overflow button treatment, and the edge at the last visible row.
3. Charts: mark thickness relative to the pitch, mark corner radius (top only or all), mark tones and the single highlight, gridline pattern (dashed or solid, tone), axis label tone, size and units format, tick count, baseline, legend presence and position, plot padding relative to the card padding, and the view toggle when present.
4. Grouping rows in lists and tables: tint, height and label style.

## G. Shell and navigation

1. Top bar anatomy in order: brand, collapse toggle, separator, location crumb with icon, search position and width share, filter or utility icons, locale or account controls.
2. Sidebar: item count per group, group separators (hairline, space, label), active item treatment (fill, left bar, weight change, icon tone), badges, and the bottom block.
3. Page action row: position of secondary and primary actions, their alignment and the rule that closes the row.
4. Collapse and responsive cues when visible.

## H. Content tone and microcopy patterns

1. Label length bands (navigation nouns, button verbs, KPI labels, panel subtitles) in words or characters.
2. Placeholder phrasing pattern (question, imperative, example) and its tone.
3. Empty or zero values and their formatting when visible.
