# Review rubric: grammar, not copy

The rubric asks one question per screen: does this app follow the visual grammar of the source screenshots, and does it look as good, with its own content? It never rewards resemblance to a source screen. All five routes carry Relay's own content, so every route is a transfer test.

## What is scored

Score each aspect from 1 to 5 on each route. Every score cites one source relationship and the app region that follows or breaks it.

| Aspect                   | The app follows the source when                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Hierarchy and layout     | Region order, containment and the main/supporting split follow the source's logic                                     |
| Proportion               | Relative sizes of shell, regions, cards and controls stay in the source's ratios                                      |
| Spacing and density      | Insets, gaps, row rhythm and information density match the source's rhythm                                            |
| Type roles               | Each role (page title, section title, value, label, meta) keeps its relative size, weight and color                   |
| Color roles and surfaces | Semantic color roles, surface tiers, borders and depth follow the source; no new saturated roles appear               |
| Component anatomy        | Components keep their parts, order, alignment and variants, such as legend chips with a colored dot                   |
| Data display             | Charts and tables keep their encoding conventions: mark weight, gridlines, axis treatment, legend placement, emphasis |
| Identity rules           | Recurring distinctive relationships are followed as rules, such as "project marks are colored rounded-square tiles"   |

Scale:

- **5:** follows the source's grammar with no visible deviation.
- **4:** one minor deviation that a designer would fix in review.
- **3:** the grammar is recognizable, with one clear rule broken.
- **2:** several rules broken; the screen reads as a different design language.
- **1:** no relationship to the source's grammar.
- **n/a:** the route has nothing this aspect covers. Do not score it 5.

Rate **finish** (`strong`, `mixed`, `weak`) separately for each route: alignment, polish and readability as a product screen. Finish never changes the grammar scores.

## What is not scored

These are replaceable assets of the source product. They never earn or lose grammar points:

- logos, brand marks, product names;
- the exact icon glyphs, illustrations, photos and avatar artwork;
- copy, people, project names, numbers and dates;
- pixel similarity to a source screen.

An invented mark that follows the source's rule, such as a different glyph on a colored rounded tile, is a pass for identity rules. A copied mark that breaks the rule is still a fail.

## Copy flags

Record a copy flag, outside the scores, whenever the app reproduces a source asset or source content instead of the brief's: a logo, a distinctive illustration, a glyph set copied one for one, source copy, names or data. The brief supplies all content, so a copy flag is a defect of the run, not a sign of fidelity. Report copy flags next to the scores in the summary.

## Rule gaps

For every score of 3 or less, write the rule that would have prevented the miss in measurable form: a ratio, a bound, a weight or an order. "Bars are hairline strokes at most 4 px wide with 8 px gaps" is a rule; "bars are thin" is not. These gaps are the benchmark's main output for improving extraction.

## Aggregation

- Average each aspect per run over the routes where it applies, then per arm over its runs.
- Report the spread between runs of the same arm. When the gap between two arms is smaller than that spread, do not rank them.
- Do not combine grammar scores, finish and copy flags into one number.
- A reproduction of a source screen, if an operator adds one, is a diagnostic for missing rules and stays outside the ranking.
