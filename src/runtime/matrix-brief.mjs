// Extraction needs every matrix identifier and inspection question, but not
// the documentation projection or prompt registry. A compact Markdown view
// carries the same extraction content in a fraction of the pretty JSON.

const list = (values = []) => values.join('; ');
const ids = (values = []) => values.map((value) => `\`${value}\``).join(', ');

export function renderMatrixBrief(matrix) {
  return [
    `# Concept matrix ${matrix.matrixVersion}: extraction brief`,
    '',
    'Generated from the canonical matrix JSON, which stays authoritative. It omits only the documentation projection and the prompt-stage registry. Use these exact identifiers in request contracts, fragments and Design DNA.',
    '',
    `- Epistemic statuses: ${ids(matrix.epistemicStatuses)}`,
    `- Token categories: ${ids(matrix.tokenCategories)}`,
    `- Rule categories: ${ids(matrix.ruleCategories)}`,
    '',
    '## Axes and facets',
    '',
    ...matrix.axes.flatMap((axis) => [
      `### \`${axis.id}\` ${axis.name}`,
      '',
      `${axis.purpose} Prompt: \`${axis.promptRef}\`. Concepts: ${ids(axis.conceptRefs)}.`,
      '',
      ...axis.facets.map(
        (facet) =>
          `- \`${facet.id}\` ${facet.name}: ${facet.question} Inspect: ${list(facet.inspect)}. Screenshot limits: ${list(facet.screenshotLimits)}.`,
      ),
      '',
    ]),
    '## Concepts',
    '',
    ...matrix.concepts.map(
      (concept) =>
        `- \`${concept.id}\` ${concept.name}: ${concept.description} Axes: ${ids(concept.axisRefs)}. Inspect: ${list(concept.inspect)}. Screenshot limits: ${list(concept.screenshotLimits)}. Stress tests: ${list(concept.stressTests)}. Outputs: ${list(concept.outputTargets)}.`,
    ),
    '',
    '## UI domains',
    '',
    ...matrix.uiDomains.map(
      (domain) =>
        `- \`${domain.id}\` ${domain.name}: ${domain.description} Detection cues: ${list(domain.detectionCues)}. Axes: ${ids(domain.axisRefs)}. Concepts: ${ids(domain.conceptRefs)}. Inspect: ${list(domain.inspect)}. Screenshot limits: ${list(domain.screenshotLimits)}. Stress tests: ${list(domain.stressTests)}.`,
    ),
    '',
  ].join('\n');
}
