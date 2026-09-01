import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function formatAjvErrors(prefix, errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    return `${prefix}${location}: ${error.message}`;
  });
}

export function collectMatrixReferenceErrors(matrix, rootDirectory) {
  const errors = [];
  const axisIds = new Set();
  const axisOrders = new Set();
  const conceptIds = new Set();
  const promptIds = new Set();
  const promptOrders = new Set();
  const documentationPaths = new Set();

  for (const axis of matrix.axes) {
    if (axisIds.has(axis.id)) errors.push(`duplicate axis id: ${axis.id}`);
    if (axisOrders.has(axis.order))
      errors.push(`duplicate axis order: ${axis.order}`);
    axisIds.add(axis.id);
    axisOrders.add(axis.order);
  }

  const expectedOrders = Array.from({ length: 8 }, (_, index) => index + 1);
  if (expectedOrders.some((order) => !axisOrders.has(order))) {
    errors.push('axis orders must contain every integer from 1 to 8');
  }

  for (const concept of matrix.concepts) {
    if (conceptIds.has(concept.id))
      errors.push(`duplicate concept id: ${concept.id}`);
    conceptIds.add(concept.id);
  }

  for (const entry of matrix.documentationProjection) {
    if (documentationPaths.has(entry.path)) {
      errors.push(`duplicate documentation path: ${entry.path}`);
    }
    documentationPaths.add(entry.path);
    for (const conceptRef of entry.conceptRefs) {
      if (!conceptIds.has(conceptRef)) {
        errors.push(`${entry.path} references missing concept ${conceptRef}`);
      }
    }
  }

  for (const requiredDirectory of [
    'foundations/',
    'components/',
    'behavior/',
    'governance/',
  ]) {
    if (
      ![...documentationPaths].some((item) =>
        item.startsWith(requiredDirectory),
      )
    ) {
      errors.push(`documentation projection must include ${requiredDirectory}`);
    }
  }

  for (const axis of matrix.axes) {
    for (const conceptRef of axis.conceptRefs) {
      if (!conceptIds.has(conceptRef)) {
        errors.push(`${axis.id} references missing concept ${conceptRef}`);
      }
    }

    const promptPath = path.join(rootDirectory, axis.promptRef);
    if (!fs.existsSync(promptPath))
      errors.push(`${axis.id} references missing prompt ${axis.promptRef}`);
  }

  for (const concept of matrix.concepts) {
    for (const axisRef of concept.axisRefs) {
      if (!axisIds.has(axisRef)) {
        errors.push(`${concept.id} references missing axis ${axisRef}`);
      }

      const axis = matrix.axes.find((candidate) => candidate.id === axisRef);
      if (axis && !axis.conceptRefs.includes(concept.id)) {
        errors.push(`${concept.id} is missing from ${axisRef}.conceptRefs`);
      }
    }
  }

  for (const prompt of matrix.promptStages) {
    if (promptIds.has(prompt.id))
      errors.push(`duplicate prompt id: ${prompt.id}`);
    if (promptOrders.has(prompt.order))
      errors.push(`duplicate prompt order: ${prompt.order}`);
    promptIds.add(prompt.id);
    promptOrders.add(prompt.order);

    const promptPath = path.join(rootDirectory, prompt.file);
    if (!fs.existsSync(promptPath))
      errors.push(`${prompt.id} references missing file ${prompt.file}`);
  }

  return errors;
}

function validatePromptShape(matrix, rootDirectory) {
  const errors = [];
  const requiredHeadings = [
    '## Inputs',
    '## Task',
    '## Output',
    '## Guardrails',
  ];

  for (const stage of matrix.promptStages) {
    const promptPath = path.join(rootDirectory, stage.file);
    if (!fs.existsSync(promptPath)) continue;
    const prompt = readText(promptPath);

    for (const heading of requiredHeadings) {
      if (!prompt.includes(heading))
        errors.push(`${stage.file} is missing heading ${heading}`);
    }
  }

  return errors;
}

function validateWorkflowYaml(rootDirectory) {
  const workflowDirectory = path.join(rootDirectory, '.github', 'workflows');
  if (!fs.existsSync(workflowDirectory)) return [];

  const errors = [];
  for (const filename of fs.readdirSync(workflowDirectory)) {
    if (!/\.ya?ml$/u.test(filename)) continue;
    const workflowPath = path.join(workflowDirectory, filename);
    try {
      parseYaml(readText(workflowPath));
    } catch (error) {
      errors.push(
        `${path.relative(rootDirectory, workflowPath)}: ${error.message}`,
      );
    }
  }
  return errors;
}

