# Analyze content design, trust, privacy, and ethics

Read `_shared-contract.md`, the `axis.content-trust-ethics` matrix slice, and routed UI-domain slices.

## Inputs

- Admitted screenshot regions and evidence index
- Visible labels, headings, actions, explanations, messages, permissions, and provenance
- Five content, trust, and ethics facets

## Task

Extract a content grammar and identify trust dependencies:

1. Inventory terminology, naming, abbreviations, capitalization, sentence shape, CTA verbs, tone, formality, technicality, reassurance, and consistency across headings, labels, descriptions, metadata, help, empty states, and errors.
2. Evaluate microcopy for specificity: what happened, cause, scope, consequence, ownership, next step, recovery, and whether action labels describe the result rather than the control.
3. Record the label grammar as patterns, never as the source's words: the form of action labels (bare verb, verb and object, noun) and their length band in words, the case convention of each text role, the form and length band of navigation labels, whether a page title repeats the term of the navigation item that leads to it, whether one object, action or destination keeps one term across navigation, titles, actions and messages, and where icons stand without a label instead of beside one. The source's terms are replaceable content; only the pattern transfers.
4. Analyze permission, access, collection, sharing, retention, visibility, audience, consent, opt-in, opt-out, alternatives, and privacy explanations at the decision point.
5. Analyze source, owner, timestamp, freshness, synchronization, generated or estimated status, uncertainty, verification, limitations, and correction or trace actions.
6. Analyze destructive, financial, publishing, permission, privacy, and irreversible consequences. Identify confirmation, review, undo, cooling-off, asymmetric choices, hidden costs, forced continuity, manufactured urgency, manipulative defaults, or disproportionate friction as risks, not inferred intent.

For statistics and charts, require metric provenance, timeframe, comparison context, precision, freshness, and uncertainty when necessary for interpretation. For commerce, authentication, settings, files, or permission surfaces, route consequences and privacy to explicit unknowns when real policy is absent.

## Output

Return the shared stage JSON for `prompt.content-trust-ethics` with:

- exactly five facet-coverage records;
- terminology, voice, action-label, message, provenance, privacy, consent, and consequence rules;
- label grammar per role (form, length band in words, case) and term-continuity rules, written as patterns;
- proportionate reversibility and ethical-choice requirements;
- content stress cases for novice users, translated text, errors, empty states, stale data, and consequential decisions;
- policy, permission, legal, security, and data-handling unknowns routed to authorized owners.

## Guardrails

- Do not record the source's labels, names or terms as rules; record the pattern they follow.
- UI copy does not prove policy, permission, security, compliance, or data handling.
- Do not infer manipulative intent from appearance; report the observable interaction risk.
- Do not use color alone for status, urgency, or desirability.
- Confirmation safeguards must be proportionate to consequence.
- Preserve legal and policy questions as unknown rather than writing policy.
