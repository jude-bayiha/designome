// Human-readable contracts share one renderer across dossier and domain recipes.
export function claimDetails(claim) {
  return [
    `- Epistemic status: \`${claim.epistemicStatus}\``,
    `- Confidence: ${claim.confidence.score} — ${claim.confidence.basis}`,
    `- Scope: ${claim.scope.join('; ') || 'none documented'}`,
    `- Concept routing: ${claim.conceptRefs.join(', ')}`,
    `- UI-domain routing: ${(claim.uiDomainRefs ?? []).join(', ') || 'system-wide'}`,
    `- Evidence: ${claim.evidenceRefs.join(', ') || 'none'}`,
    `- Exceptions: ${claim.exceptions.join('; ') || 'None documented.'}`,
    `- Validation status: \`${claim.validation.status}\``,
    `- Validation: ${claim.validation.method}`,
  ].join('\n');
}

export function designValue(value) {
  if (value.kind === 'exact') return `Exact: \`${String(value.value)}\``;
  if (value.kind === 'range')
    return `Range: ${value.minimum}–${value.maximum} ${value.unit}; preferred: ${value.preferred ?? 'unknown'}; strategy: ${value.strategy ?? 'unspecified'}`;
  return value.expression ?? value.reason;
}

function details(title, values = []) {
  return values.length
    ? ['', `**${title}**`, '', ...values.map((value) => `- ${value}`)]
    : [];
}

function assertionText(owner, field, index, text) {
  const assertion =
    index === null
      ? owner.assertions?.[field]
      : owner.assertions?.[field]?.[index];
  if (!assertion)
    return `${text}\n\n- Status: \`unknown\` — Legacy note without an independent assertion; the parent appearance label does not establish this behavior.`;
  return `${assertion.statement}\n\n${claimDetails(assertion)}`;
}

export function renderAssertions(owner, field, title) {
  const values = owner[field] ?? [];
  return values.length
    ? [
        '',
        `**${title}**`,
        '',
        ...values.flatMap((value, index) => [
          assertionText(owner, field, index, value),
          '',
        ]),
      ]
    : [];
}

