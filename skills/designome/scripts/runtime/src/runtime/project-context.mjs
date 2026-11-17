import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { DesignomeError } from './errors.mjs';
import {
  pathExists,
  readJson,
  readTextIfExists,
  relativeInside,
} from './files.mjs';

const ignored = new Set([
  'node_modules',
  '.git',
  '.next',
  '.agents',
  '.claude',
  '.designome',
  'dist',
  'build',
  'coverage',
  'out',
  'test-results',
  'playwright-report',
]);
const cssNames = [
  'src/app/globals.css',
  'app/globals.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'src/index.css',
  'src/main.css',
];
const configNames = [
  'playwright.config.ts',
  'playwright.config.mts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cjs',
];
const deps = (pkg) => ({
  ...pkg.dependencies,
  ...pkg.devDependencies,
  ...pkg.peerDependencies,
});
const inside = (root, file) => {
  try {
    relativeInside(root, file);
    return true;
  } catch {
    return false;
  }
};
const rel = (root, file) =>
  path.relative(root, file).split(path.sep).join('/') || '.';

// JSONC configs are data, never executable TypeScript or application code.
async function readJsonc(file) {
  const raw = await fs.readFile(file, 'utf8');
  const uncommented = raw.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//gu,
    (match) => (match.startsWith('"') ? match : ''),
  );
  return JSON.parse(
    uncommented.replace(
      /"(?:[^"\\]|\\.)*"|,(\s*[}\]])/gu,
      (match, end) => end ?? match,
    ),
  );
}

async function workspacePatterns(root, pkg) {
  const patterns = [
    ...(Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : (pkg.workspaces?.packages ?? [])),
  ];
  const yaml = await readTextIfExists(path.join(root, 'pnpm-workspace.yaml'));
  if (yaml) {
    const section = yaml.match(
      /^packages:\s*(?:\n((?:[ \t]+[^\n]*\n?|\s*\n)*))/mu,
    );
    if (section)
      for (const line of section[1].split('\n')) {
        const item = line.match(/^\s+-\s+(['"]?)([^'"#]+)\1\s*(?:#.*)?$/u);
        if (item) patterns.push(item[2].trim());
      }
    else if (/^packages:/mu.test(yaml))
      throw new DesignomeError(
        'Use block-list pnpm workspace patterns or package.json workspaces',
        { code: 'WORKSPACE_CONFIG_UNSUPPORTED' },
      );
  }
  return [...new Set(patterns)];
}

async function rootsFor(projectRoot) {
  let current = projectRoot,
    gitRoot = null,
    workspaceRoot = null;
  for (;;) {
    try {
      if (await pathExists(path.join(current, '.git'))) gitRoot ??= current;
    } catch (error) {
      if (error.code === 'ERR_ACCESS_DENIED' && current !== projectRoot) break;
      throw error;
    }
    const pkg = await readJson(path.join(current, 'package.json')).catch(
      () => ({}),
    );
    if (
      pkg.workspaces ||
      (await pathExists(path.join(current, 'pnpm-workspace.yaml')))
    ) {
      workspaceRoot = current;
      break;
    }
    if (gitRoot || current === path.dirname(current)) break;
    current = path.dirname(current);
  }
  return { workspaceRoot: workspaceRoot ?? projectRoot, gitRoot };
}

async function sourceFiles(root) {
  const files = [];
  async function visit(directory, depth = 0) {
    if (depth > 16)
      throw new DesignomeError('Source discovery depth exceeded', {
        code: 'PROJECT_DISCOVERY_LIMIT',
      });
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file, depth + 1);
      else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) files.push(file);
      if (files.length > 3000)
        throw new DesignomeError(
          'Source discovery file budget exceeded; select a narrower frontend',
          { code: 'PROJECT_DISCOVERY_LIMIT' },
        );
    }
  }
  // Explicit source roots only; no arbitrary repository-wide crawl.
  for (const dir of ['src', 'app', 'pages', 'components', 'ui', 'lib'])
    if (await pathExists(path.join(root, dir))) {
      const real = await fs.realpath(path.join(root, dir));
      if (inside(root, real)) await visit(real);
    }
  return files.sort();
}