function validatePluginSurface(rootDirectory) {
  const errors = [];
  const manifestPath = path.join(rootDirectory, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) {
    return ['plugin manifest is missing: .codex-plugin/plugin.json'];
  }

  try {
    const manifest = readJson(manifestPath);
    if (manifest.name !== 'designome') {
      errors.push('plugin manifest name must be designome');
    }
    if (
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
        manifest.version,
      )
    ) {
      errors.push('plugin manifest version must use strict semver');
    }
    if (manifest.skills !== './skills/') {
      errors.push('plugin manifest skills path must be ./skills/');
    }
    if (
      !manifest.interface?.displayName ||
      !manifest.interface?.shortDescription
    ) {
      errors.push('plugin manifest interface metadata is incomplete');
    }
    const prompts = Array.isArray(manifest.interface?.defaultPrompt)
      ? manifest.interface.defaultPrompt
      : [manifest.interface?.defaultPrompt].filter(Boolean);
    if (prompts.length === 0 || prompts.length > 3) {
      errors.push(
        'plugin manifest must define between one and three default prompts',
      );
    }
    if (
      prompts.some(
        (prompt) => typeof prompt !== 'string' || prompt.length > 128,
      )
    ) {
      errors.push(
        'plugin default prompts must be strings of at most 128 characters',
      );
    }
  } catch (error) {
    errors.push(`plugin manifest validation failed: ${error.message}`);
  }

  const skillsDirectory = path.join(rootDirectory, 'skills');
  if (!fs.existsSync(skillsDirectory)) {
    errors.push('plugin skills directory is missing');
    return errors;
  }

  for (const skillName of fs.readdirSync(skillsDirectory).sort()) {
    const skillDirectory = path.join(skillsDirectory, skillName);
    if (!fs.statSync(skillDirectory).isDirectory()) continue;
    const skillPath = path.join(skillDirectory, 'SKILL.md');
    const agentPath = path.join(skillDirectory, 'agents', 'openai.yaml');
    const contractPath = path.join(skillDirectory, 'contract.json');
    if (!fs.existsSync(skillPath)) {
      errors.push(`${skillName} is missing SKILL.md`);
      continue;
    }

    const skillText = readText(skillPath);
    if (/\[TODO(?:\s|:)/u.test(skillText)) {
      errors.push(`${skillName}/SKILL.md contains a TODO placeholder`);
    }
    const frontmatterMatch = skillText.match(/^---\n([\s\S]*?)\n---\n/u);
    if (!frontmatterMatch) {
      errors.push(`${skillName}/SKILL.md has invalid frontmatter`);
      continue;
    }
    try {
      const frontmatter = parseYaml(frontmatterMatch[1]);
      if (frontmatter.name !== skillName) {
        errors.push(`${skillName}/SKILL.md name must match its folder`);
      }
      if (
        typeof frontmatter.description !== 'string' ||
        frontmatter.description.trim() === ''
      ) {
        errors.push(`${skillName}/SKILL.md description is required`);
      }
      const unexpectedKeys = Object.keys(frontmatter).filter(
        (key) => !['name', 'description'].includes(key),
      );
      if (unexpectedKeys.length > 0) {
        errors.push(
          `${skillName}/SKILL.md has unsupported frontmatter keys: ${unexpectedKeys.join(', ')}`,
        );
      }
    } catch (error) {
      errors.push(
        `${skillName}/SKILL.md frontmatter failed to parse: ${error.message}`,
      );
    }

    if (!fs.existsSync(agentPath)) {
      errors.push(`${skillName} is missing agents/openai.yaml`);
      continue;
    }
    try {
      const agent = parseYaml(readText(agentPath));
      const description = agent.interface?.short_description;
      const defaultPrompt = agent.interface?.default_prompt;
      if (
        typeof description !== 'string' ||
        description.length < 25 ||
        description.length > 64
      ) {
        errors.push(
          `${skillName} short_description must contain 25 to 64 characters`,
        );
      }
      if (
        typeof defaultPrompt !== 'string' ||
        !defaultPrompt.includes(`$${skillName}`)
      ) {
        errors.push(
          `${skillName} default_prompt must explicitly mention $${skillName}`,
        );
      }
    } catch (error) {
      errors.push(
        `${skillName}/agents/openai.yaml failed to parse: ${error.message}`,
      );
    }
    if (!fs.existsSync(contractPath)) {
      errors.push(`${skillName} is missing contract.json`);
    } else {
      try {
        const contract = readJson(contractPath);
        if (
          contract.schemaVersion !== '1.0.0' ||
          contract.runtimeContractVersion !== '1.0.0' ||
          contract.requestContractVersion !== '1.0.0'
        ) {
          errors.push(`${skillName} has an incompatible runtime contract`);
        }
      } catch (error) {
        errors.push(
          `${skillName}/contract.json failed to parse: ${error.message}`,
        );
      }
    }
  }

  const binPath = path.join(rootDirectory, 'bin', 'designome.mjs');
  if (!fs.existsSync(binPath))
    errors.push('Designome CLI entrypoint is missing');
  return errors;
}

