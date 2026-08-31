#!/usr/bin/env node

import path from 'node:path';

import { runAudit } from '../src/runtime/audit.mjs';
import { assertValidDesignDna } from '../src/runtime/design-dna.mjs';
import { doctorProject } from '../src/runtime/doctor.mjs';
import { DesignomeError } from '../src/runtime/errors.mjs';
import { readJson } from '../src/runtime/files.mjs';
import {
  installDesignDna,
  verifyInstallation,
} from '../src/runtime/install.mjs';
import { initializeRun } from '../src/runtime/run.mjs';
import {
  initializeWorkflow,
  resumeWorkflow,
} from '../src/runtime/orchestrator.mjs';

function parseArguments(values) {
  const options = new Map();
  const positionals = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }
    const name = value.slice(2);
    if (
      [
        'dry-run',
        'instructions-reviewed',
        'implementation-authorized',
        'browser-install-authorized',
        'overwrite',
        'require-accepted',
        'resume',
        'accept-dna',
        'help',
      ].includes(name)
    ) {
      options.set(name, true);
      continue;
    }
    const next = values[index + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new DesignomeError(`Missing value for --${name}`, {
        code: 'INVALID_ARGUMENTS',
      });
    }
    index += 1;
    const existing = options.get(name);
    options.set(
      name,
      existing === undefined
        ? next
        : Array.isArray(existing)
          ? [...existing, next]
          : [existing, next],
    );
  }
  return { options, positionals };
}

function option(
  parsed,
  name,
  { required = false, multiple = false, fallback = undefined } = {},
) {
  const value = parsed.options.get(name);
  if (value === undefined) {
    if (required)
      throw new DesignomeError(`--${name} is required`, {
        code: 'INVALID_ARGUMENTS',
      });
    return fallback;
  }
  if (multiple) return Array.isArray(value) ? value : [value];
  if (Array.isArray(value)) {
    throw new DesignomeError(`--${name} may only be supplied once`, {
      code: 'INVALID_ARGUMENTS',
    });
  }
  return value;
}

function assertArguments(parsed, allowedOptions) {
  if (parsed.positionals.length > 0) {
    throw new DesignomeError(
      `Unexpected positional arguments: ${parsed.positionals.join(', ')}`,
      { code: 'INVALID_ARGUMENTS' },
    );
  }
  for (const name of parsed.options.keys()) {
    if (!allowedOptions.includes(name)) {
      throw new DesignomeError(`Unknown option: --${name}`, {
        code: 'INVALID_ARGUMENTS',
      });
    }
  }
}

