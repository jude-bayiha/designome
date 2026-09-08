export const fidelityContractVersion = '1.0.0';

const stateFields = [
  'appearance',
  'trigger',
  'behavior',
  'feedback',
  'exit',
  'programmaticState',
];
const componentFields = [
  'compositionRules',
  'contentConstraints',
  'adaptationRules',
  'accessibilityRequirements',
  'antiPatterns',
];
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) =>
  typeof value === 'string' && value.trim().length > 0;
const array = (value) => (Array.isArray(value) ? value : []);

// Legacy strings remain readable, but never acquire a behavioral status from a parent appearance.
export function validateFidelity(
  dna,
  {
    errors,
    validateClaim,
    validateValue,
    artifactIds,
    requireFidelity = false,
  },
) {
  const fidelity = dna.fidelity;
  if (fidelity === undefined) {
    const owners = [
      ...array(dna.rules),
      ...array(dna.componentPatterns).flatMap((component) => [
        component,
        ...array(component?.anatomy),
        ...array(component?.variants),
        ...array(component?.states),
      ]),
    ];
    if (
      owners.some(
        (owner) => object(owner) && Object.hasOwn(owner, 'assertions'),
      )
    )
      errors.push(
        'fidelity: independent assertions require a declared contract',
      );
    if (requireFidelity)
      errors.push(
        'fidelity: new extraction requires Fidelity Contract 1.0.0; legacy DNA needs explicit review, not automatic promotion',
      );
    return;
  }
  function check(condition, message) {
    if (!condition) errors.push(message);
  }
  function shape(value, keys, location, optional = []) {
    if (!object(value)) {
      errors.push(location + ' must be an object');
      return false;
    }
    check(
      Object.keys(value).every((key) => keys.includes(key)) &&
        keys
          .filter((key) => !optional.includes(key))
          .every((key) => Object.hasOwn(value, key)),
      location + ': unexpected or missing field',
    );
    return true;
  }
  function list(value, location) {
    if (!Array.isArray(value)) {
      errors.push(location + ' must be an array');
      return [];
    }
    return value;
  }
  function textList(value, location) {
    const values = list(value, location);
    check(values.every(nonempty), location + ': strings must be nonempty');
    return values;
  }
  function assertions(owner, fields, location, singles = false) {
    if (!shape(owner?.assertions, fields, location + '.assertions')) return;
    for (const field of fields) {
      const loc = `${location}.assertions.${field}`;
      if (singles) {
        const claim = owner.assertions[field];
        validateClaim(claim, loc);
        if (field !== 'appearance')
          check(
            claim?.statement === owner[field],
            loc + ': statement must equal its legacy field',
          );
        else {
          check(
            claim?.epistemicStatus === owner.epistemicStatus,
            loc + ': appearance status must match the legacy label',
          );
          check(
            JSON.stringify(claim?.evidenceRefs) ===
              JSON.stringify(owner.evidenceRefs),
            loc + ': appearance evidence must match the legacy references',
          );
        }
      } else {
        const values = list(owner.assertions[field], loc);
        check(
          values.length === owner[field]?.length,
          loc + ': every entry requires an independent assertion',
        );
        values.forEach((claim, index) => {
          validateClaim(claim, `${loc}[${index}]`);
          check(
            claim?.statement === owner[field]?.[index],
            loc + ': assertion statement differs from its entry',
          );
        });
      }
    }
  }
  if (
    !shape(
      fidelity,
      ['contractVersion', 'qualities', 'constraints', 'limitations'],
      'fidelity',
    )
  )
    return;
  check(
    fidelity.contractVersion === fidelityContractVersion,
    'fidelity.contractVersion must equal 1.0.0',
  );
  const qualities = list(fidelity.qualities, 'fidelity.qualities');
  const constraints = list(fidelity.constraints, 'fidelity.constraints');
  const limitations = textList(fidelity.limitations, 'fidelity.limitations');
  if (!qualities.length || !constraints.length)
    check(
      limitations.length > 0,
      'fidelity: absent qualities or constraints require an explicit limitation',
    );
  const ids = new Set();
  for (const [collection, items] of [
    ['qualities', qualities],
    ['constraints', constraints],
  ]) {
    items.forEach((item, index) => {
      const loc = `fidelity.${collection}[${index}]`;
      const keys =
        collection === 'qualities'
          ? ['id', 'name', 'priority', 'artifactRefs', 'failureModes', 'claim']
          : [
              'id',
              'name',
              'artifactRefs',
              'measurement',
              'claim',
              'acceptance',
            ];
      if (!shape(item, keys, loc)) return;
      check(
        typeof item.id === 'string' &&
          /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(item.id) &&
          !ids.has(item.id) &&
          !artifactIds.has(item.id),
        loc + ': invalid or duplicate id',
      );
      ids.add(item.id);
      check(nonempty(item.name), loc + ': name is required');
      const refs = list(item.artifactRefs, loc + '.artifactRefs');
      check(
        refs.length > 0 &&
          new Set(refs).size === refs.length &&
          refs.every((id) => artifactIds.has(id)),
        loc + ': artifactRefs must resolve to canonical artifacts',
      );
      validateClaim(item.claim, loc + '.claim');
      if (collection === 'qualities') {
        check(
          ['critical', 'important', 'supporting'].includes(item.priority),
          loc + ': invalid priority',
        );
        textList(item.failureModes, loc + '.failureModes');
      } else {
        if (shape(item.acceptance, ['status', 'basis'], loc + '.acceptance')) {
          check(
            ['pending', 'accepted', 'rejected'].includes(
              item.acceptance.status,
            ),
            loc + ': invalid acceptance status',
          );
          check(
            nonempty(item.acceptance.basis),
            loc + ': acceptance basis is required',
          );
          check(
            item.acceptance.status !== 'accepted' ||
              item.claim?.epistemicStatus !== 'unknown',
            loc + ': unknown constraints cannot be accepted',
          );
        }
        const m = item.measurement;
        if (
          shape(
            m,
            [
              'target',
              'property',
              'unit',
              'expected',
              'tolerance',
              'relativeTo',
            ],
            loc + '.measurement',
            ['relativeTo'],
          )
        ) {
          for (const field of ['target', 'property', 'unit'])
            check(
              nonempty(m[field]),
              loc + ': measurement ' + field + ' is required',
            );
          check(
            Number.isFinite(m.tolerance) && m.tolerance >= 0,
            loc + ': tolerance must be a finite nonnegative number',
          );
          validateValue(m.expected, loc + '.measurement.expected');
          if (m.expected?.kind === 'range')
            check(
              m.expected.unit === m.unit,
              loc + ': expected range and measurement units differ',
            );
          if (
            m.relativeTo !== undefined &&
            shape(
              m.relativeTo,
              ['target', 'property'],
              loc + '.measurement.relativeTo',
            )
          ) {
            check(
              nonempty(m.relativeTo.target) &&
                nonempty(m.relativeTo.property) &&
                m.unit === 'ratio',
              loc +
                ': relative measurements require a target, property and ratio unit',
            );
          }
        }
      }
    });
  }
  array(dna.rules).forEach((rule, index) =>
    assertions(rule, ['requirements'], `rules[${index}]`),
  );
  array(dna.componentPatterns).forEach((component, index) => {
    const loc = `componentPatterns[${index}]`;
    assertions(component, componentFields, loc);
    array(component?.anatomy).forEach((part, i) =>
      assertions(part, ['contentConstraints'], `${loc}.anatomy[${i}]`),
    );
    array(component?.variants).forEach((variant, i) =>
      assertions(
        variant,
        ['conditions', 'differences'],
        `${loc}.variants[${i}]`,
      ),
    );
    array(component?.states).forEach((state, i) =>
      assertions(state, stateFields, `${loc}.states[${i}]`, true),
    );
  });
}

