// Run one arm of this benchmark as a fresh `claude -p` session and record its token usage.
// Usage:
//   node run-arm.mjs --work <dir> --arm <extract|designome|screenshots|combined|none> --run <id>
//     [--sources <dir>] [--routing <file>] [--dossier <dir>] [--describe <text>]
//     [--request <file>] [--model <id>] [--effort <level>] [--dry-run]
import { runArm } from '../../shared/run-arm.mjs';
import { benchmarkRoot, hashIgnore } from './lib.mjs';

process.exit(
  await runArm({
    benchmarkRoot,
    hashIgnore,
    defaultDescription: 'mobile apps',
  }),
);
