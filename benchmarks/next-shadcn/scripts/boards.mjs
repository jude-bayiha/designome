// Anonymize captured runs and compose one blind review board per route.
// Usage: node boards.mjs --work <dir> --sources <dir> [--seed <text>]
// The reviewer receives review/; key.json stays with the operator until scoring is done.
import { composeBoards } from '../../shared/boards.mjs';
import { benchmarkRoot, routes, viewport } from './lib.mjs';

await composeBoards({ benchmarkRoot, screens: routes, tile: viewport });
