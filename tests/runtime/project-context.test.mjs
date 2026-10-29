import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  discoverProject,
  inspectPlaywright,
  requireFrontend,
} from '../../src/runtime/project-context.mjs';
import {
  planInstallation,
  installDesignDna,
  verifyInstallation,
} from '../../src/runtime/install.mjs';

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'designome-context-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(
      path.join(root, file),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }
  return root;
}
const simple = {
  'package.json': { name: 'simple' },
  'src/app/globals.css': 'body {}',
};
const monorepo = {
  'package.json': { name: 'workspace', private: true },
  'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
  'apps/console/package.json': {
    name: 'console',
    dependencies: { next: '*', '@workspace/ui': 'workspace:*' },
    devDependencies: { '@playwright/test': '*' },
  },
  'apps/console/src/app/globals.css': '@import "tailwindcss";',
  'apps/console/playwright.config.ts': 'export default {};',
  'apps/console/tsconfig.json': {
    compilerOptions: {
      baseUrl: '.',
      paths: { '#kit/*': ['../../packages/ui/src/*'] },
    },
  },
  'apps/console/src/app/page.tsx': 'import { Button } from "#kit/button";',
  'packages/ui/package.json': {
    name: '@workspace/ui',
    dependencies: { '@base-ui/react': '*' },
  },
  'packages/ui/components.json': {
    style: 'base-nova',
    aliases: { ui: '~primitives' },
    tailwind: { css: 'src/theme.css', cssVariables: true },
  },
  'packages/ui/tsconfig.json':
    '{ // nonstandard alias\n "compilerOptions": {"paths":{"~primitives":["./src"]}}, }',
  'packages/ui/src/button.tsx':
    'import { Button } from "@base-ui/react/button"; export { Button };',
  'packages/ui/src/theme.css': ':root {}',
};

test('simple project resolves technical roots without inventing a UI library', async (t) => {
  const root = await fixture(t, simple),
    context = await discoverProject({ projectPath: root });
  assert.equal(context.frontend.path, root);
  assert.equal(context.shadcn, null);
  assert.deepEqual(context.frontend.cssEntries, [
    path.join(root, 'src/app/globals.css'),
  ]);
});

test('nested frontend discovers shared shadcn, JSONC aliases, actual imports and workspace-only Playwright', async (t) => {
  const root = await fixture(t, monorepo),
    context = await discoverProject({ projectPath: root });
  assert.equal(context.frontend.path, path.join(root, 'apps/console'));
  assert.equal(context.sharedPackages[0].usage, 'imported');
  assert.equal(
    context.shadcn.componentDirectory,
    path.join(root, 'packages/ui/src'),
  );
  assert.equal(context.components[0].name, 'button');
  assert.equal(context.components[0].usedBy.length, 1);
  assert.equal(
    context.libraries.find((x) => x.name === '@base-ui/react').imports.length,
    1,
  );
  const pw = await inspectPlaywright(context);
  assert.equal(pw.declared, true);
  assert.equal(pw.resolvable, false);
  assert.equal(pw.available, false);
  assert.equal(pw.configured, true);
  assert.deepEqual(pw.configs, ['apps/console/playwright.config.ts']);
});

test('multiple frontends stay ambiguous until an explicit package or CSS entry selects one', async (t) => {
  const root = await fixture(t, {
    ...monorepo,
    'apps/site/package.json': { dependencies: { vite: '*' } },
    'apps/site/src/main.css': 'body{}',
  });
  const context = await discoverProject({ projectPath: root });
  assert.equal(context.status, 'ambiguous');
  assert.equal(context.frontend, null);
  assert.throws(() => requireFrontend(context), { code: 'FRONTEND_AMBIGUOUS' });
  assert.equal(
    (await discoverProject({ projectPath: root, frontend: 'apps/site' }))
      .frontend.path,
    path.join(root, 'apps/site'),
  );
  assert.equal(
    (
      await discoverProject({
        projectPath: root,
        cssEntry: 'apps/console/src/app/globals.css',
      })
    ).frontend.name,
    'console',
  );
});

