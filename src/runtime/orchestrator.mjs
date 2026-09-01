import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { runAudit } from './audit.mjs';
import { assertValidDesignDna } from './design-dna.mjs';
import { doctorProject } from './doctor.mjs';
import { DesignomeError } from './errors.mjs';
import {
  atomicWrite,
  jsonText,
  pathExists,
  readJson,
  relativeInside,
  toPosixPath,
} from './files.mjs';
import {
  installDesignDna,
  recoverInterruptedInstallation,
} from './install.mjs';
import { initializeRun } from './run.mjs';

const workflowSteps = [
  ['doctor', 'designome-runtime'],
  ['initialize-run', 'designome-runtime'],
  ['extract-design-dna', 'host-agent'],
  ['accept-design-dna', 'human'],
  ['install-design-dna', 'designome-runtime'],
  ['implement-interface', 'host-agent'],
  ['capture-browser-evidence', 'host-agent'],
  ['evaluate-audit', 'designome-runtime'],
  ['finalize', 'designome-runtime'],
];

function now() {
  return new Date().toISOString();
}

function stepState([id, owner]) {
  return {
    id,
    owner,
    status: 'pending',
    attempts: 0,
    startedAt: null,
    completedAt: null,
    artifacts: [],
    error: null,
  };
}

function activePointerPath(workspacePath) {
  return path.join(
    path.resolve(workspacePath),
    '.designome',
    'active-run.json',
  );
}

function statePath(runDirectory) {
  return path.join(runDirectory, 'workflow-state.json');
}

async function persistState(state) {
  state.updatedAt = now();
  state.revision += 1;
  await atomicWrite(statePath(state.runDirectory), jsonText(state));
  await atomicWrite(
    activePointerPath(state.workspacePath),
    jsonText({
      schemaVersion: '1.0.0',
      owner: 'designome',
      workflowId: state.workflowId,
      statePath: statePath(state.runDirectory),
      status: state.status,
      revision: state.revision,
      updatedAt: state.updatedAt,
    }),
  );
}

function getStep(state, id) {
  const step = state.steps.find((candidate) => candidate.id === id);
  if (!step) {
    throw new DesignomeError(`Workflow step is missing: ${id}`, {
      code: 'INVALID_WORKFLOW_STATE',
    });
  }
  return step;
}

function startStep(state, id) {
  const step = getStep(state, id);
  if (step.status === 'completed') return step;
  step.status = 'in-progress';
  step.attempts += 1;
  step.startedAt = now();
  step.error = null;
  state.status = 'running';
  state.currentStep = id;
  state.handoff = null;
  return step;
}

function completeStep(state, id, artifacts = []) {
  const step = getStep(state, id);
  step.status = 'completed';
  step.completedAt = now();
  step.artifacts = [...new Set([...step.artifacts, ...artifacts])];
  step.error = null;
}

function awaitStep(state, id, handoff) {
  const step = getStep(state, id);
  if (step.status === 'pending') {
    step.attempts += 1;
    step.startedAt = now();
  }
  step.status = 'awaiting';
  state.status = handoff.owner === 'human' ? 'awaiting-human' : 'awaiting-host';
  state.currentStep = id;
  state.handoff = {
    schemaVersion: '1.0.0',
    createdAt: now(),
    ...handoff,
  };
}

function failStep(state, id, error) {
  const step = getStep(state, id);
  step.status = 'failed';
  step.error = {
    code: error.code ?? 'UNEXPECTED_ERROR',
    message: error.message,
    details: error.details ?? [],
    failedAt: now(),
  };
  state.status = 'failed';
  state.currentStep = id;
  state.handoff = null;
}

function dnaSummary(dna) {
  const epistemicCounts = { observed: 0, inferred: 0, proposed: 0, unknown: 0 };
  for (const item of [...dna.tokens, ...dna.rules, ...dna.componentPatterns]) {
    const status = item.claim?.epistemicStatus;
    if (status in epistemicCounts) epistemicCounts[status] += 1;
  }
  return {
    documentId: dna.documentId,
    revision: dna.revision.number,
    name: dna.name,
    status: dna.status,
    sourceCount: dna.sources.length,
    evidenceRegionCount: dna.evidence.length,
    tokenCount: dna.tokens.length,
    ruleCount: dna.rules.length,
    componentPatternCount: dna.componentPatterns.length,
    unknownCount: dna.unknowns.length,
    epistemicCounts,
  };
}

