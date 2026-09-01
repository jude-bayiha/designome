import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assertValidDesignDna } from './design-dna.mjs';
import {
  pathExists,
  pluginRoot,
  readJson,
  readTextIfExists,
  resolveProjectPath,
  sha256,
  sha256File,
} from './files.mjs';
import { inspectManagedBlock } from './markers.mjs';

export const runtimeContractVersion = '1.0.0';

function check(id, status, message, details = {}) {
  return { id, status, message, details };
}

function failure(code, message, details) {
  return { code, message, details };
}

async function resolveTarget(projectPath) {
  const requestedPath = path.resolve(projectPath);
  const stat = await fs.stat(requestedPath).catch(() => null);
  if (!stat?.isDirectory()) {
    return {
      projectRoot: requestedPath,
      error: failure(
        'TARGET_PROJECT_MISSING',
        'Target project does not exist',
        {
          checkedPath: requestedPath,
          prerequisite: 'an existing directory',
          resolution:
            'Create the project directory or pass the intended project root.',
          writesPerformed: false,
        },
      ),
    };
  }
  const projectRoot = await fs.realpath(requestedPath);
  const broadPaths = new Set([
    path.parse(projectRoot).root,
    path.resolve(os.homedir()),
    path.resolve(os.tmpdir()),
  ]);
  if (broadPaths.has(projectRoot)) {
    return {
      projectRoot,
      error: failure(
        'UNSAFE_TARGET_PROJECT',
        'Target path is dangerous or too broad',
        {
          checkedPath: projectRoot,
          prerequisite: 'a bounded application project root',
          resolution:
            'Pass the exact directory that owns the application package.json.',
          writesPerformed: false,
        },
      ),
    };
  }
  return { projectRoot, error: null };
}

async function inspectSkillContracts() {
  const skillNames = [
    'designome-extract',
    'designome-install',
    'designome-audit',
  ];
  const contracts = [];
  for (const skillName of skillNames) {
    const contractPath = path.join(
      pluginRoot,
      'skills',
      skillName,
      'contract.json',
    );
    const contract = await readJson(contractPath).catch(() => null);
    contracts.push({
      skill: skillName,
      contractPath,
      contractVersion: contract?.runtimeContractVersion ?? null,
      compatible: contract?.runtimeContractVersion === runtimeContractVersion,
    });
  }
  return contracts;
}

async function inspectManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, '.designome', 'manifest.json');
  if (!(await pathExists(manifestPath))) {
    return { present: false, readable: true, coherent: true, conflicts: [] };
  }
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    return {
      present: true,
      readable: false,
      coherent: false,
      conflicts: [
        {
          path: '.designome/manifest.json',
          nature: 'unreadable-manifest',
          message: error.message,
        },
      ],
    };
  }
  const conflicts = [];
  if (!['0.1.0', '0.2.0', '0.3.0'].includes(manifest.schemaVersion)) {
    conflicts.push({
      path: '.designome/manifest.json',
      nature: 'unsupported-manifest-version',
      recordedChecksum: null,
      observedChecksum: null,
      expectedOwner: 'designome',
      refusedOperations: ['overwrite', 'delete'],
      safeResolutions: [
        'Use the Designome runtime version that owns this manifest.',
        'Perform an explicit versioned manifest migration.',
      ],
    });
  }
  for (const artifact of manifest.managedArtifacts ?? []) {
    let absolutePath;
    try {
      absolutePath = resolveProjectPath(
        projectRoot,
        artifact.path,
        'manifest artifact path',
      );
    } catch (error) {
      conflicts.push({
        path: artifact.path,
        expectedOwner: 'designome',
        recordedChecksum: artifact.sha256 ?? null,
        observedChecksum: null,
        nature: 'unsafe-managed-artifact-path',
        refusedOperations: ['read', 'overwrite', 'delete'],
        safeResolutions: [
          'Restore a manifest whose artifact paths stay inside the project.',
        ],
      });
      continue;
    }
    if (!(await pathExists(absolutePath))) {
      conflicts.push({
        path: artifact.path,
        expectedOwner: 'designome',
        recordedChecksum: artifact.sha256 ?? null,
        observedChecksum: null,
        nature: 'managed-artifact-missing',
        refusedOperations: ['overwrite', 'delete'],
        safeResolutions: [
          'Restore the manifest-owned artifact from version control.',
          'Remove Designome through a separately reviewed ownership migration.',
        ],
      });
      continue;
    }
    if (artifact.kind === 'block') {
      const content = await readTextIfExists(absolutePath);
      const inspection = inspectManagedBlock(
        content ?? '',
        artifact.startMarker,
        artifact.endMarker,
      );
      const observedChecksum = inspection.block
        ? sha256(inspection.block)
        : null;
      if (
        inspection.startCount !== 1 ||
        inspection.endCount !== 1 ||
        observedChecksum !== artifact.sha256
      ) {
        conflicts.push({
          path: artifact.path,
          expectedOwner: 'designome',
          recordedChecksum: artifact.sha256 ?? null,
          observedChecksum,
          nature: 'managed-block-modified',
          refusedOperations: ['overwrite'],
          safeResolutions: [
            'Restore the exact manifest-owned marker block.',
            'Review an explicit ownership migration.',
          ],
        });
      }
      continue;
    }
    if (artifact.kind !== 'file') continue;
    const observedChecksum = await sha256File(absolutePath);
    if (observedChecksum !== artifact.sha256) {
      conflicts.push({
        path: artifact.path,
        expectedOwner: 'designome',
        recordedChecksum: artifact.sha256 ?? null,
        observedChecksum,
        nature: 'managed-artifact-modified',
        refusedOperations: ['overwrite', 'delete'],
        safeResolutions: [
          'Move intentional changes to a user-owned override file, then restore the managed artifact.',
          'Review and explicitly migrate ownership before reinstalling.',
        ],
      });
    }
  }
  return {
    present: true,
    readable: true,
    coherent: conflicts.length === 0,
    schemaVersion: manifest.schemaVersion ?? null,
    conflicts,
  };
}

