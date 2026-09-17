import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import {
  buildSkills,
  checkSkills,
  readTree,
  repositoryRoot,
  skillNames,
} from './build-skills.mjs';

const execute = promisify(execFile);
const skillsCli = path.join(repositoryRoot, 'node_modules/skills/bin/cli.mjs');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

async function temporary(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-distribution-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('generated skills are current and contain no nested discoverable skills or symlinks', async () => {
  assert.deepEqual(await checkSkills(), []);
  for (const name of skillNames) {
    const files = await readTree(path.join(repositoryRoot, 'skills', name));
    assert.deepEqual(
      [...files.keys()].filter((file) => file.endsWith('SKILL.md')),
      ['SKILL.md'],
    );
    const manifest = JSON.parse(files.get('bundle-manifest.json'));
    for (const [file, hash] of Object.entries(manifest.files))
      assert.equal(digest(files.get(file)), hash, file);
    const instructions = files.get('SKILL.md').toString();
    for (const [, reference] of instructions.matchAll(
      /`(scripts\/runtime\/[\w./-]+)`/gu,
    ))
      assert.ok(files.has(reference), `Missing ${name}/${reference}`);
  }
});

test('generation is repeatable and detects stale, missing and unexpected shipped files', async (t) => {
  const root = await temporary(t);
  for (const entry of [
    'bin',
    'src',
    'concepts',
    'schemas',
    'prompts',
    'docs',
    'examples',
    'skill-sources',
    'package.json',
  ])
    await fs.cp(path.join(repositoryRoot, entry), path.join(root, entry), {
      recursive: true,
    });
  await buildSkills(root);
  const before = await readTree(path.join(root, 'skills'));
  await buildSkills(root);
  assert.deepEqual(await readTree(path.join(root, 'skills')), before);
  await fs.appendFile(
    path.join(root, 'prompts/_shared-contract.md'),
    '\nChanged canonical source.\n',
  );
  assert.ok(
    (await checkSkills(root)).some((error) =>
      error.includes('_shared-contract.md: missing or stale'),
    ),
  );
  await buildSkills(root);
  await fs.unlink(
    path.join(
      root,
      'skills/designome-extract/scripts/runtime/bin/designome.mjs',
    ),
  );
  await fs.writeFile(
    path.join(root, 'skills/designome-extract/unexpected.txt'),
    'unexpected',
  );
  const errors = await checkSkills(root);
  assert.ok(
    errors.some((error) =>
      error.includes('bin/designome.mjs: missing or stale'),
    ),
  );
  assert.ok(
    errors.some((error) => error.includes('unexpected.txt: unexpected file')),
  );
  await buildSkills(root);
  assert.deepEqual(await checkSkills(root), []);
});

for (const name of skillNames) {
  test(`${name} installs alone with skills add and executes without access to the source checkout`, async (t) => {
    const sandbox = await temporary(t);
    const source = path.join(sandbox, 'source', name);
    const project = path.join(sandbox, 'target project');
    await fs.mkdir(project, { recursive: true });
    await fs.cp(path.join(repositoryRoot, 'skills', name), source, {
      recursive: true,
    });
    const env = {
      ...process.env,
      DISABLE_TELEMETRY: '1',
      DO_NOT_TRACK: '1',
      CI: '1',
      TMPDIR: sandbox,
      NODE_OPTIONS: '',
      NODE_PATH: '',
    };
    const installArgs = [
      skillsCli,
      'add',
      source,
      '--skill',
      name,
      '--agent',
      'codex',
      '--copy',
      '--yes',
    ];
    await execute(process.execPath, installArgs, { cwd: project, env });
    const installed = path.join(project, '.agents/skills', name);
    const before = await readTree(installed);
    await execute(process.execPath, installArgs, { cwd: project, env });
    assert.deepEqual(await readTree(installed), before);
    assert.deepEqual(await fs.readdir(path.join(project, '.agents/skills')), [
      name,
    ]);
    await fs.rm(path.join(sandbox, 'source'), { recursive: true });
    const runtime = path.join(installed, 'scripts/runtime');
    const permission = [
      '--permission',
      `--allow-fs-read=${sandbox}`,
      `--allow-fs-write=${sandbox}`,
    ];
    const run = async (...args) => {
      const { stdout } = await execute(
        process.execPath,
        [...permission, path.join(runtime, 'bin/designome.mjs'), ...args],
        { cwd: project, env, maxBuffer: 8 * 1024 * 1024 },
      );
      return stdout;
    };
    // Prove the permission boundary really excludes the development checkout.
    await assert.rejects(
      execute(
        process.execPath,
        [
          ...permission,
          '--input-type=module',
          '-e',
          `import fs from 'node:fs'; fs.readFileSync(${JSON.stringify(path.join(repositoryRoot, 'package.json'))});`,
        ],
        { cwd: project, env },
      ),
      /ERR_ACCESS_DENIED/,
    );
    assert.match(await run('--help'), /Designome deterministic helper/);
    const request = await readJson(
      path.join(runtime, 'examples/request-contract.extract.reference.json'),
    );
    const image = path.join(sandbox, 'reference.png');
    await fs.writeFile(
      image,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    request.parameters.sources = [
      { ...request.parameters.sources[0], path: image },
    ];
    const requestFile = path.join(sandbox, 'request.json');
    await fs.writeFile(requestFile, JSON.stringify(request));
    await run(
      'validate-request',
      '--file',
      requestFile,
      '--operation',
      'extract',
    );
    const runDirectory = path.join(sandbox, 'run');
    await run(
      'init-run',
      '--output',
      runDirectory,
      '--request',
      requestFile,
      '--image',
      image,
      '--context-mode',
      'lossless-pack',
    );
    const context = await readJson(
      path.join(runDirectory, 'source-manifest.json'),
    );
    assert.equal(context.sources[0].dimensions.width, 1);
    assert.equal(context.sources[0].dimensions.height, 1);
    const dna = await readJson(
      path.join(runtime, 'examples/design-dna.reference-v0.3.json'),
    );
    dna.status = 'accepted';
    const dnaFile = path.join(sandbox, 'accepted.json');
    await fs.writeFile(dnaFile, JSON.stringify(dna));
    await run('validate-dna', '--file', dnaFile, '--require-accepted');
    await fs.writeFile(
      path.join(project, 'package.json'),
      '{"name":"isolated-target","private":true}\n',
    );
    await fs.writeFile(path.join(project, 'styles.css'), ':root {}\n');
    const install = [
      'install',
      '--dna',
      dnaFile,
      '--project',
      project,
      '--css-entry',
      'styles.css',
      '--instructions-reviewed',
    ];
    await run(...install, '--dry-run');
    await run(...install);
    // Resolve the actual override path from the manifest, avoiding layout assumptions.
    const manifest = await readJson(
      path.join(project, '.designome/manifest.json'),
    );
    assert.ok(manifest.managedArtifacts.length > 0);
    await fs.appendFile(
      path.join(project, manifest.adapter.overridesCss),
      '\n/* project-owned override */\n',
    );
    const first = await readTree(project);
    await run(...install);
    assert.deepEqual(await readTree(project), first);
    await run('verify-install', '--project', project);
    await run('doctor', '--project', project, '--dna', dnaFile);
    await run(
      'audit',
      '--project',
      project,
      '--provider',
      'static',
      '--dry-run',
    );
    if (name === 'designome-audit') {
      assert.deepEqual(
        await readTree(installed),
        before,
        'DNA installation must preserve the standalone audit distribution',
      );
      assert.ok(
        !manifest.managedArtifacts.some((artifact) =>
          artifact.path.startsWith('.agents/skills/designome-audit/'),
        ),
      );
    }
    const managed = manifest.managedArtifacts.find((artifact) =>
      artifact.path.endsWith('designome.generated.css'),
    );
    assert.ok(managed);
    await fs.appendFile(
      path.join(project, managed.path),
      '\n/* manual edit */\n',
    );
    await assert.rejects(run('verify-install', '--project', project));
    await assert.rejects(run(...install));
  });
}