function publicResult(state, extra = {}) {
  return {
    status: state.status,
    workflowId: state.workflowId,
    revision: state.revision,
    currentStep: state.currentStep,
    runDirectory: state.runDirectory,
    projectPath: state.projectPath,
    handoff: state.handoff,
    steps: state.steps.map(
      ({ id, owner, status, attempts, artifacts, error }) => ({
        id,
        owner,
        status,
        attempts,
        artifacts,
        error,
      }),
    ),
    ...extra,
  };
}

function assertDoctorPassed(result) {
  if (result.status === 'passed') return;
  const primary = result.errors[0];
  throw new DesignomeError(primary.message, {
    code: primary.code,
    details: primary.details,
  });
}

export async function initializeWorkflow({
  sourcePaths,
  projectPath,
  workspacePath = process.cwd(),
  motionMode = 'off',
  provider = 'in-app-browser',
  cssEntry = null,
  requestContractPath = null,
} = {}) {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) {
    throw new DesignomeError('designome run requires at least one --source', {
      code: 'MISSING_SCREENSHOT',
    });
  }
  if (!projectPath) {
    throw new DesignomeError('designome run requires --project', {
      code: 'INVALID_ARGUMENTS',
    });
  }
  const resolvedWorkspace = path.resolve(workspacePath);
  const resolvedProject = path.resolve(projectPath);
  const diagnostic = await doctorProject({
    projectPath: resolvedProject,
    requireDna: false,
  });
  assertDoctorPassed(diagnostic);

  const workflowId = `workflow-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/gu, '')
    .slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const runDirectory = path.join(
    resolvedWorkspace,
    '.designome',
    'runs',
    workflowId,
  );
  const initialized = await initializeRun({
    imagePaths: sourcePaths,
    motionMode,
    outputDirectory: runDirectory,
    targetProjectPath: resolvedProject,
    requestContractPath,
  });
  const createdAt = now();
  const state = {
    schemaVersion: '1.0.0',
    workflowId,
    revision: 0,
    owner: 'designome',
    createdAt,
    updatedAt: createdAt,
    status: 'running',
    currentStep: 'doctor',
    workspacePath: resolvedWorkspace,
    runDirectory,
    projectPath: resolvedProject,
    sourcePaths: sourcePaths.map((sourcePath) => path.resolve(sourcePath)),
    requestContractPath: requestContractPath
      ? path.join(runDirectory, 'request-contract.json')
      : null,
    dnaPath: path.join(runDirectory, 'design-dna.json'),
    auditOutputDirectory: toPosixPath(
      path.join('.designome', 'runs', workflowId, 'audit'),
    ),
    provider,
    cssEntry,
    humanAcceptance: null,
    hostEvents: [],
    steps: workflowSteps.map(stepState),
    handoff: null,
    finalResult: null,
  };
  completeStep(state, 'doctor', []);
  const initializationArtifacts = [
    path.join(runDirectory, 'source-manifest.json'),
    path.join(runDirectory, 'run-context.json'),
    path.join(runDirectory, 'run-plan.json'),
  ];
  if (requestContractPath) {
    initializationArtifacts.push(
      path.join(runDirectory, 'request-contract.json'),
    );
  }
  completeStep(state, 'initialize-run', initializationArtifacts);
  awaitStep(state, 'extract-design-dna', {
    owner: 'host-agent',
    type: 'extract-design-dna',
    skill: 'designome-extract',
    responsibility:
      'Apply the validated request contract, inspect the source screenshots with the host multimodal model, write the compatibility report, and write a draft Design DNA. The deterministic runtime does not perform visual reasoning.',
    expectedArtifact: state.dnaPath,
    resumeCommand: 'designome run --resume',
  });
  await persistState(state);
  return publicResult(state, { initialization: initialized, diagnostic });
}

async function loadWorkflow(workspacePath) {
  const resolvedWorkspace = path.resolve(workspacePath);
  const pointerPath = activePointerPath(resolvedWorkspace);
  const pointer = await readJson(pointerPath).catch((error) => {
    throw new DesignomeError('No resumable Designome workflow was found', {
      code: 'WORKFLOW_NOT_FOUND',
      details: { checkedPath: pointerPath, reason: error.message },
    });
  });
  if (
    pointer.schemaVersion !== '1.0.0' ||
    pointer.owner !== 'designome' ||
    typeof pointer.statePath !== 'string'
  ) {
    throw new DesignomeError('Designome active-run pointer is incompatible', {
      code: 'INCOMPATIBLE_WORKFLOW_STATE_VERSION',
      details: { checkedPath: pointerPath },
    });
  }
  const resolvedStatePath = path.resolve(pointer.statePath);
  try {
    relativeInside(resolvedWorkspace, resolvedStatePath, 'workflow state path');
  } catch (error) {
    throw new DesignomeError(
      'Designome active-run pointer escapes the workspace',
      {
        code: 'UNSAFE_WORKFLOW_STATE_PATH',
        details: { statePath: pointer.statePath, reason: error.message },
      },
    );
  }
  const state = await readJson(resolvedStatePath).catch((error) => {
    throw new DesignomeError('Designome workflow state is unreadable', {
      code: 'WORKFLOW_STATE_UNREADABLE',
      details: { checkedPath: resolvedStatePath, reason: error.message },
    });
  });
  if (state.schemaVersion !== '1.0.0') {
    throw new DesignomeError(
      'Designome workflow state version is incompatible',
      {
        code: 'INCOMPATIBLE_WORKFLOW_STATE_VERSION',
        details: { received: state.schemaVersion ?? null, supported: '1.0.0' },
      },
    );
  }
  if (path.resolve(state.workspacePath) !== resolvedWorkspace) {
    throw new DesignomeError(
      'Workflow workspace does not match the active pointer',
      {
        code: 'INVALID_WORKFLOW_STATE',
        details: {
          expectedWorkspace: resolvedWorkspace,
          stateWorkspace: state.workspacePath,
        },
      },
    );
  }
  return state;
}

function recordHostEvent(state, event) {
  state.hostEvents.push({ event, receivedAt: now() });
}

async function acceptDna(state, dna) {
  if (dna.status !== 'draft' && dna.status !== 'accepted') {
    throw new DesignomeError('Only a draft Design DNA can be accepted', {
      code: 'DESIGN_DNA_ACCEPTANCE_INVALID',
      details: { status: dna.status },
    });
  }
  const acceptedAt = now();
  const accepted = {
    ...dna,
    status: 'accepted',
    extensions: {
      ...(dna.extensions ?? {}),
      designomeAcceptance: {
        acceptedAt,
        actor: 'human',
        workflowId: state.workflowId,
      },
    },
  };
  await assertValidDesignDna(accepted, { requireAccepted: true });
  await atomicWrite(state.dnaPath, jsonText(accepted));
  state.humanAcceptance = {
    acceptedAt,
    documentId: accepted.documentId,
    revision: accepted.revision.number,
    summary: dnaSummary(accepted),
  };
  return accepted;
}

export async function resumeWorkflow({
  workspacePath = process.cwd(),
  acceptDesignDna = false,
  hostEvent = null,
  evidencePath = null,
  failureInjection = null,
} = {}) {
  const state = await loadWorkflow(workspacePath);
  if (state.status === 'completed')
    return publicResult(state, { finalResult: state.finalResult });
  if (hostEvent) recordHostEvent(state, hostEvent);

  let activeStep = state.currentStep;
  try {
    const extraction = getStep(state, 'extract-design-dna');
    if (extraction.status !== 'completed') {
      if (!(await pathExists(state.dnaPath))) {
        awaitStep(state, 'extract-design-dna', {
          owner: 'host-agent',
          type: 'extract-design-dna',
          skill: 'designome-extract',
          expectedArtifact: state.dnaPath,
          responsibility:
            'Write the draft Design DNA using host-agent visual reasoning, then resume.',
          resumeCommand: 'designome run --resume',
        });
        await persistState(state);
        return publicResult(state);
      }
      activeStep = 'extract-design-dna';
      startStep(state, activeStep);
      const dna = await readJson(state.dnaPath);
      await assertValidDesignDna(dna);
      completeStep(state, activeStep, [state.dnaPath]);
      awaitStep(state, 'accept-design-dna', {
        owner: 'human',
        type: 'accept-design-dna',
        responsibility:
          'Review the evidence, confidence, exceptions, limitations, unknowns, and proposed claims. This is the only mandatory human acceptance in the normal workflow.',
        summary: dnaSummary(dna),
        acceptCommand: 'designome run --resume --accept-dna',
      });
      await persistState(state);
      if (!acceptDesignDna)
        return publicResult(state, { dnaSummary: dnaSummary(dna) });
    }

    let dna = await readJson(state.dnaPath);
    const acceptance = getStep(state, 'accept-design-dna');
    if (acceptance.status !== 'completed') {
      if (!acceptDesignDna) {
        awaitStep(state, 'accept-design-dna', {
          owner: 'human',
          type: 'accept-design-dna',
          responsibility: 'Review and accept the draft Design DNA.',
          summary: dnaSummary(dna),
          acceptCommand: 'designome run --resume --accept-dna',
        });
        await persistState(state);
        return publicResult(state, { dnaSummary: dnaSummary(dna) });
      }
      activeStep = 'accept-design-dna';
      startStep(state, activeStep);
      dna = await acceptDna(state, dna);
      completeStep(state, activeStep, [state.dnaPath]);
      await persistState(state);
    }

    const installation = getStep(state, 'install-design-dna');
    if (installation.status !== 'completed') {
      activeStep = 'install-design-dna';
      startStep(state, activeStep);
      const interruptedRecovery = await recoverInterruptedInstallation({
        projectPath: state.projectPath,
      });
      const diagnostic = await doctorProject({
        projectPath: state.projectPath,
        dnaPath: state.dnaPath,
        requireDna: true,
      });
      assertDoctorPassed(diagnostic);
      const installed = await installDesignDna({
        dnaPath: state.dnaPath,
        projectPath: state.projectPath,
        cssEntry: state.cssEntry,
        instructionsReviewed: true,
        failureInjection,
      });
      installed.orchestratorRecovery = interruptedRecovery;
      if (installed.status === 'conflict') {
        throw new DesignomeError(
          'Installation conflicts require a safe resolution',
          {
            code: 'INSTALLATION_CONFLICT',
            details: installed.actions.filter(
              (action) => action.action === 'conflict',
            ),
            exitCode: 2,
          },
        );
      }
      completeStep(state, activeStep, [
        path.join(state.projectPath, '.designome', 'manifest.json'),
      ]);
      awaitStep(state, 'implement-interface', {
        owner: 'host-agent',
        type: 'implement-interface',
        skill: null,
        responsibility:
          'Generate or modify the interface in the target project using the accepted installed Design DNA. The runtime does not generate UI code.',
        completionEvent:
          'designome run --resume --host-event implementation-complete',
      });
      await persistState(state);
      return publicResult(state, { installation: installed });
    }

    const implementation = getStep(state, 'implement-interface');
    if (implementation.status !== 'completed') {
      if (hostEvent !== 'implementation-complete') {
        awaitStep(state, 'implement-interface', {
          owner: 'host-agent',
          type: 'implement-interface',
          responsibility:
            'Complete and validate the target UI without changing the accepted Design DNA.',
          completionEvent:
            'designome run --resume --host-event implementation-complete',
        });
        await persistState(state);
        return publicResult(state);
      }
      activeStep = 'implement-interface';
      startStep(state, activeStep);
      completeStep(state, activeStep);
    }

    const capture = getStep(state, 'capture-browser-evidence');
    const auditOutputAbsolute = path.join(
      state.projectPath,
      state.auditOutputDirectory,
    );
    const externalEvidencePath = evidencePath
      ? path.resolve(evidencePath)
      : path.join(auditOutputAbsolute, 'external-evidence.json');
    if (capture.status !== 'completed' && hostEvent !== 'evidence-complete') {
      const initializedAudit = await runAudit({
        projectPath: state.projectPath,
        outputDirectory: state.auditOutputDirectory,
        provider: state.provider,
        overwrite: true,
      });
      awaitStep(state, 'capture-browser-evidence', {
        owner: 'host-agent',
        type: 'capture-browser-evidence',
        adapter: {
          packageExport: 'designome/audit',
          factory: 'createCaptureSession',
          planPath: path.join(auditOutputAbsolute, 'plan.json'),
          outputPath: externalEvidencePath,
        },
        responsibility:
          'Control the real browser, record observations through the Designome adapter, and include host-agent perceptual observations. Do not assemble audit-evidence.json manually.',
        completionEvent:
          'designome run --resume --host-event evidence-complete --evidence <adapter-output>',
      });
      await persistState(state);
      return publicResult(state, { audit: initializedAudit });
    }
    if (capture.status !== 'completed') {
      activeStep = 'capture-browser-evidence';
      startStep(state, activeStep);
      if (!(await pathExists(externalEvidencePath))) {
        throw new DesignomeError('Host browser evidence is missing', {
          code: 'AUDIT_EVIDENCE_UNREADABLE',
          details: { checkedPath: externalEvidencePath },
        });
      }
      completeStep(state, activeStep, [externalEvidencePath]);
    }

    const auditStep = getStep(state, 'evaluate-audit');
    if (auditStep.status !== 'completed') {
      activeStep = 'evaluate-audit';
      startStep(state, activeStep);
      const relativeEvidence = toPosixPath(
        path.relative(state.projectPath, externalEvidencePath),
      );
      const audit = await runAudit({
        projectPath: state.projectPath,
        outputDirectory: state.auditOutputDirectory,
        evidencePath: relativeEvidence,
        provider: state.provider,
        overwrite: true,
      });
      completeStep(state, activeStep, [
        path.join(auditOutputAbsolute, 'report.json'),
        path.join(auditOutputAbsolute, 'report.md'),
        path.join(auditOutputAbsolute, 'findings.json'),
      ]);
      activeStep = 'finalize';
      startStep(state, activeStep);
      state.finalResult = {
        status: audit.overallStatus,
        providerStatus: audit.status,
        layers: audit.layers,
        findingCount: audit.findingCount,
        calibrationCandidateCount: audit.calibrationCandidateCount,
        auditOutputDirectory: audit.outputDirectory,
        hostInterventionStillRequired:
          Object.values(audit.layers).includes('incomplete') ||
          Object.values(audit.layers).includes('unavailable'),
      };
      completeStep(state, activeStep, [
        path.join(auditOutputAbsolute, 'report.json'),
      ]);
      state.status = 'completed';
      state.currentStep = 'finalize';
      state.handoff = null;
      await persistState(state);
      return publicResult(state, { finalResult: state.finalResult });
    }
    return publicResult(state, { finalResult: state.finalResult });
  } catch (error) {
    const normalized =
      error instanceof DesignomeError
        ? error
        : new DesignomeError(error.message, { code: 'UNEXPECTED_ERROR' });
    if (
      new Set([
        'MANAGED_ARTIFACT_CONFLICT',
        'INSTALLATION_CONFLICT',
        'INSTALLATION_PLAN_STALE',
        'CSS_ENTRY_AMBIGUOUS',
        'EXISTING_RULE_PATH_MISSING',
      ]).has(normalized.code)
    ) {
      const step = getStep(state, activeStep);
      step.error = {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        failedAt: now(),
      };
      awaitStep(state, activeStep, {
        owner: 'human',
        type: 'resolve-installation-decision',
        responsibility:
          'Resolve the destructive-write risk, ownership conflict, or integration decision using the safe options in the diagnostic. Designome will not overwrite or choose a product policy automatically.',
        error: step.error,
        resumeCommand: 'designome run --resume',
      });
      await persistState(state);
      return publicResult(state);
    }
    failStep(state, activeStep, normalized);
    await persistState(state);
    throw normalized;
  }
}
