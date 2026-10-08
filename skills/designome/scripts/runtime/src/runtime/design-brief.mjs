import { designValue } from './documentation.mjs';

// The brief is the dossier's entry point: one compact read that carries every
// accepted artifact's statement and status. Evidence, confidence, routing and
// validation details stay in the topic files it links to.

const statusTag = (status) => `\`${status ?? 'unknown'}\``;
const sentence = (text) => String(text ?? '').trim();
const joined = (values = [], separator = '; ') =>
  values.map(sentence).filter(Boolean).join(separator);

function qualitiesSection(dna) {
  const qualities = dna.fidelity?.qualities ?? [];
  if (qualities.length === 0) return [];
  return [
    '## Signature qualities',
    '',
    'Preserve these first; they make the interface recognizable.',
    '',
    ...qualities.map((quality, index) => {
      const failures = joined(quality.failureModes);
      return `${index + 1}. **${quality.name}** (${quality.priority}) ${statusTag(quality.claim.epistemicStatus)} ${sentence(quality.claim.statement)}${failures ? ` Breaks when: ${failures}.` : ''}`;
    }),
    '',
  ];
}

function tokensSection(dna) {
  if (dna.tokens.length === 0) return [];
  const categories = new Map();
  for (const token of dna.tokens) {
    if (!categories.has(token.category)) categories.set(token.category, []);
    categories.get(token.category).push(token);
  }
  return [
    '## Tokens',
    '',
    ...[...categories].flatMap(([category, tokens]) => [
      `### ${category}`,
      '',
      ...tokens.map((token) => {
        const exceptions = joined(token.claim.exceptions);
        return `- \`${token.id}\` ${statusTag(token.claim.epistemicStatus)} ${sentence(designValue(token.value))}${token.role ? ` Role: ${sentence(token.role)}` : ''}${exceptions ? ` Except: ${exceptions}.` : ''}`;
      }),
      '',
    ]),
  ];
}

function rulesSection(dna) {
  if (dna.rules.length === 0) return [];
  const categories = new Map();
  for (const rule of dna.rules) {
    if (!categories.has(rule.category)) categories.set(rule.category, []);
    categories.get(rule.category).push(rule);
  }
  return [
    '## Rules',
    '',
    ...[...categories].flatMap(([category, rules]) => [
      `### ${category}`,
      '',
      ...rules.flatMap((rule) => [
        `- **${rule.name}** (${rule.strength}) ${statusTag(rule.claim.epistemicStatus)} ${sentence(rule.claim.statement)}`,
        ...(rule.requirements ?? []).map(
          (requirement) => `  - ${sentence(requirement)}`,
        ),
      ]),
      '',
    ]),
  ];
}

function componentLines(component) {
  const anatomy = (component.anatomy ?? []).map(
    (part) =>
      `${part.name} (${part.requirement})${part.purpose ? `: ${sentence(part.purpose)}` : ''}`,
  );
  const variants = (component.variants ?? []).map(
    (variant) =>
      `${variant.name} ${statusTag(variant.epistemicStatus)}${variant.differences?.length ? `: ${joined(variant.differences)}` : ''}`,
  );
  const states = (component.states ?? []).map(
    (state) =>
      `${state.name} ${statusTag(state.epistemicStatus)}${state.feedback ? `: ${sentence(state.feedback)}` : ''}`,
  );
  const list = (label, values) =>
    values.length ? [`- ${label}: ${values.join(' | ')}`] : [];
  return [
    `### ${component.name} ${statusTag(component.claim.epistemicStatus)}`,
    '',
    sentence(component.purpose ?? component.claim.statement),
    '',
    ...list('Anatomy', anatomy),
    ...list('Variants', variants),
    ...list('States', states),
    ...list('Composition', component.compositionRules ?? []),
    ...list('Content', component.contentConstraints ?? []),
    ...list('Adaptation', component.adaptationRules ?? []),
    ...list('Accessibility', component.accessibilityRequirements ?? []),
    ...list('Avoid', component.antiPatterns ?? []),
    '',
  ];
}

function componentsSection(dna) {
  const components = dna.componentPatterns ?? [];
  if (components.length === 0) return [];
  return ['## Components', '', ...components.flatMap(componentLines)];
}

function constraintsSection(dna) {
  const constraints = dna.fidelity?.constraints ?? [];
  if (constraints.length === 0) return [];
  return [
    '## Calibration bounds',
    '',
    'Reproduction targets to check in a rendered browser. Their acceptance status is shown; a pending bound is diagnostic, not a source measurement.',
    '',
    ...constraints.map((constraint) => {
      const { measurement } = constraint;
      const relative = measurement.relativeTo
        ? ` relative to ${measurement.relativeTo.target} ${measurement.relativeTo.property}`
        : '';
      return `- **${constraint.name}** ${statusTag(constraint.claim.epistemicStatus)} \`${constraint.acceptance.status}\`: ${measurement.target} ${measurement.property}${relative} — ${sentence(designValue(measurement.expected))}; tolerance ${measurement.tolerance}.`;
    }),
    '',
  ];
}

function unknownsSection(dna) {
  if (dna.unknowns.length === 0) return [];
  return [
    '## Unknowns',
    '',
    'Do not invent these; follow a proposed rule when one exists, otherwise keep the choice neutral and easy to change.',
    '',
    ...dna.unknowns.map((unknown) => `- ${sentence(unknown.question)}`),
    '',
  ];
}

function referenceSection(matrix) {
  const groups = new Map();
  for (const entry of matrix.documentationProjection) {
    const directory = entry.path.split('/')[0];
    if (!groups.has(directory)) groups.set(directory, []);
    groups.get(directory).push(entry);
  }
  return [
    '## Reference files',
    '',
    'Open a file only when you need the evidence, confidence, coverage or validation behind an entry above.',
    '',
    ...[...groups].flatMap(([directory, entries]) => [
      `### ${directory[0].toUpperCase()}${directory.slice(1)}`,
      '',
      ...entries.map(
        (entry) => `- [${entry.title}](./${entry.path}) — ${entry.purpose}`,
      ),
      '',
    ]),
  ];
}

export function renderDesignBrief(dna, matrix, { fidelityStatus }) {
  return [
    `# Design brief: ${dna.name}`,
    '',
    `Design DNA \`${dna.documentId}\`, revision ${dna.revision.number}, status \`${dna.status}\`. Documentation layout \`${matrix.documentationLayoutVersion}\`. Fidelity readiness \`${fidelityStatus}\`; this projection does not establish visual fidelity.`,
    '',
    'Read this file completely before generating UI. It lists every token, rule, component and reproduction bound of the Design DNA in compact form. Each entry carries one epistemic status: `observed` and `inferred` come from the supplied screenshots; `proposed` is a recommendation not visible in them; `unknown` must not be invented.',
    '',
    'These files are checksum-managed by Designome. Put manual additions in repository-owned documentation or Designome override files.',
    '',
    ...qualitiesSection(dna),
    ...tokensSection(dna),
    ...rulesSection(dna),
    ...componentsSection(dna),
    ...constraintsSection(dna),
    ...unknownsSection(dna),
    ...referenceSection(matrix),
  ].join('\n');
}
