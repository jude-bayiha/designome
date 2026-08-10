import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const pluginRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function sha256File(filePath) {
  return sha256(await fs.readFile(filePath));
}

export async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.designome-${process.pid}-${randomUUID()}.tmp`;
  const existingStat = await fs.stat(filePath).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });

  try {
    await fs.writeFile(temporaryPath, content, {
      encoding: 'utf8',
      mode: existingStat?.mode,
    });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function writeIfChanged(filePath, content) {
  const current = await readTextIfExists(filePath);
  if (current === content) return 'unchanged';
  await atomicWrite(filePath, content);
  return current === null ? 'create' : 'update';
}

export async function writeJsonIfChanged(filePath, value) {
  return writeIfChanged(filePath, jsonText(value));
}

export function relativeInside(rootDirectory, targetPath, label = 'path') {
  const relativePath = path.relative(rootDirectory, targetPath);
  if (
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath))
  ) {
    return relativePath;
  }
  throw new Error(`${label} must stay inside the target project`);
}

export function resolveProjectPath(rootDirectory, projectRelativePath, label) {
  if (path.isAbsolute(projectRelativePath)) {
    throw new Error(`${label} must be relative to the target project`);
  }
  const resolvedPath = path.resolve(rootDirectory, projectRelativePath);
  relativeInside(rootDirectory, resolvedPath, label);
  return resolvedPath;
}

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

export async function rollbackWrites(backups) {
  for (const backup of [...backups].reverse()) {
    if (backup.content === null) {
      await fs.rm(backup.path, { force: true });
    } else {
      await atomicWrite(backup.path, backup.content);
    }
  }
}