test('config presence is distinct from package resolution and browser availability', async (t) => {
  const root = await fixture(t, {
    ...simple,
    'playwright.config.ts': 'export default {};',
  });
  const pw = await inspectPlaywright(
    await discoverProject({ projectPath: root }),
  );
  assert.equal(pw.configured, true);
  assert.equal(pw.declared, false);
  assert.equal(pw.resolvable, false);
  assert.equal(pw.available, false);
  await fs.mkdir(path.join(root, 'node_modules/playwright'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, 'node_modules/playwright/package.json'),
    JSON.stringify({ main: 'index.cjs' }),
  );
  await fs.writeFile(
    path.join(root, 'node_modules/playwright/index.cjs'),
    'exports.chromium={executablePath:()=>"/missing/designome-chromium"}',
  );
  const installed = await inspectPlaywright(
    await discoverProject({ projectPath: root }),
  );
  assert.equal(installed.resolvable, true);
  assert.equal(installed.browserAvailable, false);
  assert.equal(installed.available, false);
});

test('nested installation reuses shared components and preserves overrides on the second run', async (t) => {
  const root = await fixture(t, monorepo);
  const dna = JSON.parse(
    await fs.readFile('examples/design-dna.reference-v0.3.json', 'utf8'),
  );
  dna.status = 'accepted';
  const dnaPath = path.join(root, 'accepted.json');
  await fs.writeFile(dnaPath, JSON.stringify(dna));
  const options = { projectPath: root, dnaPath, instructionsReviewed: true };
  const plan = await planInstallation(options);
  assert.equal(plan.publicPlan.adapter.styling.strategy, 'shadcn-components');
  assert.deepEqual(plan.publicPlan.adapter.styling.shadcn.installedComponents, [
    'button',
  ]);
  await installDesignDna(options);
  const override = path.join(
    root,
    'apps/console/src/app/designome.overrides.css',
  );
  await fs.appendFile(
    override,
    '\n/* Explicit user override */\n:root { --sidebar-width:220px; }\n',
  );
  const second = await installDesignDna(options);
  assert.equal(
    second.actions.filter((action) =>
      ['create', 'update', 'delete'].includes(action.action),
    ).length,
    0,
  );
  assert.match(await fs.readFile(override, 'utf8'), /220px/);
  assert.equal((await verifyInstallation({ projectPath: root })).valid, true);
  const integration = await fs.readFile(
    path.join(root, 'docs/designome/governance/integration.md'),
    'utf8',
  );
  assert.match(integration, /packages\/ui\/src\/button.tsx/);
  assert.match(integration, /#kit|~primitives/);
  const managedPath = path.join(
    root,
    'docs/designome/governance/integration.md',
  );
  await fs.appendFile(managedPath, '\nManual change.\n');
  const conflict = await installDesignDna(options);
  assert.equal(conflict.status, 'conflict');
  assert.equal((await verifyInstallation({ projectPath: root })).valid, false);
  assert.match(await fs.readFile(managedPath, 'utf8'), /Manual change/);
});

test('resolved imports identify shared UI without shadcn and declarations stay separate from use', async (t) => {
  const files = structuredClone(monorepo);
  delete files['packages/ui/components.json'];
  files['packages/ui/package.json'].dependencies['@mui/material'] = '*';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.equal(context.shadcn, null);
  assert.ok(
    context.reuseCandidates.some((item) => item.importPath === '#kit/button'),
  );
  assert.equal(
    context.libraries.find((item) => item.name === '@mui/material').imports
      .length,
    0,
  );
});

test('workspace export paths and inherited aliases resolve without scanning build or dependency trees', async (t) => {
  const files = structuredClone(monorepo);
  files['package.json'].workspaces = { packages: ['apps/*', 'packages/*'] };
  files['packages/ui/package.json'].exports = { './*': './src/*.tsx' };
  files['apps/console/tsconfig.base.json'] = {
    compilerOptions: { paths: { '#shared/*': ['../../packages/ui/src/*'] } },
  };
  files['apps/console/tsconfig.json'] = { extends: './tsconfig.base.json' };
  files['apps/console/src/app/page.tsx'] =
    'import { Button } from "@workspace/ui/button";\nimport { Button as Shared } from "#shared/button";\n// import { Ghost } from "@mui/material";';
  files['apps/console/node_modules/ignored/src/ghost.tsx'] =
    'import "@mui/material";';
  files['apps/console/dist/ghost.tsx'] = 'import "@mui/material";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.equal(context.sharedPackages[0].usage, 'imported');
  assert.equal(
    context.sourceImports.filter((item) =>
      item.resolved?.endsWith('/button.tsx'),
    ).length,
    2,
  );
  assert.equal(
    context.sourceImports.some((item) => item.specifier === '@mui/material'),
    false,
  );
});

test('a shared UI peer dependency does not create an extra frontend candidate', async (t) => {
  const files = structuredClone(monorepo);
  files['packages/ui/package.json'].peerDependencies = { 'react-dom': '*' };
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.equal(context.status, 'resolved');
  assert.equal(context.frontend.name, 'console');
  assert.equal(context.candidates.length, 1);
});

test('shared component reuse imports resolve from the frontend rather than the UI package aliases', async (t) => {
  const files = structuredClone(monorepo);
  files['apps/console/tsconfig.json'].compilerOptions.paths['#kit/*'] = [
    '../../packages/ui/src/components/ui/*',
  ];
  files['packages/ui/tsconfig.json'] = {
    compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } },
  };
  files['packages/ui/components.json'].aliases.ui = '@/components/ui';
  delete files['packages/ui/src/button.tsx'];
  files['packages/ui/src/components/ui/button.tsx'] =
    'export const Button = () => "Button";';
  files['packages/ui/src/components/ui/input.tsx'] =
    'export const Input = () => "Input";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.deepEqual(
    context.components.map((item) => item.importPath),
    ['#kit/button', '#kit/input'],
  );
  assert.equal(
    context.components[0].importExamples[0].specifier,
    '#kit/button',
  );
});