async function aliasPaths(root, workspaceRoot, seen = new Set()) {
  const file = ['tsconfig.json', 'jsconfig.json'].map((name) =>
    path.join(root, name),
  );
  const configFile = (await Promise.all(file.map(pathExists))).findIndex(
    Boolean,
  );
  if (configFile < 0 || seen.has(file[configFile])) return {};
  const selected = file[configFile];
  seen.add(selected);
  const config = await readJsonc(selected);
  let inherited = {};
  if (typeof config.extends === 'string') {
    let extended;
    if (config.extends.startsWith('.'))
      extended = path.resolve(root, config.extends);
    else {
      try {
        extended = createRequire(path.join(root, 'package.json')).resolve(
          config.extends,
        );
      } catch {
        /* Report unresolved aliases below. */
      }
    }
    if (extended && inside(workspaceRoot, extended)) {
      if (!path.extname(extended)) extended += '.json';
      if (!seen.has(extended)) {
        // Extended configs may have arbitrary filenames.
        const parent = await readJsonc(extended);
        const base = path.resolve(
          path.dirname(extended),
          parent.compilerOptions?.baseUrl ?? '.',
        );
        inherited = Object.fromEntries(
          Object.entries(parent.compilerOptions?.paths ?? {}).map(
            ([key, values]) => [key, values.map((v) => path.resolve(base, v))],
          ),
        );
      }
    }
  }
  const base = path.resolve(root, config.compilerOptions?.baseUrl ?? '.');
  return {
    ...inherited,
    ...Object.fromEntries(
      Object.entries(config.compilerOptions?.paths ?? {}).map(
        ([key, values]) => [key, values.map((v) => path.resolve(base, v))],
      ),
    ),
  };
}

function aliasCandidates(specifier, aliases, root, packages) {
  const results = [];
  for (const [key, targets] of Object.entries(aliases)) {
    const [prefix, suffix] = key.split('*');
    if (
      key.includes('*')
        ? specifier.startsWith(prefix) && specifier.endsWith(suffix)
        : specifier === key
    )
      for (const target of targets)
        results.push(
          target.replaceAll('*', () =>
            specifier.slice(prefix.length, suffix ? -suffix.length : undefined),
          ),
        );
  }
  if (specifier.startsWith('.')) results.push(path.resolve(root, specifier));
  for (const pkg of packages)
    if (
      pkg.name &&
      (specifier === pkg.name || specifier.startsWith(pkg.name + '/'))
    ) {
      const subpath = specifier.slice(pkg.name.length + 1);
      const exports = pkg.pkg.exports;
      const key = subpath ? './' + subpath : '.';
      for (const [pattern, value] of Object.entries(
        typeof exports === 'string' ? { '.': exports } : (exports ?? {}),
      )) {
        const [prefix, suffix] = pattern.split('*');
        if (
          pattern.includes('*')
            ? key.startsWith(prefix) && key.endsWith(suffix)
            : pattern === key
        ) {
          const target =
            typeof value === 'string'
              ? value
              : (value?.import ?? value?.default ?? value?.types);
          if (typeof target === 'string')
            results.push(
              path.resolve(
                pkg.root,
                target.replaceAll('*', () =>
                  key.slice(prefix.length, suffix ? -suffix.length : undefined),
                ),
              ),
            );
        }
      }
      if (subpath && exports === undefined)
        results.push(path.join(pkg.root, subpath));
      else if (
        !subpath &&
        exports === undefined &&
        (pkg.pkg.source || pkg.pkg.module || pkg.pkg.main)
      )
        results.push(
          path.join(pkg.root, pkg.pkg.source ?? pkg.pkg.module ?? pkg.pkg.main),
        );
    }
  return results;
}

async function resolveSource(candidates, workspaceRoot, directory = false) {
  for (const candidate of candidates)
    for (const suffix of directory
      ? ['']
      : [
          '',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '/index.tsx',
          '/index.ts',
          '/index.js',
        ]) {
      const file = candidate + suffix;
      const real = await fs.realpath(file).catch(() => null);
      if (
        real &&
        inside(workspaceRoot, real) &&
        (await fs.stat(real))[directory ? 'isDirectory' : 'isFile']()
      )
        return real;
    }
  return null;
}

