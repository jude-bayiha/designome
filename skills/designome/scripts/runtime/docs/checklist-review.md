# Checklist Design review

Designome ships Checklist Design 3.2.6 from [Checklist-Design/skills at bfae71e](https://github.com/Checklist-Design/skills/tree/bfae71e507b1b7c03c12e0756402b60eb80f5d14). The upstream entry point is shipped as `vendor/checklist-design/guide.md` to keep one discoverable skill. Its paths resolve relative to that guide. The two mode guides, index, all five catalogue families and MIT license are bundled with it. Updating Designome updates the pinned snapshot. The DNA installer ships project guidance separately.

## Review and repair

1. Identify the target, the user's task and the requested mode. Follow the bundled guide with its local index and relevant references. Use critique for a quick opinion on a rendered view. Use audit for an itemized checklist review. Honor explicit scope and mode. A code-only audit may answer structural questions. Record missing evidence for visual or behavioral questions.
2. Keep upstream review read-only. Use the available screenshot, Figma context or captured target. Record the reviewed route, state, viewport, catalogue revision and matching checklist links. In a DNA compliance audit, include these as supplemental evidence. A missing checklist item alone cannot establish a violation of accepted DNA.
3. If corrections are requested, reproduce actionable feedback on the target project using its authorized test or browser workflow. Change the implementation that produced the issue. Replay the same case and record before, after and remaining limitations. Keep unresolved items visible and distinguish product suggestions from verified defects. Feedback does not modify the accepted DNA or create a new global rule.

For maintainers, refresh the upstream commit, guide, references and license together. Check the index against the shipped files and exercise both mode routes before delivering an update.