test('Next Pages Router imports establish usage and expose shared UI sources', async (t) => {
  const files = structuredClone(monorepo);
  delete files['apps/console/src/app/page.tsx'];
  files['apps/console/package.json'].dependencies['@mui/material'] = '*';
  files['apps/console/pages/index.tsx'] =
    'import { Card } from "@mui/material";\nimport { Button } from "#kit/button";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.equal(
    context.libraries.find((item) => item.name === '@mui/material').imports
      .length,
    1,
  );
  assert.equal(context.sharedPackages[0].usage, 'imported');
  assert.equal(context.components[0].usedBy.length, 1);
});

test('all wildcard occurrences in workspace export targets resolve to the same match', async (t) => {
  const files = structuredClone(monorepo);
  files['packages/ui/package.json'].exports = { './*': './src/*/*.tsx' };
  files['apps/console/src/app/page.tsx'] =
    'import { Button } from "@workspace/ui/button";';
  delete files['packages/ui/src/button.tsx'];
  files['packages/ui/src/button/button.tsx'] =
    'export const Button = () => "Button";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.ok(
    context.sourceImports.some(
      (item) =>
        item.resolved === path.join(root, 'packages/ui/src/button/button.tsx'),
    ),
  );
  assert.equal(context.sharedPackages[0].usage, 'imported');
});

test('an unexported shared component keeps its frontend import unknown', async (t) => {
  const files = structuredClone(monorepo);
  files['apps/console/tsconfig.json'].compilerOptions.paths = {
    '#button': ['../../packages/ui/src/button.tsx'],
  };
  files['apps/console/src/app/page.tsx'] = 'import { Button } from "#button";';
  files['packages/ui/src/input.tsx'] = 'export const Input = () => "Input";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.equal(
    context.components.find((item) => item.name === 'button').importPath,
    '#button',
  );
  assert.equal(
    context.components.find((item) => item.name === 'input').importPath,
    null,
  );
  assert.ok(
    context.limitations.some((item) =>
      /frontend imports are unresolved/u.test(item),
    ),
  );
});

test('workspace export wildcard substitutions preserve literal replacement characters', async (t) => {
  const files = structuredClone(monorepo);
  files['packages/ui/package.json'].exports = { './*': './src/*/*.tsx' };
  files['apps/console/src/app/page.tsx'] =
    'import { Button } from "@workspace/ui/$&";';
  delete files['packages/ui/src/button.tsx'];
  files['packages/ui/src/$&/$&.tsx'] = 'export const Button = () => "Button";';
  const root = await fixture(t, files);
  const context = await discoverProject({ projectPath: root });
  assert.ok(
    context.sourceImports.some(
      (item) => item.resolved === path.join(root, 'packages/ui/src/$&/$&.tsx'),
    ),
  );
});