// Reverse only unambiguous source mappings; every resulting specifier is then
// resolved again using the frontend's own aliases and declared public packages.
function sourceSpecifier(key, target, file) {
  const variants = [file.replace(/\.[cm]?[jt]sx?$/u, ''), file];
  if (/[/\\]index\.[cm]?[jt]sx?$/u.test(file))
    variants.push(path.dirname(file));
  const parts = target.split('*');
  for (const variant of variants) {
    if (parts.length === 1 && variant === target) return key;
    if (
      parts.length === 2 &&
      variant.startsWith(parts[0]) &&
      variant.endsWith(parts[1])
    ) {
      const match = variant.slice(
        parts[0].length,
        parts[1] ? -parts[1].length : undefined,
      );
      return key.replaceAll('*', () => match);
    }
  }
  return null;
}

async function frontendReuse(
  file,
  selected,
  aliases,
  packages,
  imports,
  workspaceRoot,
) {
  const examples = imports.filter((entry) => entry.resolved === file);
  const specifiers = new Set(
    examples
      .filter(
        (entry) =>
          inside(selected.root, entry.file) && !entry.specifier.startsWith('.'),
      )
      .map((entry) => entry.specifier),
  );
  for (const [key, targets] of Object.entries(aliases))
    for (const target of targets) {
      const specifier = sourceSpecifier(key, target, file);
      if (specifier) specifiers.add(specifier);
    }
  const publicPackages = packages.filter(
    (pkg) =>
      pkg.root === selected.root || Object.hasOwn(deps(selected.pkg), pkg.name),
  );
  for (const pkg of publicPackages) {
    if (!pkg.name) continue;
    const exports =
      typeof pkg.pkg.exports === 'string'
        ? { '.': pkg.pkg.exports }
        : (pkg.pkg.exports ?? {});
    for (const [key, value] of Object.entries(exports)) {
      const target =
        typeof value === 'string'
          ? value
          : (value?.import ?? value?.default ?? value?.types);
      if (typeof target !== 'string' || !key.startsWith('.')) continue;
      const subpath = sourceSpecifier(
        key,
        path.resolve(pkg.root, target),
        file,
      );
      if (subpath)
        specifiers.add(
          pkg.name + (subpath === '.' ? '' : '/' + subpath.slice(2)),
        );
    }
  }
  let importPath = null;
  for (const specifier of specifiers) {
    const resolved = await resolveSource(
      aliasCandidates(specifier, aliases, selected.root, publicPackages),
      workspaceRoot,
    );
    if (resolved === file) {
      importPath = specifier;
      break;
    }
  }
  return {
    importPath,
    importExamples: examples.map(({ file: from, specifier }) => ({
      from,
      specifier,
    })),
  };
}

