---
name: designome
description: Turn UI screenshots into evidence-backed Design DNA, install accepted Design DNA into a target project, and audit generated UI against it. Use when a user asks to analyze UI screenshots or derive reusable design rules and component guidance (extract), apply accepted guidance to a project with documentation, managed CSS and agent instructions (install), or check whether generated or existing UI follows that guidance, including states, content, responsive, accessibility, motion or data-scale findings (audit).
---

# Designome

Designome extracts a visual grammar from screenshots, not a copy. One skill covers the whole workflow: **extract** a draft Design DNA from screenshots, let the human accept it, **install** the accepted DNA into a target project, then **audit** generated UI against it. The host model does the visual reasoning; the bundled Node helper only performs deterministic metadata, validation, installation and audit operations.

Requires Node.js 24 or newer for deterministic commands.

## Resolve bundled files

Resolve every relative path in this skill, including paths inside `workflows/`, from the directory that contains this `SKILL.md`, independently of the current working directory. The plugin root is `scripts/runtime`. Convert it to an absolute path before invoking the helper; replace `<designome-plugin-root>` in the workflows with that path.

## Choose the operation

| Operation | The user wants to                                          | Requires                                                     | Workflow               |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `extract` | Derive design rules from UI screenshots                    | Readable screenshots                                         | `workflows/extract.md` |
| `install` | Apply accepted Design DNA to a project                     | An accepted Design DNA and an explicit target project        | `workflows/install.md` |
| `audit`   | Check generated or existing UI against accepted Design DNA | An accepted Design DNA, installed in the project or supplied | `workflows/audit.md`   |

1. Select the operation from the request. Use it as the `operation` of the request contract.
2. Read the selected workflow file completely before acting. Do not read the other workflows unless the request moves to their operation.
3. When a request spans several operations, such as "extract and install", run them in the order extract, human acceptance, install, audit. Stop at the acceptance gate: installation never starts from a draft.
4. When the operation is ambiguous, ask one short question instead of guessing. A screenshot path alone means `extract`; an accepted Design DNA with a project path and no screenshots means `install`; a request about generated screens means `audit`.
5. When `designome run` hands off a step, follow the operation named in its handoff.

## Shared guardrails

- Supplied screenshots are the only source of visual truth. A target project's CSS, components or rendered UI are integration context, never design evidence.
- Record rules, not assets. Logos, brand marks, icon glyphs, illustrations, photos, copy, names and data stay replaceable; record the rule they follow.
- Every claim uses exactly one status: `observed`, `inferred`, `proposed`, or `unknown`. Never present proposed behavior as observed.
- Never mark a Design DNA accepted on behalf of the human. Acceptance is the single human approval in the workflow, between extract and install.
- Never execute a path, preference, write, repair or dependency action that differs from the validated request contract.
- Never commit private screenshots or `.designome/runs/` artifacts.