export function validateRepository(rootDirectory = repositoryRoot) {
  const errors = [];
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
  });
  addFormats(ajv);

  const matrixSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'concept-matrix.schema.json',
  );
  const matrixPath = path.join(
    rootDirectory,
    'concepts',
    'concept-matrix.v0.2.json',
  );
  const dnaSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'design-dna.schema.json',
  );
  const dnaExamplePath = path.join(
    rootDirectory,
    'examples',
    'design-dna.reference-v0.2.json',
  );
  const integrationPolicySchemaPath = path.join(
    rootDirectory,
    'schemas',
    'integration-policy.schema.json',
  );
  const integrationPolicyExamplePath = path.join(
    rootDirectory,
    'examples',
    'integration-policy.reference.json',
  );
  const auditConfigSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'audit-config.schema.json',
  );
  const auditConfigExamplePath = path.join(
    rootDirectory,
    'examples',
    'audit-config.reference.json',
  );
  const auditEvidenceSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'audit-evidence.schema.json',
  );
  const auditEvidenceExamplePath = path.join(
    rootDirectory,
    'examples',
    'audit-evidence.reference.json',
  );
  const auditFindingsSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'audit-findings.schema.json',
  );
  const auditFindingsExamplePath = path.join(
    rootDirectory,
    'examples',
    'audit-findings.reference.json',
  );
  const repairPlanSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'repair-plan.schema.json',
  );
  const repairPlanExamplePath = path.join(
    rootDirectory,
    'examples',
    'repair-plan.reference.json',
  );
  const auditReportSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'audit-report.schema.json',
  );
  const auditReportExamplePath = path.join(
    rootDirectory,
    'examples',
    'audit-report.reference.json',
  );
  const runStateSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'run-state.schema.json',
  );
  const runStateExamplePath = path.join(
    rootDirectory,
    'examples',
    'run-state.reference.json',
  );
  const requestContractSchemaPath = path.join(
    rootDirectory,
    'schemas',
    'request-contract.schema.json',
  );
  const requestContractExamplePaths = ['extract', 'install', 'audit'].map(
    (operation) =>
      path.join(
        rootDirectory,
        'examples',
        `request-contract.${operation}.reference.json`,
      ),
  );

  try {
    const matrixSchema = readJson(matrixSchemaPath);
    const matrix = readJson(matrixPath);
    const validateMatrix = ajv.compile(matrixSchema);
    if (!validateMatrix(matrix))
      errors.push(...formatAjvErrors('concept matrix', validateMatrix.errors));
    errors.push(...collectMatrixReferenceErrors(matrix, rootDirectory));
    errors.push(...validatePromptShape(matrix, rootDirectory));
  } catch (error) {
    errors.push(`concept matrix validation failed: ${error.message}`);
  }

  try {
    const dnaSchema = readJson(dnaSchemaPath);
    const dnaExample = readJson(dnaExamplePath);
    const validateDna = ajv.compile(dnaSchema);
    if (!validateDna(dnaExample))
      errors.push(...formatAjvErrors('Design DNA example', validateDna.errors));
  } catch (error) {
    errors.push(`Design DNA validation failed: ${error.message}`);
  }

  try {
    const requestContractSchema = readJson(requestContractSchemaPath);
    const validateRequestContract = ajv.compile(requestContractSchema);
    for (const examplePath of requestContractExamplePaths) {
      const example = readJson(examplePath);
      if (!validateRequestContract(example)) {
        errors.push(
          ...formatAjvErrors(
            `request contract ${path.basename(examplePath)}`,
            validateRequestContract.errors,
          ),
        );
      }
    }
  } catch (error) {
    errors.push(`request contract validation failed: ${error.message}`);
  }

  try {
    const integrationPolicySchema = readJson(integrationPolicySchemaPath);
    const integrationPolicyExample = readJson(integrationPolicyExamplePath);
    const validateIntegrationPolicy = ajv.compile(integrationPolicySchema);
    if (!validateIntegrationPolicy(integrationPolicyExample)) {
      errors.push(
        ...formatAjvErrors(
          'integration policy',
          validateIntegrationPolicy.errors,
        ),
      );
    }
  } catch (error) {
    errors.push(`integration policy validation failed: ${error.message}`);
  }

  try {
    const auditConfigSchema = readJson(auditConfigSchemaPath);
    const auditConfigExample = readJson(auditConfigExamplePath);
    const validateAuditConfig = ajv.compile(auditConfigSchema);
    if (!validateAuditConfig(auditConfigExample)) {
      errors.push(
        ...formatAjvErrors('audit config', validateAuditConfig.errors),
      );
    }
  } catch (error) {
    errors.push(`audit config validation failed: ${error.message}`);
  }

  for (const [label, schemaPath, examplePath] of [
    ['audit evidence', auditEvidenceSchemaPath, auditEvidenceExamplePath],
    ['audit findings', auditFindingsSchemaPath, auditFindingsExamplePath],
    ['repair plan', repairPlanSchemaPath, repairPlanExamplePath],
    ['audit report', auditReportSchemaPath, auditReportExamplePath],
    ['run state', runStateSchemaPath, runStateExamplePath],
  ]) {
    try {
      const validateAuditArtifact = ajv.compile(readJson(schemaPath));
      if (!validateAuditArtifact(readJson(examplePath))) {
        errors.push(...formatAjvErrors(label, validateAuditArtifact.errors));
      }
    } catch (error) {
      errors.push(`${label} validation failed: ${error.message}`);
    }
  }

  errors.push(...validateWorkflowYaml(rootDirectory));
  errors.push(...validatePluginSurface(rootDirectory));
  return errors;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = validateRepository();
  if (errors.length > 0) {
    console.error('Repository validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Repository validation passed.');
  }
}
