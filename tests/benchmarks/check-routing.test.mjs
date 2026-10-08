import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRouting } from '../../benchmarks/shared/check-routing.mjs';

const expected = {
  sources: [
    {
      match: 'table-',
      evidenceMode: ['only'],
      requireUiDomainRefs: ['domain.tables-lists'],
      forbidAxisRefs: ['axis.color-surface-identity'],
    },
    { match: 'shell-', evidenceMode: ['prefer', 'all'] },
  ],
};

function contract(sources) {
  return { parameters: { sources } };
}

test('accepts routing that matches the expected modes and references', () => {
  const report = checkRouting(
    contract([
      {
        path: '/in/table-list.png',
        evidenceMode: 'only',
        axisRefs: ['axis.data-display-visualization'],
        uiDomainRefs: ['domain.tables-lists'],
      },
      { path: '/in/shell-home.png', evidenceMode: 'prefer', uiDomainRefs: [] },
    ]),
    expected,
  );
  assert.equal(report.ok, true);
});

test('reports a wrong mode, a missing domain, a forbidden axis and an absent source', () => {
  const report = checkRouting(
    contract([
      {
        path: '/in/table-list.png',
        evidenceMode: 'prefer',
        axisRefs: ['axis.color-surface-identity'],
        uiDomainRefs: [],
      },
    ]),
    expected,
  );
  assert.equal(report.ok, false);
  assert.deepEqual(report.results[0].problems, [
    'table-list.png: evidenceMode is prefer, expected only',
    'table-list.png: axisRefs includes forbidden axis.color-surface-identity',
    'table-list.png: uiDomainRefs lacks domain.tables-lists',
  ]);
  assert.deepEqual(report.results[1].problems, [
    'no source matches this prefix',
  ]);
});
