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
  return [
    '## Components',
    '',
    'Reach for a recipe whenever the product has the need its purpose names, including on screens the sources never showed. Change its content, never its anatomy.',
    '',
    ...components.flatMap(componentLines),
  ];
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

// Product defaults, not source evidence: they rank below the person's request
// and below every rule measured on the screenshots.
function guardrailsSection() {
  return [
    '## Precedence, guardrails and budgets',
    '',
    'When instructions disagree, follow this order:',
    '',
    "1. The person's explicit request for this project, even when it contradicts an entry of this brief.",
    '2. Entries of this brief: `observed` and `inferred` ones were measured on the screenshots.',
    '3. The Designome defaults below, only where neither speaks.',
    '',
    '### Quality guardrails',
    '',
    'Defects, not taste. Apply them on every screen unless the person explicitly asks otherwise.',
    '',
    '- **One recipe per repeated component.** A component that repeats across screens, such as a KPI tile, list row, card, chip or badge, keeps the same parts, order and proportions everywhere. Add a second variant only when this brief records one with its selection condition.',
    '- **One recipe per chart family.** Sibling charts of one family, such as columns, bars, progress or segmented indicators, share mark thickness relative to their pitch, gap ratio, corners, gridlines and tone assignment on every screen.',
    '- **One screen skeleton.** Every screen keeps the band order and the primary-action position this brief records. A screen may omit an optional band; it never reorders bands or moves the primary action.',
    '- **Content stays in its container.** Text, chips, badges and marks never overflow the cell, card, row or control that holds them, and no bar or overlay covers content. Past the available width, first drop the optional part the slot rule names, then truncate with an ellipsis or collapse the excess into a "+N" count, never below the minimum visible characters the rule records.',
    '- **Proportions hold at every width.** Apply ratios and minimums at each viewport. When space shrinks, stack or wrap regions in their recorded order instead of squeezing components below their measured proportions, and never scroll the page sideways.',
    '',
    '### Budget defaults',
    '',
    'Use the count, order or share that the rules below measured. These defaults apply only when this brief records none for a budget, and they carry the status `proposed`.',
    '',
    '- **Status colors:** at most 4 saturated status hues, in a fixed order such as neutral, in progress, attention, done. Further statuses reuse one of them or stay neutral; no per-category hue families.',
    '- **Chart series:** data series use one neutral tone; the accent marks at most one highlighted series or mark per chart.',
    '- **Text slots:** a chip, badge or table cell shows at least 12 characters of its main text, and a title is never truncated while its container has free space that could hold it.',
    '- **Accent:** reserved for the primary action, the active navigation item and the one highlighted chart mark. Progress bars, segmented bars and meters fill with a neutral grey or the body-text ink on a lighter track, never the accent.',
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
    ...guardrailsSection(),
    ...qualitiesSection(dna),
    ...tokensSection(dna),
    ...rulesSection(dna),
    ...componentsSection(dna),
    ...constraintsSection(dna),
    ...unknownsSection(dna),
    ...referenceSection(matrix),
  ].join('\n');
}