export function renderTokenContract(token, heading = '###') {
  return [
    `${heading} Token: ${token.name}`,
    '',
    `- Token ID: \`${token.id}\``,
    `- Category: \`${token.category}\``,
    `- Role: ${token.role ?? 'Not documented in legacy DNA.'}`,
    `- Design value: ${designValue(token.value)}`,
    '',
    token.claim.statement,
    '',
    claimDetails(token.claim),
    ...details('Applies to', token.appliesTo),
    ...details(
      'Relationships',
      (token.relationships ?? []).map(
        (relation) =>
          `\`${relation.kind}\`${relation.targetRef ? ` → \`${relation.targetRef}\`` : ''}: ${relation.expression}`,
      ),
    ),
    '',
  ].join('\n');
}

export function renderRuleContract(rule, heading = '###') {
  return [
    `${heading} Rule: ${rule.name}`,
    '',
    `- Rule ID: \`${rule.id}\``,
    `- Strength: \`${rule.strength}\``,
    `- Category: \`${rule.category}\``,
    '',
    rule.claim.statement,
    '',
    claimDetails(rule.claim),
    ...details('Applies to', rule.appliesTo),
    ...(rule.rationale ? ['', '**Rationale**', '', rule.rationale] : []),
    ...renderAssertions(rule, 'requirements', 'Requirements'),
    ...details('Failure modes', rule.failureModes),
    ...details('Dependencies', rule.dependsOn),
    ...details('Validation cases', rule.validationCases),
    '',
  ].join('\n');
}

export function renderStateContract(state, heading = '####') {
  return [
    `${heading} State: ${state.name}`,
    '',
    ...(state.assertions?.appearance
      ? [
          state.assertions.appearance.statement,
          '',
          claimDetails(state.assertions.appearance),
        ]
      : [
          `- Legacy appearance label: \`${state.epistemicStatus ?? state.status}\`; independent state assertions are \`unknown\`.`,
        ]),
    ...['trigger', 'behavior', 'feedback', 'exit', 'programmaticState'].flatMap(
      (field) => [
        '',
        `**${field}**`,
        '',
        assertionText(state, field, null, state[field] ?? 'Unknown.'),
      ],
    ),
    ...details('Validation cases', state.validationCases),
    '',
  ].join('\n');
}

export function renderComponentContract(component, heading = '###') {
  return [
    `${heading} Component: ${component.name}`,
    '',
    `- Component ID: \`${component.id}\``,
    `- Purpose: ${component.purpose ?? 'Legacy pattern'}`,
    '',
    component.claim.statement,
    '',
    claimDetails(component.claim),
    ...details('UI domains', component.uiDomainRefs),
    ...details('Token references', component.tokenRefs),
    ...details('Rule references', component.ruleRefs),
    '',
    '**Anatomy**',
    '',
    ...component.anatomy.flatMap((part) =>
      typeof part === 'string'
        ? [part, '']
        : [
            `- Part: \`${part.id}\` — ${part.name}; requirement: \`${part.requirement}\``,
            `- Purpose: ${part.purpose}`,
            ...details('Part token references', part.tokenRefs),
            ...renderAssertions(
              part,
              'contentConstraints',
              'Part content constraints',
            ),
            '',
          ],
    ),
    '',
    '**Variants**',
    '',
    ...component.variants.flatMap((variant) =>
      typeof variant === 'string'
        ? [`- Status: \`unknown\` — ${variant}`]
        : [
            `- Variant: ${variant.name}`,
            `- Purpose: ${variant.purpose}`,
            `- Appearance status: \`${variant.epistemicStatus}\``,
            `- Evidence: ${variant.evidenceRefs.join(', ') || 'none'}`,
            ...renderAssertions(variant, 'conditions', 'Selection conditions'),
            ...renderAssertions(variant, 'differences', 'Visual differences'),
            '',
          ],
    ),
    ...component.states.map((state) =>
      renderStateContract(state, heading + '#'),
    ),
    ...renderAssertions(
      component,
      'compositionRules',
      'Composition and spacing ownership',
    ),
    ...renderAssertions(component, 'contentConstraints', 'Content constraints'),
    ...renderAssertions(component, 'adaptationRules', 'Adaptation rules'),
    ...renderAssertions(
      component,
      'accessibilityRequirements',
      'Accessibility requirements',
    ),
    ...renderAssertions(component, 'antiPatterns', 'Anti-patterns'),
    '',
  ].join('\n');
}

export function domainRecipe(dna, domainRef) {
  const artifacts = new Map(
    [
      ...dna.tokens.map((item) => ({ item, kind: 'token' })),
      ...dna.rules.map((item) => ({ item, kind: 'rule' })),
      ...(dna.componentPatterns ?? []).map((item) => ({
        item,
        kind: 'component',
      })),
    ].map((entry) => [entry.item.id, entry]),
  );
  const included = new Set(
    [...artifacts.values()]
      .filter(
        ({ item }) =>
          item.uiDomainRefs?.includes(domainRef) ||
          item.claim.uiDomainRefs?.includes(domainRef),
      )
      .map(({ item }) => item.id),
  );
  // Rule dependencies can name any artifact; follow the complete graph once per ID.
  const queue = [...included];
  for (const id of queue) {
    const { item, kind } = artifacts.get(id);
    const dependencies =
      kind === 'rule'
        ? (item.dependsOn ?? [])
        : kind === 'token'
          ? (item.relationships ?? []).flatMap((relation) =>
              relation.targetRef ? [relation.targetRef] : [],
            )
          : [
              ...item.ruleRefs,
              ...item.tokenRefs,
              ...item.anatomy.flatMap((part) => part.tokenRefs ?? []),
            ];
    for (const ref of dependencies)
      if (!included.has(ref)) {
        included.add(ref);
        queue.push(ref);
      }
  }
  return [
    '### Implementation recipe',
    '',
    'Apply the contracts below within their scope and exceptions. Proposed and unknown assertions retain their status; no implementation behavior is established by an appearance label.',
    '',
    ...dna.tokens
      .filter((item) => included.has(item.id))
      .map((item) => renderTokenContract(item, '####')),
    ...dna.rules
      .filter((item) => included.has(item.id))
      .map((item) => renderRuleContract(item, '####')),
    ...(dna.componentPatterns ?? [])
      .filter((item) => included.has(item.id))
      .map((item) => renderComponentContract(item, '####')),
    renderFidelityContract(dna, included),
  ].join('\n');
}

export function renderFidelityContract(dna, artifactIds = null) {
  if (!dna.fidelity)
    return '## Fidelity contract\n\n- Status: `unknown` — Legacy DNA has no reviewed signature qualities or reproduction constraints. It remains readable but visual fidelity is not established.\n';
  const relevant = (item) =>
    !artifactIds || item.artifactRefs.some((id) => artifactIds.has(id));
  return [
    '## Fidelity contract',
    '',
    'Contract 1.0.0 preserves reproduction priorities and separates epistemic status from acceptance. A proposed calibration never becomes an observation through acceptance.',
    '',
    ...dna.fidelity.qualities
      .filter(relevant)
      .flatMap((quality) => [
        `### Quality: ${quality.name}`,
        '',
        `- Quality ID: \`${quality.id}\``,
        `- Priority: \`${quality.priority}\``,
        `- Artifacts: ${quality.artifactRefs.join(', ')}`,
        '',
        quality.claim.statement,
        '',
        claimDetails(quality.claim),
        ...details('Failure modes', quality.failureModes),
        '',
      ]),
    ...dna.fidelity.constraints
      .filter(relevant)
      .flatMap((constraint) => [
        `### Constraint: ${constraint.name}`,
        '',
        `- Constraint ID: \`${constraint.id}\``,
        `- Artifacts: ${constraint.artifactRefs.join(', ')}`,
        `- Target: ${constraint.measurement.target}; property: ${constraint.measurement.property}`,
        `- Expected: ${designValue(constraint.measurement.expected)}`,
        `- Unit: ${constraint.measurement.unit}; tolerance: ${constraint.measurement.tolerance}`,
        ...(constraint.measurement.relativeTo
          ? [
              `- Relative to: ${constraint.measurement.relativeTo.target}; property: ${constraint.measurement.relativeTo.property}`,
            ]
          : []),
        `- Acceptance: \`${constraint.acceptance.status}\` — ${constraint.acceptance.basis}`,
        '',
        constraint.claim.statement,
        '',
        claimDetails(constraint.claim),
        '',
      ]),
    ...details('Fidelity limitations', dna.fidelity.limitations),
    '',
  ].join('\n');
}
