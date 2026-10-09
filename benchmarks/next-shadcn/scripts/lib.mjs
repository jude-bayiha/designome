import path from 'node:path';
import { fileURLToPath } from 'node:url';

export * from '../../shared/lib.mjs';

export const benchmarkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const routes = ['objects', 'loans', 'calendar', 'reporting', 'settings'];
export const viewport = { width: 1440, height: 1024 };
// A phone-width pass shows whether the design input survives a narrow layout.
export const narrowViewport = { width: 390, height: 844 };
