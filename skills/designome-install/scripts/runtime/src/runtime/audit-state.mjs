import { DesignomeError } from './errors.mjs';

export const providerStatuses = Object.freeze([
  'not-requested',
  'provider-unavailable',
  'awaiting-evidence',
  'evidence-received',
  'running',
  'passed',
  'failed',
  'incomplete',
]);

export const layerStatuses = Object.freeze([
  'passed',
  'failed',
  'incomplete',
  'not-requested',
  'unavailable',
]);

const transitions = new Map([
  ['not-requested', new Set()],
  ['provider-unavailable', new Set(['awaiting-evidence', 'evidence-received'])],
  ['awaiting-evidence', new Set(['evidence-received', 'provider-unavailable'])],
  ['evidence-received', new Set(['running'])],
  ['running', new Set(['passed', 'failed', 'incomplete'])],
  ['passed', new Set(['evidence-received'])],
  ['failed', new Set(['evidence-received'])],
  ['incomplete', new Set(['evidence-received'])],
]);

export function transitionProvider(
  state,
  nextStatus,
  at = new Date().toISOString(),
) {
  if (!providerStatuses.includes(state.status)) {
    throw new DesignomeError('Audit provider has an invalid status', {
      code: 'INVALID_AUDIT_PROVIDER_STATE',
      details: { status: state.status },
    });
  }
  if (!providerStatuses.includes(nextStatus)) {
    throw new DesignomeError(
      'Audit provider transition targets an invalid status',
      {
        code: 'INVALID_AUDIT_PROVIDER_STATE',
        details: { nextStatus },
      },
    );
  }
  if (!transitions.get(state.status).has(nextStatus)) {
    throw new DesignomeError('Audit provider state transition is not allowed', {
      code: 'INVALID_AUDIT_PROVIDER_TRANSITION',
      details: { from: state.status, to: nextStatus },
    });
  }
  return {
    ...state,
    status: nextStatus,
    transitions: [
      ...(state.transitions ?? []),
      { from: state.status, to: nextStatus, at },
    ],
  };
}

export function overallLayerStatus(layers) {
  const values = Object.values(layers);
  if (values.includes('failed')) return 'failed';
  if (values.includes('incomplete')) return 'incomplete';
  if (values.includes('unavailable')) return 'incomplete';
  if (values.every((value) => value === 'not-requested')) {
    return 'not-requested';
  }
  return 'passed';
}

export function assertLayerStatuses(layers) {
  for (const [layer, status] of Object.entries(layers)) {
    if (!layerStatuses.includes(status)) {
      throw new DesignomeError('Audit layer has an invalid status', {
        code: 'INVALID_AUDIT_LAYER_STATE',
        details: { layer, status },
      });
    }
  }
}
