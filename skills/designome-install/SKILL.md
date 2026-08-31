---
name: designome-install
description: Install accepted Designome Design DNA into an authorized target project with human-readable design documentation, repository-native styling context, managed CSS, agent guidance, checksums, conflict detection, and idempotency verification. Use when a user asks to apply extracted UI guidance to a project, generate Designome documentation or CSS artifacts, update AGENTS.md safely, or reinstall a revised accepted Design DNA.
---

# Install Design DNA

Install accepted guidance without treating the target project's existing UI as visual evidence.

## Resolve bundled files

Resolve paths relative to this `SKILL.md`. The plugin root is `../..`. Convert it to an absolute path before invoking the helper; replace `<designome-plugin-root>` below with that path.

Read completely before installation:

1. `../../prompts/_shared-contract.md`
2. `../../prompts/11-project-integration.md`
3. `../../docs/installation-contract.md`
4. The accepted Design DNA supplied by the user

## Workflow

1. Require an explicit target-project path and a Design DNA whose status is `accepted`. Confirm that source paths and notes contain no secret or private metadata that must be removed before the accepted file is copied into the target.
2. Inspect technical facts only: framework, package manager, source roots, CSS entry points, aliases, scripts, installed compatible libraries, styling systems such as Tailwind, existing UI-documentation paths, and applicable agent instructions.
3. Read every `AGENTS.md` that applies to the planned target files. Resolve the documentation directory, rule precedence (`complement`, `existing-first`, or `designome-first`), declared existing-rule paths, and styling strategy before writing. Natural-language instructions are resolved by the agent and passed explicitly to the deterministic helper.
4. Run the read-only diagnostic before the dry-run:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs doctor \
     --project <target-project> \
     --dna <accepted-design-dna.json>
   ```

5. Run a dry-run. Pass `--css-entry` when discovery is absent or ambiguous:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs install \
     --dna <accepted-design-dna.json> \
     --project <target-project> \
     [--css-entry <project-relative-css-entry>] \
     [--scope <css-selector>] \
     [--docs-dir <project-relative-directory>] \
     [--rule-precedence <complement|existing-first|designome-first>] \
     [--existing-rules <project-relative-path>] \
     [--styling <auto|css-variables|tailwind-utilities|shadcn-components>] \
     [--ui-kit <auto|none|shadcn>] \
     --dry-run
   ```

6. Review every planned create, update, delete, preserve, unchanged, and conflict action. A delete is valid only for obsolete documentation owned by the previous manifest whose checksum still matches. Stop on any conflict.
7. Execute the same command without `--dry-run` and add `--instructions-reviewed`. The runtime stages and validates files outside the project, journals application, writes the manifest last, verifies the result, cleans temporary state, and rolls back automatically on failure.
8. Verify managed files and marker blocks:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs verify-install \
     --project <target-project>
   ```

9. Verify that the configured documentation directory contains the generated index plus all 22 paths in the matrix `documentationProjection`. Every file must preserve explicit epistemic status; an `unknown` boundary or `proposed` stress test is valid when no accepted claim covers the subject.
10. Execute the install command a second time. Require zero creates, updates, or deletes and a successful verification.
11. Run the target project's relevant checks and report static validation separately from rendered or interaction validation.

## Guardrails

- Never install a `draft` or `superseded` Design DNA.
- Never overwrite a checksum conflict or manually modified managed block.
- Never preserve a stale flat generated document silently. Delete it only through checksum-verified manifest migration; otherwise stop with a conflict.
- Never rewrite `designome.overrides.css` after creating it.
- Never append duplicate imports or Designome guidance blocks.
- Do not inspect target CSS, components, or rendered UI for design extraction.
- Do not copy existing design documentation into the Design DNA. Record it as implementation context and apply the resolved precedence policy.
- When Tailwind is detected, prefer utilities and theme conventions; generated CSS remains a semantic token bridge, not a parallel component system.
- When `components.json` is detected, resolve shadcn/ui project context and prefer installed components, semantic variables, configured aliases, primitive base, and icon library. Never initialize or overwrite components without explicit authorization.
- Use `--ui-kit shadcn` only to record an explicit greenfield preference. Without `components.json`, it remains a proposed initialization step and never runs `shadcn init` automatically.
- Do not add a dependency merely because the target project already uses it.
- Stop when repository instructions prohibit or materially alter the planned writes.
- `doctor` and `--dry-run` are strictly read-only. A missing `package.json` must fail before `.designome`, documentation, CSS, guidance, or manifest files are created.
- A conflict report must preserve the expected owner, recorded checksum, observed checksum, refused operation, and safe resolutions. Never use force overwrite as a silent fallback.
