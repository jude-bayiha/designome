You review anonymized Android apps against a design grammar. You did not generate any of them.

Inputs:

- `{{REVIEW_DIR}}/sources/`: the source screenshots. They show the grammar to follow, not content to copy. They come from several products; `{{REVIEW_DIR}}/routing.md` says which subjects each one teaches. Judge each subject only against the screenshots routed to it.
- `{{REVIEW_DIR}}/apps/<letter>/<screen>.png`: the first screen of each app at 412 × 915 dp, rendered at 2x, and `<screen>.tall.png` for the same screen at 2400 dp high.
- `{{REVIEW_DIR}}/board-<screen>.png`: the same first screens side by side.
- `{{REVIEW_DIR}}/rubric.md`: the scoring rubric. Apply it exactly.
- `{{REVIEW_DIR}}/brief.md`: the content every app had to show.

Task:

1. Study the sources first and list, in your own words, the grammar rules they show for the subjects routed to them. Mark each rule `observed` or `inferred`.
2. For each app and each screen, score every rubric aspect from 1 to 5 or `n/a`, each with one concrete observation that names the source relationship and the app region.
3. Rate finish and platform fit per screen, and record copy flags.
4. For every score of 3 or less, write the measurable rule that would have prevented it.
5. Summarize per app: aspect averages, finish, platform fit, copy flags and the three most important rule gaps.

Write the result to `{{REVIEW_DIR}}/review.md`. Do not guess which arm produced an app, and do not reward resemblance to a source screen, matching logos, icons or content.
