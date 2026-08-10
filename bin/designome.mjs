#!/usr/bin/env node

import path from 'node:path';

import { assertValidDesignDna } from '../src/runtime/design-dna.mjs';
import { DesignomeError } from '../src/runtime/errors.mjs';
import { readJson } from '../src/runtime/files.mjs';
import {
  installDesignDna,
  verifyInstallation,
} from '../src/runtime/install.mjs';
import { initializeRun } from '../src/runtime/run.mjs';

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
      ['dry-run', 'instructions-reviewed', 'require-accepted', 'help'].includes(
        name,
      )
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
    `  init-run --output <dir> --image <file> [--image <file>] [--motion <mode>] [--project <dir>]\n`,
  );
  process.stdout.write(
    `  validate-dna --file <design-dna.json> [--require-accepted]\n`,
  );
  process.stdout.write(
    `  install --dna <file> --project <dir> [--css-entry <file>] [--scope <selector>] --dry-run\n`,
  );
  process.stdout.write(
    `  install --dna <file> --project <dir> [options] --instructions-reviewed\n`,
  );
  process.stdout.write(`  verify-install --project <dir>\n`);
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
  if (command === 'init-run') {
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
      'dry-run',
      'instructions-reviewed',
      'help',
    ]);
    result = await installDesignDna({
      dnaPath: option(parsed, 'dna', { required: true }),
      projectPath: option(parsed, 'project', { required: true }),
      cssEntry: option(parsed, 'css-entry', { fallback: null }),
      scope: option(parsed, 'scope', { fallback: ':root' }),
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