export async function discoverProject({
  projectPath,
  frontend = null,
  cssEntry = null,
}) {
  const projectRoot = await fs.realpath(path.resolve(projectPath));
  const { workspaceRoot, gitRoot: earlyGit } = await rootsFor(projectRoot);
  let gitRoot = earlyGit;
  for (let dir = workspaceRoot; !gitRoot; dir = path.dirname(dir)) {
    try {
      if (await pathExists(path.join(dir, '.git'))) {
        gitRoot = dir;
        break;
      }
    } catch (error) {
      if (error.code === 'ERR_ACCESS_DENIED') break;
      throw error;
    }
    if (dir === path.dirname(dir)) break;
  }
  const rootPkg = await readJson(path.join(workspaceRoot, 'package.json'));
  const patterns = await workspacePatterns(workspaceRoot, rootPkg);
  const directories = new Set([workspaceRoot, projectRoot]);
  const include = patterns.filter((p) => !p.startsWith('!'));
  const exclude = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1));
  for (const pattern of include) {
    if (path.isAbsolute(pattern) || pattern.split('/').includes('..'))
      throw new DesignomeError('Workspace pattern escapes the workspace', {
        code: 'UNSAFE_WORKSPACE_PATH',
      });
    for await (const dir of fs.glob(pattern, {
      cwd: workspaceRoot,
      exclude: (name) =>
        name.split(path.sep).some((s) => ignored.has(s)) ||
        exclude.some((p) => path.matchesGlob(name, p)),
    })) {
      const absolute = path.resolve(workspaceRoot, dir);
      const real = await fs.realpath(absolute);
      if (
        inside(workspaceRoot, real) &&
        (await pathExists(path.join(real, 'package.json')))
      )
        directories.add(real);
      if (directories.size > 256)
        throw new DesignomeError(
          'Workspace package discovery budget exceeded',
          { code: 'PROJECT_DISCOVERY_LIMIT' },
        );
    }
  }
  const packages = [];
  for (const root of [...directories].sort()) {
    const pkg = await readJson(path.join(root, 'package.json'));
    const cssEntries = [];
    for (const name of cssNames)
      if (await pathExists(path.join(root, name)))
        cssEntries.push(path.join(root, name));
    const shadcn = await readJson(path.join(root, 'components.json')).catch(
      (error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      },
    );
    if (shadcn?.tailwind?.css) {
      const entry = path.resolve(root, shadcn.tailwind.css);
      if (
        inside(workspaceRoot, entry) &&
        (await pathExists(entry)) &&
        !cssEntries.includes(entry)
      )
        cssEntries.push(entry);
    }
    const dependencies = deps(pkg);
    const framework = [
      'next',
      'vite',
      '@angular/core',
      'nuxt',
      '@sveltejs/kit',
      'astro',
    ].some((name) => dependencies[name]);
    const webEntry = (
      await Promise.all(
        ['index.html', 'src/app', 'app', 'src/pages', 'pages'].map((entry) =>
          pathExists(path.join(root, entry)),
        ),
      )
    ).some(Boolean);
    const webScript = Object.values(pkg.scripts ?? {}).some((script) =>
      /\b(?:next|vite|nuxt|astro|react-scripts|webpack\s+serve|expo[^;&]*--web)\b/u.test(
        script,
      ),
    );
    const web =
      framework ||
      Boolean(
        dependencies['react-dom'] &&
        (webScript ||
          (webEntry && !dependencies['react-native'] && !dependencies.expo)),
      );
    packages.push({
      root,
      name: pkg.name ?? null,
      pkg,
      cssEntries,
      shadcn,
      web,
      native:
        Boolean(dependencies['react-native'] || dependencies.expo) && !web,
    });
  }
  let candidates = packages.filter((p) => !p.native && p.web);
  if (!candidates.length)
    candidates = packages.filter((p) => !p.native && p.cssEntries.length);
  let selected = null;
  if (frontend)
    selected = packages.find(
      (p) => p.root === path.resolve(projectRoot, frontend),
    );
  else if (cssEntry) {
    const entry = await fs
      .realpath(path.resolve(projectRoot, cssEntry))
      .catch(() => path.resolve(projectRoot, cssEntry));
    selected = packages
      .filter((p) => inside(p.root, entry))
      .sort((a, b) => b.root.length - a.root.length)[0];
  } else if (projectRoot !== workspaceRoot)
    selected = packages.find((p) => p.root === projectRoot);
  else if (candidates.length === 1) selected = candidates[0];
  else if (!candidates.length && packages.length === 1) selected = packages[0];
  if (frontend && !selected)
    throw new DesignomeError(
      'Frontend must resolve to a declared workspace package',
      { code: 'FRONTEND_NOT_FOUND' },
    );
  const result = {
    schemaVersion: '1.0.0',
    epistemicStatus: 'observed',
    projectRoot,
    gitRoot,
    workspaceRoot,
    workspacePatterns: patterns,
    status: selected
      ? 'resolved'
      : candidates.length > 1
        ? 'ambiguous'
        : 'not-found',
    candidates: candidates.map((p) => ({
      path: p.root,
      name: p.name,
      cssEntries: p.cssEntries,
    })),
    frontend: selected
      ? {
          path: selected.root,
          name: selected.name,
          platform: selected.native ? 'native' : 'web',
          cssEntries: selected.cssEntries,
          scripts: selected.pkg.scripts ?? {},
        }
      : null,
    dnaPath: path.join(projectRoot, '.designome/design-dna.json'),
    instructions: [],
    components: [],
    reuseCandidates: [],
    sourceImports: [],
    aliases: [],
    themes: [],
    libraries: [],
    sharedPackages: [],
    shadcn: null,
    limitations: [
      'Repository facts are technical context only; dependency declarations do not establish component use.',
      'Discovery resolves static imports and JSONC paths; dynamic imports, bundler plugins and conditional exports may need host review.',
    ],
  };
  if (!selected) return result;
  // Applicable parent instructions and configured shared sources remain explicit.
  const instructionDirs = new Set([workspaceRoot, projectRoot]);
  for (
    let dir = selected.root;
    inside(workspaceRoot, dir);
    dir = path.dirname(dir)
  ) {
    instructionDirs.add(dir);
    if (dir === workspaceRoot) break;
  }
  for (const dir of [...instructionDirs].sort())
    for (const name of ['AGENTS.md', 'CLAUDE.md'])
      if (await pathExists(path.join(dir, name)))
        result.instructions.push(path.join(dir, name));
  const reachable = new Set([selected]);
  const imports = [];
  const analyzed = new Set();
  while ([...reachable].some((p) => !analyzed.has(p))) {
    const pkg = [...reachable].find((p) => !analyzed.has(p));
    analyzed.add(pkg);
    const aliases = await aliasPaths(pkg.root, workspaceRoot);
    result.aliases.push({ packagePath: pkg.root, paths: aliases });
    result.themes.push(...pkg.cssEntries);
    for (const name of ['AGENTS.md', 'CLAUDE.md'])
      if (await pathExists(path.join(pkg.root, name)))
        result.instructions.push(path.join(pkg.root, name));
    for (const file of await sourceFiles(pkg.root)) {
      const code = (await fs.readFile(file, 'utf8')).replace(
        /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//gu,
        (match) =>
          match.startsWith('"') || match.startsWith("'") ? match : '',
      );
      for (const match of code.matchAll(
        /(?:\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?|\b(?:import|require)\s*\()\s*['"]([^'"]+)['"]/gu,
      )) {
        const specifier = match[1];
        const resolved = await resolveSource(
          aliasCandidates(specifier, aliases, path.dirname(file), packages),
          workspaceRoot,
        );
        imports.push({ file, specifier, resolved });
        for (const other of packages)
          if (
            other !== pkg &&
            resolved &&
            inside(other.root, resolved) &&
            other.root !== workspaceRoot
          )
            reachable.add(other);
      }
    }
    for (const name of Object.keys(deps(pkg.pkg))) {
      const shared = packages.find((p) => p.name === name);
      if (shared) reachable.add(shared);
    }
  }
  const frontendAliases = await aliasPaths(selected.root, workspaceRoot);
  const reuse = (file) =>
    frontendReuse(
      file,
      selected,
      frontendAliases,
      packages,
      imports,
      workspaceRoot,
    );
  result.sourceImports = imports;
  result.instructions = [...new Set(result.instructions)].sort();
  const configOwner = selected.shadcn
    ? selected
    : [...reachable].find((p) => p.shadcn);
  if (configOwner) {
    const config = configOwner.shadcn,
      aliases = await aliasPaths(configOwner.root, workspaceRoot);
    const ui = config.aliases?.ui;
    const candidates =
      typeof ui === 'string'
        ? aliasCandidates(ui, aliases, configOwner.root, packages)
        : [];
    if (ui?.startsWith('@/') && !Object.keys(aliases).length)
      candidates.push(path.join(configOwner.root, 'src', ui.slice(2)));
    if (ui && !ui.startsWith('@') && !ui.startsWith('#') && !ui.startsWith('~'))
      candidates.push(path.resolve(configOwner.root, ui));
    const directory = await resolveSource(candidates, workspaceRoot, true);
    result.shadcn = {
      configPath: path.join(configOwner.root, 'components.json'),
      ...config,
      componentDirectory: directory,
      aliasesResolved: aliases,
    };
    if (!directory)
      result.limitations.push(
        'Configured UI alias could not be resolved; do not initialize or replace existing components.',
      );
    else
      for (const file of await sourceFilesFromDirectory(directory)) {
        result.components.push({
          name: path.basename(file).replace(/\.[^.]+$/u, ''),
          path: file,
          ...(await reuse(file)),
          usedBy: imports.filter((i) => i.resolved === file).map((i) => i.file),
        });
      }
  }
  for (const entry of imports)
    if (
      entry.resolved &&
      /\.[jt]sx$/u.test(entry.resolved) &&
      !result.components.some(
        (component) => component.path === entry.resolved,
      ) &&
      !result.reuseCandidates.some(
        (component) => component.path === entry.resolved,
      )
    ) {
      result.reuseCandidates.push({
        name: path.basename(entry.resolved).replace(/\.[^.]+$/u, ''),
        path: entry.resolved,
        ...(await reuse(entry.resolved)),
        usedBy: imports
          .filter((item) => item.resolved === entry.resolved)
          .map((item) => item.file),
      });
    }
  if (
    [...result.components, ...result.reuseCandidates].some(
      (component) => !component.importPath,
    )
  )
    result.limitations.push(
      'Some frontend imports are unresolved; importer-scoped examples do not define a reusable alias. Resolve imports for the destination file rather than copying a package-local alias.',
    );
  for (const pkg of reachable)
    if (pkg !== selected)
      result.sharedPackages.push({
        name: pkg.name,
        path: pkg.root,
        usage: imports.some((i) => i.resolved && inside(pkg.root, i.resolved))
          ? 'imported'
          : 'declared',
      });
  for (const name of [
    ...new Set([...reachable].flatMap((p) => Object.keys(deps(p.pkg)))),
  ].filter((n) =>
    /shadcn|radix|base-ui|@mui|chakra|antd|tailwind|lucide/u.test(n),
  ))
    result.libraries.push({
      name,
      declared: true,
      imports: imports
        .filter(
          (i) => i.specifier === name || i.specifier.startsWith(name + '/'),
        )
        .map(({ file, specifier }) => ({ file, specifier })),
    });
  return result;
}