export function fidelityReadiness(dna) {
  const f = dna.fidelity;
  if (!f)
    return {
      contractVersion: null,
      status: 'incomplete',
      reason: 'Legacy DNA has no reviewed fidelity contract.',
      visualFidelity: 'not-established',
    };
  return {
    contractVersion: f.contractVersion,
    status:
      f.qualities.length && f.constraints.length
        ? 'ready-for-benchmark'
        : 'incomplete',
    qualities: f.qualities.length,
    constraints: f.constraints.length,
    pendingCalibrations: f.constraints.filter(
      (c) => c.acceptance.status === 'pending',
    ).length,
    visualFidelity: 'not-established',
  };
}

// Observations are supplied by a browser/host. No pixel processing or font guessing occurs here.
export function evaluateFidelityConstraints(dna, observations) {
  if (!Array.isArray(observations))
    throw new Error('Fidelity measurements must be an array');
  const measured = new Map();
  for (const observation of observations) {
    if (
      !object(observation) ||
      !['target', 'property', 'unit'].every((field) =>
        nonempty(observation[field]),
      ) ||
      !['string', 'number', 'boolean'].includes(typeof observation.value) ||
      (typeof observation.value === 'number' &&
        !Number.isFinite(observation.value))
    )
      throw new Error('Invalid fidelity measurement');
    const key = JSON.stringify([observation.target, observation.property]);
    if (measured.has(key))
      throw new Error('Duplicate fidelity measurement: ' + key);
    measured.set(key, observation);
  }
  return (dna.fidelity?.constraints ?? []).map((constraint) => {
    const m = constraint.measurement,
      value = m.expected;
    const observation = measured.get(JSON.stringify([m.target, m.property]));
    const reference =
      m.relativeTo &&
      measured.get(
        JSON.stringify([m.relativeTo.target, m.relativeTo.property]),
      );
    let actual = observation?.value;
    let measurable = observation !== undefined;
    if (m.relativeTo) {
      measurable =
        measurable &&
        reference !== undefined &&
        observation.unit === reference.unit &&
        Number.isFinite(actual) &&
        Number.isFinite(reference?.value) &&
        reference.value !== 0;
      if (measurable) actual /= reference.value;
    } else measurable = measurable && observation.unit === m.unit;
    if (!['exact', 'range'].includes(value.kind)) measurable = false;
    let result = 'incomplete';
    if (measurable) {
      if (value.kind === 'range')
        result = Number.isFinite(actual)
          ? actual >= value.minimum - m.tolerance &&
            actual <= value.maximum + m.tolerance
            ? 'passed'
            : 'failed'
          : 'incomplete';
      else if (typeof value.value === 'number')
        result = Number.isFinite(actual)
          ? Math.abs(actual - value.value) <= m.tolerance
            ? 'passed'
            : 'failed'
          : 'incomplete';
      else result = actual === value.value ? 'passed' : 'failed';
    }
    return {
      constraintRef: constraint.id,
      result,
      actual: measurable ? actual : null,
      epistemicStatus: constraint.claim.epistemicStatus,
      disposition:
        constraint.acceptance.status === 'accepted'
          ? 'requirement'
          : constraint.acceptance.status === 'rejected'
            ? 'excluded'
            : 'calibration',
      reason: measurable
        ? 'Compared supplied measurements within the declared tolerance.'
        : 'Missing, incompatible or non-numeric evidence, or a relationship requiring host perceptual review.',
    };
  });
}
