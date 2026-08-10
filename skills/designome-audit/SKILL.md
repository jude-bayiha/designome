---
name: designome-audit
description: Audit generated or existing UI against an accepted Designome Design DNA and its stress cases. Use when a user asks whether a generated screen follows extracted design guidance, wants state, content, responsive, accessibility, motion, or data-scale findings, or needs a non-regression report before revising the Design DNA or implementation.
---

# Audit generated UI

Compare implementation evidence with accepted Design DNA. Keep static, rendered, interaction, and accessibility validation explicitly separate.

## Resolve bundled files

Resolve paths relative to this `SKILL.md`. The plugin root is `../..`. Convert it to an absolute path before invoking the helper; replace `<designome-plugin-root>` below with that path.

Read completely before the audit:

1. `../../prompts/_shared-contract.md`
2. `../../prompts/12-generation-audit.md`
3. `../../concepts/concept-matrix.v0.2.json`
4. The accepted Design DNA and relevant generated files

Read only the axis prompts needed to interpret affected concepts.

## Workflow

1. Validate the Design DNA:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs validate-dna \
     --file <accepted-design-dna.json> \
     --require-accepted
   ```

2. When Designome is installed, verify managed artifacts:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs verify-install \
     --project <target-project>
   ```

3. Establish available evidence: changed code, rendered screenshots, viewport set, state fixtures, interaction results, and accessibility checks.
4. Route relevant matrix concepts and stress tests. Inspect long and unbroken content, nulls, extreme values, states, reflow, localization, modalities, data scale, media failure, visual stability, and motion mode as applicable.
5. Run repository checks only inside the audited target project. Do not run checks from the Designome plugin source unless the plugin itself is the audit target.
6. Produce `audit/report.md` and `audit/findings.json`. Each finding includes rule reference, evidence, severity, certainty, scope, suggested correction, and verification method.
7. State which validation layers actually ran. Propose revisions, but do not modify the implementation without separate authorization.

## Guardrails

- Do not claim rendered, responsive, keyboard, screen-reader, motion, or runtime proof unless it was executed.
- Do not report an unaccepted proposal as a defect.
- Preserve documented exceptions.
- Distinguish an implementation deviation from an incomplete or contradictory Design DNA.
- Prefer the smallest corrective change and retain evidence for any proposed Design DNA revision.
