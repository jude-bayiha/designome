# Analyze forms, input, and workflow integrity

Read `_shared-contract.md`, the `axis.forms-input-workflows` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible controls, labels, instructions, values, validation, and workflow cues
- Five form and workflow facets

## Task

Analyze form grammar from field to end-to-end visible workflow:

1. Record persistent labels, legends, instructions, descriptions, examples, units, placeholders, required or optional markers, field grouping, and dependent-field explanations.
2. Classify input and selection models: text, number, search, select, combobox, checkbox, radio, switch, date, time, range, file, segmented, compound, single, multiple, hierarchical, and batch selection.
3. Define required validation coverage: inline, summary, blocking, advisory, async, warning, error, success, conflict, partial success, and retry. Preserve input, identify correction focus, and make messages specific and actionable.
4. Analyze single-step, staged, wizard, inline edit, bulk edit, review, confirmation, autosave-looking, draft, submit, cancel, undo, and discard cues. Keep persistence and side effects unknown unless evidenced.
5. Analyze format-sensitive and sensitive data: dates, times, numbers, currency, percentages, phone, identifiers, masks, reveal/copy, locale, paste, autofill, upload, scanning, input mode, and virtual keyboard implications.

For search/filter UI, distinguish query, scope, active criteria, results, reset, no-results, and small-screen disclosure. For settings, distinguish immediate, staged, and unknown save models. For commerce or authentication, preserve consequence and privacy handoffs.

## Output

Return the shared stage JSON for `prompt.forms-input-workflows` with:

- exactly five facet-coverage records;
- form and workflow component candidates with typed states;
- label, validation, formatting, save, recovery, privacy, and localization rules;
- input-modality, accessibility, platform, and resilience handoffs;
- explicit unknowns for parsing, persistence, permissions, and backend validation.

## Guardrails

- Appearance does not prove native versus custom controls.
- Placeholder text does not replace a proposed persistent accessible label.
- Do not infer validation timing, input modes, autofill, persistence, or server effects from a static frame.
- Never discard user input as a proposed recovery strategy.
- Destructive and consequential workflows require proportionate safeguards, not universal confirmation dialogs.
