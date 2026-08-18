---
name: designome-audit
description: Audit generated or existing UI against an accepted Designome Design DNA and its stress cases. Use when a user asks whether a generated screen follows extracted design guidance, wants state, content, responsive, accessibility, motion, or data-scale findings, or needs a non-regression report before revising the Design DNA or implementation.
---

# Audit generated UI

Compare implementation evidence with accepted Design DNA. Keep static, rendered, interaction, and accessibility validation explicitly separate.

## Resolve the execution context

This skill works from either the Designome plugin or an installed target project.

- Plugin mode: when `../../prompts/12-generation-audit.md` exists, resolve the plugin root as `../..`. Read the shared contract, audit prompt, concept matrix, accepted Design DNA, and relevant generated files. Read only the axis prompts needed to interpret affected concepts.
- Project-local mode: when `../../../.designome/design-dna.json` exists, resolve the project root as `../../..`. Read the accepted Design DNA plus the generated documentation index, integration guidance, rules, and component states under the documentation directory recorded in `.designome/manifest.json`.

Stop if neither context can be resolved. Never guess which Design DNA or project is in scope.

## Workflow

1. Validate the Design DNA. In plugin mode, use the bundled helper. In project-local mode, use a `designome` executable already available in the environment when present; otherwise record deterministic validation as unavailable and continue with explicit evidence boundaries:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs validate-dna \
     --file <accepted-design-dna.json> \
     --require-accepted
   ```

2. When Designome is installed, verify managed artifacts with the same available helper. Do not install a package or dependency merely to obtain the command:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs verify-install \
     --project <target-project>
   ```

3. Establish available evidence: changed code, rendered screenshots, viewport set, state fixtures, interaction results, and accessibility checks.
4. Initialize or dry-run the executable audit when the helper is available:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs audit \
     --project <target-project> \
     --provider <auto|in-app-browser|existing-playwright|managed-playwright|static> \
     --dry-run
   ```

5. Route relevant matrix concepts and stress tests. Inspect long and unbroken content, nulls, extreme values, states, reflow, localization, modalities, data scale, media failure, visual stability, and motion mode as applicable.
6. Run repository checks only inside the audited target project. Do not run checks from the Designome plugin source unless the plugin itself is the audit target.
7. Produce `audit/plan.json`, `audit/evidence.json`, `audit/report.md`, and `audit/findings.json`. Each finding includes rule reference, evidence, severity, certainty, scope, suggested correction, and verification method.
8. After browser or interaction evidence is populated, evaluate it with `--evidence audit/evidence.json --overwrite`. Keep observed mechanical risks separate from proposed calibration candidates.
9. State which validation layers actually ran. Propose revisions, but do not modify the implementation without separate authorization.

## Guardrails

- Do not claim rendered, responsive, keyboard, screen-reader, motion, or runtime proof unless it was executed.
- Do not report an unaccepted proposal as a defect.
- Preserve documented exceptions.
- Distinguish an implementation deviation from an incomplete or contradictory Design DNA.
- Prefer the smallest corrective change and retain evidence for any proposed Design DNA revision.
- Prefer the host in-app browser, then an existing target-project Playwright setup. Do not install managed Playwright without explicit authorization.