async function sourceFilesFromDirectory(directory) {
  const files = [];
  for await (const entry of fs.glob('**/*.{tsx,ts,jsx,js}', {
    cwd: directory,
    exclude: (name) => name.split(path.sep).some((s) => ignored.has(s)),
  })) {
    const real = await fs.realpath(path.join(directory, entry));
    if (inside(directory, real)) files.push(real);
    if (files.length > 1000)
      throw new DesignomeError('UI component budget exceeded', {
        code: 'PROJECT_DISCOVERY_LIMIT',
      });
  }
  return files.sort();
}

export function requireFrontend(context) {
  if (context.status !== 'resolved')
    throw new DesignomeError(
      'Frontend target is ambiguous or missing; select a declared frontend (or installation --css-entry)',
      { code: 'FRONTEND_AMBIGUOUS', details: context.candidates },
    );
  return context.frontend.path;
}

export async function inspectPlaywright(context) {
  if (!context.frontend)
    return {
      available: false,
      declared: false,
      resolvable: false,
      configured: false,
      browserAvailable: false,
      serverReachable: 'not-probed',
      captureExecuted: false,
      configs: [],
      dependency: null,
      reason: 'Frontend is unresolved',
    };
  const root = context.frontend.path;
  const app = await readJson(path.join(root, 'package.json'));
  const workspace = await readJson(
    path.join(context.workspaceRoot, 'package.json'),
  );
  const dependencies = { ...deps(workspace), ...deps(app) };
  const dependency = dependencies['@playwright/test']
    ? '@playwright/test'
    : dependencies.playwright
      ? 'playwright'
      : null;
  const configs = [];
  for (const name of configNames)
    if (await pathExists(path.join(root, name)))
      configs.push(rel(context.projectRoot, path.join(root, name)));
  let modulePath = null,
    browserPath = null,
    loadError = null;
  const require = createRequire(path.join(root, 'package.json'));
  for (const name of [dependency, '@playwright/test', 'playwright'].filter(
    Boolean,
  )) {
    try {
      modulePath = require.resolve(name);
      break;
    } catch {
      /* Keep declaration separate from resolution. */
    }
  }
  if (modulePath)
    try {
      const mod = await import(pathToFileURL(modulePath).href);
      browserPath =
        (mod.chromium ?? mod.default?.chromium)?.executablePath() ?? null;
    } catch (error) {
      loadError = error.message;
    }
  const browserAvailable = Boolean(
    browserPath && (await pathExists(browserPath)),
  );
  return {
    available: Boolean(modulePath && browserAvailable && !loadError),
    declared: Boolean(dependency),
    dependency,
    resolvable: Boolean(modulePath),
    modulePath,
    configured: configs.length > 0,
    configs,
    browserAvailable,
    browserPath,
    serverReachable: 'not-probed',
    captureExecuted: false,
    cwd: root,
    loadError,
  };
}

export async function launchProjectPlaywright(context, options = {}) {
  const capability = await inspectPlaywright(context);
  if (!capability.available)
    throw new DesignomeError(
      'Selected frontend Playwright or Chromium executable is unavailable',
      { code: 'AUDIT_PROVIDER_UNAVAILABLE', details: capability },
    );
  const imported = await import(pathToFileURL(capability.modulePath).href);
  try {
    return await (imported.chromium ?? imported.default.chromium).launch(
      options,
    );
  } catch (error) {
    throw new DesignomeError('Playwright resolved but browser launch failed', {
      code: 'AUDIT_BROWSER_LAUNCH_FAILED',
      details: { ...capability, reason: error.message },
    });
  }
}
