# Agent Working Rules

Designome is an agent-native project that turns UI screenshots into reusable design guidance. Supplied screenshots are the only source of visual truth.

## Philosophy

Designome extracts a visual grammar, not a copy. A screenshot is studied for the relationships that make it well designed, such as hierarchy, proportion, rhythm, density, surface tiers, type roles, component anatomy and chart conventions. Those relationships become durable rules that let a different product, with its own content and brand, reach the same quality. Reproducing the source screen is never the goal.

- Treat logos, brand marks, icon glyphs, illustrations, photos, copy, names and data as replaceable assets of the source product. Record the rule they follow, such as "project icons are colored rounded-square tiles with a white glyph", never the asset itself.
- Write rules a generator can apply on screens the source never showed. Prefer measurable, transferable relationships (ratios, bounds, weights, orders) over adjectives such as "thin" or "clean"; a rule that cannot be applied is lost.
- Judge success on new screens with different content: do they follow the grammar and look as good? Pixel similarity, matching assets and copied content are not success. Reproducing a source screen is only a diagnostic for missing rules.
- Do not make the source screenshots a generation input in target projects. The rules must carry the grammar on their own.

## Product scope

- Write repository content, code comments, commit messages, branch metadata, and pull-request content in English.
- Do not reconstruct unrequested page families or user roles.
- Do not introduce a heavy local CV, OCR, or ML pipeline. The host's multimodal model performs the analysis.
- A target project is a technical integration destination only. Never use its CSS, components, or UI as Design DNA evidence.
- Every claim uses exactly one status: `observed`, `inferred`, `proposed`, or `unknown`.
- Behavior absent from a screenshot may be proposed, but never presented as observed.

## Required workflow

1. Read the matrix and only the prompts needed for the task.
2. Preserve the evidence, confidence, exceptions, and limits of every claim.
3. Keep prompts specialized; do not recreate a monolithic prompt.
4. Update the matrix, schema, prompts, and documentation together when a contract changes.
5. Run `pnpm check` before delivery.

## Git and delivery

- Create branches from `main` as `<type>/task-<short-description>`.
- Use Conventional Commits with short scopes such as `repo`, `matrix`, `prompts`, `installer`, or `docs`.
- Produce coherent micro-commits; do not mix governance, contracts, prompts, and documentation without a reason.
- Deliver every change through a pull request. Document the objective, changes, validation, risks, and limitations.
- Never commit secrets, `.env` files, private screenshots, target projects, or `.designome/runs/` artifacts.

## Proportionate validation

- Documentation only: formatting, markdownlint, references, and `git diff --check`.
- Matrix or schema: `pnpm validate` and `pnpm test`.
- Prompts: structural validation, then a forward test on known screenshots before promotion.
- Installation: test two consecutive runs, preservation of overrides, and detection of manual changes.

`README.md` is the product entry point. `docs/architecture-and-methodology.md` describes the pipeline, and `docs/concept-matrix.md` explains the matrix.
