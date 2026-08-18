import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { planInstallation } from '../../src/runtime/install.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

async function makeFixture(t, name, setup) {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `designome-adapter-${name}-`),
  );
  t.after(() => fs.rm(temporaryRoot, { force: true, recursive: true }));
  const projectRoot = path.join(temporaryRoot, 'project');
  await fs.mkdir(path.join(projectRoot, 'src', 'styles'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify({ name, private: true, ...(setup.packageJson ?? {}) }, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(projectRoot, 'src', 'styles', 'globals.css'),
    setup.css,
  );
  if (setup.moduleCss) {
    await fs.mkdir(path.join(projectRoot, 'src', 'components'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(projectRoot, 'src', 'components', 'card.module.css'),
      '.card { display: grid; }\n',
    );
  }
  if (setup.components) {
    await fs.writeFile(
      path.join(projectRoot, 'components.json'),
      `${JSON.stringify(setup.components, null, 2)}\n`,
    );
  }
  if (setup.existingRules) {
    await fs.mkdir(path.join(projectRoot, 'docs', 'ui'), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'docs', 'ui', 'core.md'),
      '# Existing UI rules\n',
    );
  }
  const dna = JSON.parse(
    await fs.readFile(
      path.join(repositoryRoot, 'examples', 'design-dna.reference-v0.2.json'),
      'utf8',
    ),
  );
  dna.status = 'accepted';
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);
  return { projectRoot, dnaPath };
}

test('adapter evaluation covers plain CSS, Tailwind, shadcn, and existing rules', async (t) => {
  const cases = [
    {
      name: 'css-modules',
      setup: { css: 'body { margin: 0; }\n', moduleCss: true },
      expectedStrategy: 'css-variables',
    },
    {
      name: 'tailwind',
      setup: {
        css: '@import "tailwindcss";\n',
        packageJson: { devDependencies: { tailwindcss: '^4.0.0' } },
      },
      expectedStrategy: 'tailwind-utilities',
    },
    {
      name: 'shadcn',
      setup: {
        css: '@import "tailwindcss";\n',
        packageJson: { devDependencies: { tailwindcss: '^4.0.0' } },
        components: {
          style: 'nova',
          base: 'radix',
          iconLibrary: 'lucide',
          rsc: true,
          tailwind: { css: 'src/styles/globals.css', cssVariables: true },
          aliases: { ui: '@/components/ui' },
        },
      },
      expectedStrategy: 'shadcn-components',
    },
    {
      name: 'existing-rules',
      setup: { css: 'body { margin: 0; }\n', existingRules: true },
      expectedStrategy: 'css-variables',
      existingRulePaths: ['docs/ui/core.md'],
      rulePrecedence: 'existing-first',
    },
  ];

  for (const fixture of cases) {
    const { projectRoot, dnaPath } = await makeFixture(
      t,
      fixture.name,
      fixture.setup,
    );
    const plan = await planInstallation({
      dnaPath,
      projectPath: projectRoot,
      cssEntry: 'src/styles/globals.css',
      existingRulePaths: fixture.existingRulePaths ?? [],
      rulePrecedence: fixture.rulePrecedence ?? 'complement',
    });
    assert.equal(
      plan.publicPlan.adapter.styling.strategy,
      fixture.expectedStrategy,
      fixture.name,
    );
    assert.equal(
      plan.publicPlan.adapter.integrationPolicy.rulePrecedence,
      fixture.rulePrecedence ?? 'complement',
      fixture.name,
    );
    assert.equal(
      await fs.stat(path.join(projectRoot, '.designome')).catch(() => null),
      null,
      `${fixture.name} dry-run must not mutate`,
    );
  }
});