async function inspectAuditReadiness(projectRoot, packageJson) {
  const configPath = path.join(projectRoot, '.designome', 'audit.config.json');
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const providers = {
    'in-app-browser': {
      available: true,
      executionOwner: 'host-agent',
    },
    'existing-playwright': {
      available: Boolean(
        dependencies['@playwright/test'] || dependencies.playwright,
      ),
      executionOwner: 'target-project',
    },
    static: { available: true, executionOwner: 'designome' },
  };
  if (!(await pathExists(configPath))) {
    return { configured: false, readable: true, providers };
  }
  try {
    const config = await readJson(configPath);
    return {
      configured: true,
      readable: true,
      schemaVersion: config.schemaVersion ?? null,
      routeCount: Array.isArray(config.routes) ? config.routes.length : 0,
      providers,
    };
  } catch (error) {
    return {
      configured: true,
      readable: false,
      error: error.message,
      providers,
    };
  }
}

export async function doctorProject({
  projectPath,
  dnaPath = null,
  requireDna = true,
} = {}) {
  const inspectedAt = new Date().toISOString();
  const checks = [];
  const errors = [];
  const target = await resolveTarget(projectPath);
  if (target.error) {
    errors.push(target.error);
    checks.push(
      check('target', 'failed', target.error.message, target.error.details),
    );
    return {
      schemaVersion: '1.0.0',
      inspectedAt,
      readOnly: true,
      writesPerformed: false,
      projectRoot: target.projectRoot,
      status: 'failed',
      checks,
      errors,
    };
  }
  const { projectRoot } = target;
  checks.push(
    check('target', 'passed', 'Target directory exists and is bounded', {
      checkedPath: projectRoot,
    }),
  );

  const packagePath = path.join(projectRoot, 'package.json');
  let packageJson = null;
  if (!(await pathExists(packagePath))) {
    const error = failure(
      'PROJECT_PACKAGE_JSON_MISSING',
      'Target project is missing package.json',
      {
        checkedPath: packagePath,
        prerequisite:
          'Designome installation and audit require a JavaScript package root with package.json.',
        resolution:
          'Pass the application package root or create the project package.json before retrying.',
        writesPerformed: false,
      },
    );
    errors.push(error);
    checks.push(check('package-json', 'failed', error.message, error.details));
  } else {
    try {
      packageJson = await readJson(packagePath);
      checks.push(
        check('package-json', 'passed', 'package.json is readable', {
          checkedPath: packagePath,
        }),
      );
    } catch (error) {
      const item = failure(
        'PROJECT_PACKAGE_JSON_INVALID',
        'Target package.json is not valid JSON',
        {
          checkedPath: packagePath,
          reason: error.message,
          resolution: 'Repair package.json before running Designome.',
          writesPerformed: false,
        },
      );
      errors.push(item);
      checks.push(check('package-json', 'failed', item.message, item.details));
    }
  }

  const skillContracts = await inspectSkillContracts();
  const incompatibleSkills = skillContracts.filter((item) => !item.compatible);
  checks.push(
    check(
      'runtime-skills',
      incompatibleSkills.length === 0 ? 'passed' : 'failed',
      incompatibleSkills.length === 0
        ? 'Runtime and skill contracts are compatible'
        : 'One or more skill contracts are incompatible with this runtime',
      { runtimeContractVersion, skills: skillContracts },
    ),
  );
  if (incompatibleSkills.length > 0) {
    errors.push(
      failure(
        'SKILL_RUNTIME_INCOMPATIBLE',
        'Skill and runtime contract versions do not match',
        {
          runtimeContractVersion,
          incompatibleSkills,
          resolution: 'Install a matching Designome plugin/runtime release.',
          writesPerformed: false,
        },
      ),
    );
  }

  const resolvedDnaPath = dnaPath
    ? path.resolve(dnaPath)
    : path.join(projectRoot, '.designome', 'design-dna.json');
  if (requireDna) {
    if (!(await pathExists(resolvedDnaPath))) {
      const error = failure('DESIGN_DNA_MISSING', 'Design DNA is unavailable', {
        checkedPath: resolvedDnaPath,
        prerequisite: 'a readable, accepted Design DNA',
        resolution:
          'Complete extraction and human acceptance, or pass --dna to doctor.',
        writesPerformed: false,
      });
      errors.push(error);
      checks.push(check('design-dna', 'failed', error.message, error.details));
    } else {
      try {
        const dna = await readJson(resolvedDnaPath);
        await assertValidDesignDna(dna, { requireAccepted: true });
        checks.push(
          check('design-dna', 'passed', 'Design DNA is valid and accepted', {
            checkedPath: resolvedDnaPath,
            documentId: dna.documentId,
            revision: dna.revision.number,
          }),
        );
      } catch (error) {
        const code =
          error.code === 'INVALID_DESIGN_DNA'
            ? 'DESIGN_DNA_NOT_ACCEPTED_OR_INVALID'
            : 'DESIGN_DNA_UNREADABLE';
        const item = failure(
          code,
          'Design DNA cannot be used for installation',
          {
            checkedPath: resolvedDnaPath,
            reason: error.details ?? error.message,
            resolution:
              'Validate the draft, resolve errors, and record human acceptance before installation.',
            writesPerformed: false,
          },
        );
        errors.push(item);
        checks.push(check('design-dna', 'failed', item.message, item.details));
      }
    }
  } else {
    checks.push(
      check(
        'design-dna',
        'not-requested',
        'Design DNA is not required for this pre-extraction diagnostic',
        {
          checkedPath: resolvedDnaPath,
        },
      ),
    );
  }

  const manifest = await inspectManifest(projectRoot);
  checks.push(
    check(
      'manifest',
      manifest.coherent ? 'passed' : 'failed',
      manifest.present
        ? manifest.coherent
          ? 'Manifest and managed checksums are coherent'
          : 'Manifest or managed artifacts are inconsistent'
        : 'No previous Designome installation is present',
      manifest,
    ),
  );
  if (!manifest.coherent) {
    errors.push(
      failure(
        'MANAGED_ARTIFACT_CONFLICT',
        'Managed installation contains conflicts',
        {
          conflicts: manifest.conflicts,
          writesPerformed: false,
        },
      ),
    );
  }

  const transactionPath = path.join(
    projectRoot,
    '.designome',
    'install-transaction.json',
  );
  const interruptedTransaction = await pathExists(transactionPath);
  checks.push(
    check(
      'transaction',
      interruptedTransaction ? 'failed' : 'passed',
      interruptedTransaction
        ? 'An interrupted installation transaction requires recovery'
        : 'No interrupted installation transaction is present',
      { checkedPath: transactionPath },
    ),
  );
  if (interruptedTransaction) {
    errors.push(
      failure(
        'INSTALLATION_RECOVERY_REQUIRED',
        'Interrupted installation transaction detected',
        {
          checkedPath: transactionPath,
          resolution:
            'Run designome install again or resume the orchestrated run to perform checksum-safe rollback and retry.',
          writesPerformed: false,
        },
      ),
    );
  }

  const audit = await inspectAuditReadiness(projectRoot, packageJson);
  checks.push(
    check(
      'audit-providers',
      audit.readable ? 'passed' : 'failed',
      audit.readable
        ? 'Configured audit providers can be resolved without installing dependencies'
        : 'Audit configuration is unreadable',
      audit,
    ),
  );
  if (!audit.readable) {
    errors.push(
      failure('AUDIT_CONFIG_UNREADABLE', 'Audit configuration is unreadable', {
        checkedPath: path.join(projectRoot, '.designome', 'audit.config.json'),
        reason: audit.error,
        writesPerformed: false,
      }),
    );
  }

  return {
    schemaVersion: '1.0.0',
    inspectedAt,
    readOnly: true,
    writesPerformed: false,
    projectRoot,
    status: errors.length === 0 ? 'passed' : 'failed',
    checks,
    errors,
  };
}
