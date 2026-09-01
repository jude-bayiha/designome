import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { DesignomeError } from './errors.mjs';
import { inspectImage } from './images.mjs';
import {
  jsonText,
  pathExists,
  pluginRoot,
  readJson,
  sha256,
  writeJsonIfChanged,
} from './files.mjs';
import { loadConceptMatrix } from './design-dna.mjs';
import { loadRequestContract } from './request-contract.mjs';

const motionModes = new Set(['off', 'observed-only', 'auto']);

export async function initializeRun({
  imagePaths,
  motionMode = 'off',
  outputDirectory,
  targetProjectPath = null,
  requestContractPath = null,
}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new DesignomeError('At least one --image is required', {
      code: 'MISSING_SCREENSHOT',
    });
  }
  if (!motionModes.has(motionMode)) {
    throw new DesignomeError(
      'Motion mode must be off, observed-only, or auto',
      {
        code: 'INVALID_MOTION_MODE',
      },
    );
  }

  const resolvedOutput = path.resolve(outputDirectory);
  const resolvedTarget = targetProjectPath
    ? path.resolve(targetProjectPath)
    : null;
  if (
    resolvedOutput === path.parse(resolvedOutput).root ||
    resolvedOutput === path.resolve(os.homedir())
  ) {
    throw new DesignomeError(
      'Refusing to use a broad directory as a run output',
      {
        code: 'UNSAFE_RUN_OUTPUT',
      },
    );
  }
  if (await pathExists(resolvedOutput)) {
    const outputStat = await fs.stat(resolvedOutput);
    if (!outputStat.isDirectory()) {
      throw new DesignomeError('Run output must be a directory', {
        code: 'INVALID_RUN_OUTPUT',
      });
    }
    const contextExists = await pathExists(
      path.join(resolvedOutput, 'run-context.json'),
    );
    const entries = await fs.readdir(resolvedOutput);
    if (!contextExists && entries.length > 0) {
      throw new DesignomeError(
        'Existing run output is not empty and has no Designome run context',
        { code: 'RUN_OUTPUT_NOT_EMPTY' },
      );
    }
  }
  if (resolvedTarget) {
    const targetStat = await fs.stat(resolvedTarget).catch(() => null);
    if (!targetStat?.isDirectory()) {
      throw new DesignomeError(
        `Target project does not exist: ${resolvedTarget}`,
        { code: 'TARGET_PROJECT_MISSING' },
      );
    }
  }

  const request = requestContractPath
    ? await loadRequestContract(requestContractPath, {
        expectedOperation: 'extract',
        requireExecutable: true,
      })
    : null;
  if (request) {
    const contractSources = request.contract.parameters.sources
      .map((source) => path.resolve(source.path))
      .sort();
    const requestedSources = [
      ...new Set(imagePaths.map((item) => path.resolve(item))),
    ].sort();
    const mismatches = [];
    if (request.contract.parameters.motionMode !== motionMode) {
      mismatches.push('motionMode does not match the normalized request');
    }
    if (JSON.stringify(contractSources) !== JSON.stringify(requestedSources)) {
      mismatches.push('source paths do not match the normalized request');
    }
    if (mismatches.length > 0) {
      throw new DesignomeError('Run inputs do not match the request contract', {
        code: 'REQUEST_INPUT_MISMATCH',
        details: mismatches,
      });
    }
  }

  const sources = [];
  const seenHashes = new Set();
  for (const imagePath of imagePaths) {
    const source = await inspectImage(imagePath);
    if (seenHashes.has(source.contentHash)) continue;
    seenHashes.add(source.contentHash);
    sources.push(source);
  }

  const matrix = await loadConceptMatrix(pluginRoot);
  const packageJson = await readJson(path.join(pluginRoot, 'package.json'));
  const fingerprint = sha256(
    jsonText({
      sources: sources.map((source) => source.contentHash),
      motionMode,
      targetProjectPath: resolvedTarget,
      requestContract: request?.contract ?? null,
      matrixVersion: matrix.matrixVersion,
      toolVersion: packageJson.version,
    }),
  );

  const contextPath = path.join(resolvedOutput, 'run-context.json');
  let createdAt = new Date().toISOString();
  if (await pathExists(contextPath)) {
    const existing = await readJson(contextPath);
    if (existing.inputFingerprint !== fingerprint) {
      throw new DesignomeError(
        'Run directory already belongs to different inputs',
        {
          code: 'RUN_INPUT_CONFLICT',
          details: [resolvedOutput],
        },
      );
    }
    createdAt = existing.createdAt;
  }

  const runId = path.basename(resolvedOutput);
  const sourceManifest = {
    schemaVersion: '0.1.0',
    runId,
    createdAt,
    sources,
  };
  const runContext = {
    schemaVersion: '0.1.0',
    runId,
    createdAt,
    inputFingerprint: fingerprint,
    matrixVersion: matrix.matrixVersion,
    toolVersion: packageJson.version,
    motionMode,
    targetProjectPath: resolvedTarget,
    requestContractPath: request
      ? path.join(resolvedOutput, 'request-contract.json')
      : null,
  };
  const runPlan = {
    schemaVersion: '0.1.0',
    runId,
    createdAt,
    stages: matrix.promptStages.map((stage) => {
      let enabled = true;
      let reason = 'Required by the modular extraction workflow.';
      if (stage.kind === 'integration') {
        enabled = Boolean(resolvedTarget);
        reason = enabled
          ? 'A target project is available after explicit Design DNA acceptance.'
          : 'No target project was supplied; extraction remains available.';
      }
      if (stage.kind === 'audit') {
        enabled = false;
        reason = 'Audit requires generated implementation evidence.';
      }
      return {
        id: stage.id,
        order: stage.order,
        kind: stage.kind,
        promptFile: stage.file,
        enabled,
        status: enabled ? 'pending' : 'skipped',
        reason,
        produces: stage.produces,
      };
    }),
  };

  await fs.mkdir(path.join(resolvedOutput, 'stages'), { recursive: true });
  const actions = [];
  actions.push({
    path: path.join(resolvedOutput, 'source-manifest.json'),
    action: await writeJsonIfChanged(
      path.join(resolvedOutput, 'source-manifest.json'),
      sourceManifest,
    ),
  });
  if (request) {
    actions.push({
      path: path.join(resolvedOutput, 'request-contract.json'),
      action: await writeJsonIfChanged(
        path.join(resolvedOutput, 'request-contract.json'),
        request.contract,
      ),
    });
  }
  actions.push({
    path: contextPath,
    action: await writeJsonIfChanged(contextPath, runContext),
  });
  actions.push({
    path: path.join(resolvedOutput, 'run-plan.json'),
    action: await writeJsonIfChanged(
      path.join(resolvedOutput, 'run-plan.json'),
      runPlan,
    ),
  });

  return {
    status: 'ready',
    runId,
    outputDirectory: resolvedOutput,
    sourceCount: sources.length,
    duplicateSourceCount: imagePaths.length - sources.length,
    actions,
    nextStage: 'prompt.source-evidence',
  };
}
