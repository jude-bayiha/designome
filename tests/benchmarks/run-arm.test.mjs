import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runArm } from '../../benchmarks/shared/run-arm.mjs';

const benchmarkRoot = path.resolve('benchmarks/next-shadcn');

async function workspace() {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'designome-arm-'));
  await fs.mkdir(path.join(work, 'scaffold'));
  const dossier = path.join(work, 'dossier');
  await fs.mkdir(dossier);
  await fs.writeFile(path.join(dossier, 'README.md'), '# Design brief: test\n');
  const request = path.join(work, 'request.md');
  await fs.writeFile(request, 'Put the accent color everywhere.\n');
  return { work, dossier, request };
}

test('a generator run carries the request without a precedence hint', async () => {
  const { work, dossier, request } = await workspace();
  const code = await runArm({
    benchmarkRoot,
    argv: [
      '--work',
      work,
      '--arm',
      'designome',
      '--run',
      'override-1',
      '--dossier',
      dossier,
      '--request',
      request,
      '--dry-run',
    ],
  });
  assert.equal(code, 0);
  const run = path.join(work, 'runs', 'override-1');
  const prompt = await fs.readFile(path.join(run, 'prompt.md'), 'utf8');
  assert.match(
    prompt,
    /The product owner also asks, in their own words:\n\nPut the accent color everywhere\.\n$/u,
  );
  assert.doesNotMatch(prompt, /precedence|takes priority|overrides/iu);
  assert.equal(
    await fs.readFile(path.join(run, 'request.md'), 'utf8'),
    'Put the accent color everywhere.\n',
  );
  const record = JSON.parse(
    await fs.readFile(path.join(run, 'run.json'), 'utf8'),
  );
  assert.equal(record.request, 'Put the accent color everywhere.');
});

test('a run without a request records none', async () => {
  const { work, dossier } = await workspace();
  await runArm({
    benchmarkRoot,
    argv: [
      '--work',
      work,
      '--arm',
      'designome',
      '--run',
      'designome-1',
      '--dossier',
      dossier,
      '--dry-run',
    ],
  });
  const run = path.join(work, 'runs', 'designome-1');
  const prompt = await fs.readFile(path.join(run, 'prompt.md'), 'utf8');
  assert.doesNotMatch(prompt, /product owner/u);
  const record = JSON.parse(
    await fs.readFile(path.join(run, 'run.json'), 'utf8'),
  );
  assert.equal(record.request, null);
});

test('the extract arm refuses a request before creating its run', async () => {
  const { work, request } = await workspace();
  await assert.rejects(
    runArm({
      benchmarkRoot,
      argv: [
        '--work',
        work,
        '--arm',
        'extract',
        '--run',
        'extract-1',
        '--request',
        request,
        '--dry-run',
      ],
    }),
    /generator arms only/u,
  );
  await assert.rejects(fs.access(path.join(work, 'runs', 'extract-1')));
});
