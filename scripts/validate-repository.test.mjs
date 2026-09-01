import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectMatrixReferenceErrors,
  validateRepository,
} from './validate-repository.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

test('the repository contracts are internally consistent', () => {
  assert.deepEqual(validateRepository(rootDirectory), []);
});

test('the matrix lint detects a missing cross reference', () => {
  const matrix = JSON.parse(
    fs.readFileSync(
      path.join(rootDirectory, 'concepts', 'concept-matrix.v0.3.json'),
      'utf8',
    ),
  );
  matrix.axes[0].conceptRefs.push('concept.missing');

  const errors = collectMatrixReferenceErrors(matrix, rootDirectory);
  assert.ok(
    errors.includes(
      'axis.spatial-composition references missing concept concept.missing',
    ),
  );
});