function printHelp() {
  process.stdout.write(`Designome deterministic helper\n\n`);
  process.stdout.write(`Commands:\n`);
  process.stdout.write(
    `  run --source <capture> [--source <capture>] --project <dir> [--workspace <dir>] [--provider <name>] [--css-entry <file>]\n`,
  );
  process.stdout.write(
    `  run --resume [--workspace <dir>] [--accept-dna] [--host-event <event>] [--evidence <file>]\n`,
  );
  process.stdout.write(
    `  extract --output <dir> --source <capture> [--source <capture>] [--motion <mode>] [--project <dir>]\n`,
  );
  process.stdout.write(
    `  init-run --output <dir> --image <file> [--image <file>] [--motion <mode>] [--project <dir>]\n`,
  );
  process.stdout.write(
    `  validate-dna --file <design-dna.json> [--require-accepted]\n`,
  );
  process.stdout.write(
    `  install --dna <file> --project <dir> [--css-entry <file>] [--scope <selector>] [--docs-dir <dir>] [--rule-precedence <mode>] [--existing-rules <path>] [--styling <strategy>] [--ui-kit <auto|none|shadcn>] --dry-run\n`,
  );
  process.stdout.write(
    `  install --dna <file> --project <dir> [options] --instructions-reviewed\n`,
  );
  process.stdout.write(`  verify-install --project <dir>\n`);
  process.stdout.write(
    `  doctor --project <dir> [--dna <accepted-design-dna.json>]\n`,
  );
  process.stdout.write(
    `  audit --project <dir> [--config <file>] [--output <dir>] [--provider <name>] [--evidence <file>] [--mode <report|repair>] [--max-passes <1|2|3>] [--implementation-authorized] [--browser-install-authorized] [--dry-run] [--overwrite]\n`,
  );
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }
  const parsed = parseArguments(rest);
  if (parsed.options.get('help')) {
    printHelp();
    return;
  }

  let result;
  if (command === 'run') {
    assertArguments(parsed, [
      'source',
      'project',
      'workspace',
      'motion',
      'provider',
      'css-entry',
      'resume',
      'accept-dna',
      'host-event',
      'evidence',
      'help',
    ]);
    const resume = Boolean(parsed.options.get('resume'));
    if (resume) {
      if (parsed.options.has('source') || parsed.options.has('project')) {
        throw new DesignomeError(
          '--resume cannot be combined with --source or --project',
          { code: 'INVALID_ARGUMENTS' },
        );
      }
      result = await resumeWorkflow({
        workspacePath: option(parsed, 'workspace', { fallback: process.cwd() }),
        acceptDesignDna: Boolean(parsed.options.get('accept-dna')),
        hostEvent: option(parsed, 'host-event', { fallback: null }),
        evidencePath: option(parsed, 'evidence', { fallback: null }),
      });
    } else {
      if (
        parsed.options.has('accept-dna') ||
        parsed.options.has('host-event')
      ) {
        throw new DesignomeError(
          '--accept-dna and --host-event require --resume',
          { code: 'INVALID_ARGUMENTS' },
        );
      }
      result = await initializeWorkflow({
        sourcePaths: option(parsed, 'source', {
          required: true,
          multiple: true,
        }),
        projectPath: option(parsed, 'project', { required: true }),
        workspacePath: option(parsed, 'workspace', { fallback: process.cwd() }),
        motionMode: option(parsed, 'motion', { fallback: 'off' }),
        provider: option(parsed, 'provider', { fallback: 'in-app-browser' }),
        cssEntry: option(parsed, 'css-entry', { fallback: null }),
      });
    }
  } else if (command === 'extract') {
    assertArguments(parsed, ['output', 'source', 'motion', 'project', 'help']);
    result = await initializeRun({
      outputDirectory: option(parsed, 'output', { required: true }),
      imagePaths: option(parsed, 'source', { required: true, multiple: true }),
      motionMode: option(parsed, 'motion', { fallback: 'off' }),
      targetProjectPath: option(parsed, 'project', { fallback: null }),
    });
    result = {
      ...result,
      executionOwner: 'host-agent',
      handoff:
        'The runtime initialized deterministic evidence metadata. Invoke the designome-extract skill for host-model visual reasoning.',
    };
  } else if (command === 'init-run') {
    assertArguments(parsed, ['output', 'image', 'motion', 'project', 'help']);
    result = await initializeRun({
      outputDirectory: option(parsed, 'output', { required: true }),
      imagePaths: option(parsed, 'image', { required: true, multiple: true }),
      motionMode: option(parsed, 'motion', { fallback: 'off' }),
      targetProjectPath: option(parsed, 'project', { fallback: null }),
    });
  } else if (command === 'validate-dna') {
    assertArguments(parsed, ['file', 'require-accepted', 'help']);
    const filePath = path.resolve(option(parsed, 'file', { required: true }));
    const dna = await readJson(filePath);
    await assertValidDesignDna(dna, {
      requireAccepted: Boolean(parsed.options.get('require-accepted')),
    });
    result = {
      valid: true,
      validationLayer: 'runtime-semantic',
      file: filePath,
      documentId: dna.documentId,
      status: dna.status,
      revision: dna.revision.number,
    };
  } else if (command === 'install') {
    assertArguments(parsed, [
      'dna',
      'project',
      'css-entry',
      'scope',
      'docs-dir',
      'rule-precedence',
      'existing-rules',
      'styling',
      'ui-kit',
      'dry-run',
      'instructions-reviewed',
      'help',
    ]);
    result = await installDesignDna({
      dnaPath: option(parsed, 'dna', { required: true }),
      projectPath: option(parsed, 'project', { required: true }),
      cssEntry: option(parsed, 'css-entry', { fallback: null }),
      scope: option(parsed, 'scope', { fallback: ':root' }),
      documentationDirectory: option(parsed, 'docs-dir', {
        fallback: 'docs/designome',
      }),
      rulePrecedence: option(parsed, 'rule-precedence', {
        fallback: 'complement',
      }),
      existingRulePaths: option(parsed, 'existing-rules', {
        fallback: [],
        multiple: true,
      }),
      stylingStrategy: option(parsed, 'styling', { fallback: 'auto' }),
      uiKitPreference: option(parsed, 'ui-kit', { fallback: 'auto' }),
      dryRun: Boolean(parsed.options.get('dry-run')),
      instructionsReviewed: Boolean(
        parsed.options.get('instructions-reviewed'),
      ),
    });
    if (result.status === 'conflict') process.exitCode = 2;
  } else if (command === 'verify-install') {
    assertArguments(parsed, ['project', 'help']);
    result = await verifyInstallation({
      projectPath: option(parsed, 'project', { required: true }),
    });
    if (!result.valid) process.exitCode = 1;
  } else if (command === 'doctor') {
    assertArguments(parsed, ['project', 'dna', 'help']);
    result = await doctorProject({
      projectPath: option(parsed, 'project', { required: true }),
      dnaPath: option(parsed, 'dna', { fallback: null }),
      requireDna: true,
    });
    if (result.status !== 'passed') process.exitCode = 1;
  } else if (command === 'audit') {
    assertArguments(parsed, [
      'project',
      'config',
      'output',
      'evidence',
      'provider',
      'mode',
      'max-passes',
      'implementation-authorized',
      'browser-install-authorized',
      'dry-run',
      'overwrite',
      'help',
    ]);
    result = await runAudit({
      projectPath: option(parsed, 'project', { required: true }),
      configPath: option(parsed, 'config', {
        fallback: '.designome/audit.config.json',
      }),
      outputDirectory: option(parsed, 'output', { fallback: null }),
      evidencePath: option(parsed, 'evidence', { fallback: null }),
      provider: option(parsed, 'provider', { fallback: 'auto' }),
      mode: option(parsed, 'mode', { fallback: 'report' }),
      maximumRepairPasses: option(parsed, 'max-passes', { fallback: '2' }),
      implementationAuthorized: Boolean(
        parsed.options.get('implementation-authorized'),
      ),
      browserInstallAuthorized: Boolean(
        parsed.options.get('browser-install-authorized'),
      ),
      dryRun: Boolean(parsed.options.get('dry-run')),
      overwrite: Boolean(parsed.options.get('overwrite')),
    });
  } else {
    throw new DesignomeError(`Unknown command: ${command}`, {
      code: 'UNKNOWN_COMMAND',
    });
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const normalized =
    error instanceof DesignomeError
      ? error
      : new DesignomeError(error.message, { code: 'UNEXPECTED_ERROR' });
  process.stderr.write(
    `${JSON.stringify(
      {
        error: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = normalized.exitCode;
});
