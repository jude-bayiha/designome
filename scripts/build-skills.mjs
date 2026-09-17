import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const skillNames = [
  'designome-audit',
  'designome-extract',
  'designome-install',
];
const runtimePrefix = 'scripts/runtime';
// Explicit allowlist: never ship tests, dependencies, private runs or targets.
const runtimeDirectories = [
  'bin',
  'src',
  'concepts',
  'schemas',
  'prompts',
  'docs',
  'examples',
  'skill-sources',
];

export async function readTree(directory, prefix = '') {
  const result = new Map();
  for (const entry of (
    await fs.readdir(directory, { withFileTypes: true })
  ).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [name, bytes] of await readTree(absolute, relative))
        result.set(name, bytes);
    } else if (entry.isFile()) {
      result.set(relative, await fs.readFile(absolute));
    } else {
      throw new Error(`Unsupported distribution entry: ${absolute}`);
    }
  }
  return result;
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

export async function expectedSkills(root = repositoryRoot) {
  const runtime = new Map();
  for (const directory of runtimeDirectories)
    for (const [name, bytes] of await readTree(path.join(root, directory)))
      runtime.set(`${runtimePrefix}/${directory}/${name}`, bytes);
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
  runtime.set(
    `${runtimePrefix}/package.json`,
    json({
      name: pkg.name,
      version: pkg.version,
      private: true,
      type: 'module',
      engines: pkg.engines,
    }),
  );
  const distributions = new Map();
  for (const name of skillNames) {
    const files = new Map(runtime);
    const source = await readTree(path.join(root, 'skill-sources', name));
    const instructions = source
      .get('instructions.md')
      .toString('utf8')
      .replaceAll('../../docs/', `${runtimePrefix}/docs/`)
      .replaceAll('../../prompts/', `${runtimePrefix}/prompts/`)
      .replaceAll('../../concepts/', `${runtimePrefix}/concepts/`)
      .replaceAll('../../schemas/', `${runtimePrefix}/schemas/`)
      .replaceAll('root is `../..`', `root is \`${runtimePrefix}\``)
      .replaceAll('root as `../..`', `root as \`${runtimePrefix}\``);
    files.set('SKILL.md', Buffer.from(instructions));
    source.delete('instructions.md');
    for (const [file, bytes] of source) files.set(file, bytes);
    const hashes = Object.fromEntries(
      [...files]
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([file, bytes]) => [file, hash(bytes)]),
    );
    files.set(
      'bundle-manifest.json',
      json({
        bundleFormatVersion: '1.0.0',
        skill: name,
        contentFingerprint: `sha256:${hash(json(hashes))}`,
        files: hashes,
      }),
    );
    distributions.set(name, files);
  }
  return distributions;
}

export async function checkSkills(root = repositoryRoot) {
  const errors = [];
  for (const [name, expected] of await expectedSkills(root)) {
    const actual = await readTree(path.join(root, 'skills', name)).catch(
      (error) => {
        if (error.code === 'ENOENT') return new Map();
        throw error;
      },
    );
    for (const [file, bytes] of expected)
      if (!actual.get(file)?.equals(bytes))
        errors.push(`${name}/${file}: missing or stale`);
    for (const file of actual.keys())
      if (!expected.has(file)) errors.push(`${name}/${file}: unexpected file`);
  }
  return errors;
}

export async function buildSkills(root = repositoryRoot) {
  // Collect all inputs before replacing the generated directories.
  const distributions = await expectedSkills(root);
  for (const [name, files] of distributions) {
    const destination = path.join(root, 'skills', name);
    await fs.rm(destination, { recursive: true, force: true });
    for (const [file, bytes] of files) {
      const output = path.join(destination, file);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, bytes);
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes('--check')) {
    const errors = await checkSkills();
    if (errors.length) {
      console.error(
        `Skill distributions are stale; run pnpm build:skills.\n${errors.join('\n')}`,
      );
      process.exitCode = 1;
    } else console.log('Skill distributions match canonical sources.');
  } else {
    await buildSkills();
    console.log('Built three self-contained skill distributions.');
  }
}
