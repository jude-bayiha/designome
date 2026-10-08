import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const benchmarkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const repositoryRoot = path.resolve(benchmarkRoot, '..', '..');

export const routes = ['tasks', 'team', 'calendar', 'reporting', 'settings'];
export const viewport = { width: 1440, height: 1024 };
export const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export function parseArgs(argv, { flags = [], lists = [] } = {}) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--'))
      throw new Error(`Unexpected argument ${token}`);
    const key = token.slice(2);
    if (flags.includes(key)) {
      options[key] = true;
      continue;
    }
    const value = argv[++index];
    if (value === undefined) throw new Error(`Missing value for ${token}`);
    if (lists.includes(key)) (options[key] ??= []).push(value);
    else options[key] = value;
  }
  return options;
}

export function required(options, key) {
  if (options[key] === undefined) throw new Error(`--${key} is required`);
  return options[key];
}

export async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
}

// Hash a tree by sorted relative path and content, ignoring build output and dependencies.
export async function hashTree(directory, ignore = ['node_modules', '.next']) {
  const hash = crypto.createHash('sha256');
  async function visit(current, prefix) {
    const entries = (await fs.readdir(current, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (ignore.includes(entry.name)) continue;
      const relative = prefix + entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute, relative + '/');
      else if (entry.isFile()) {
        hash.update(relative + '\0');
        hash.update(await fs.readFile(absolute));
        hash.update('\0');
      }
    }
  }
  await visit(directory, '');
  return 'sha256:' + hash.digest('hex');
}

export async function listImages(directory) {
  const names = (await fs.readdir(directory)).filter((name) =>
    imageExtensions.has(path.extname(name).toLowerCase()),
  );
  if (names.length === 0) throw new Error(`No screenshots in ${directory}`);
  return names.sort();
}

export function fill(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/gu, (match, key) => {
    if (!(key in values)) throw new Error(`No value for ${match}`);
    return values[key];
  });
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

// Playwright is not a repository dependency; resolve it from the benchmark work tree or globally.
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const { createRequire } = await import('node:module');
    const require = createRequire(path.join(process.cwd(), 'noop.js'));
    return require('playwright');
  }
}
