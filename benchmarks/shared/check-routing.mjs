// Compare the per-source routing an extraction wrote into its request contract with the routing
// the operator expected from their plain-language split.
// Usage: node check-routing.mjs --contract <request-contract.json> --expected <routing.expected.json>
//
// The expected file lists one entry per source, matched by a file-name prefix:
//   { "sources": [ { "match": "clickup-", "evidenceMode": ["only"],
//       "requireUiDomainRefs": ["domain.tables-lists"],
//       "forbidAxisRefs": ["axis.color-surface-identity"] } ] }
// Every key except `match` is optional. Exits 1 when any source differs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJson, required } from './lib.mjs';

const refKinds = ['axisRefs', 'conceptRefs', 'uiDomainRefs'];

export function checkRouting(contract, expected) {
  const sources = contract?.parameters?.sources ?? [];
  const results = [];
  for (const rule of expected.sources) {
    const matches = sources.filter((source) =>
      path.basename(source.path).startsWith(rule.match),
    );
    const problems = [];
    if (matches.length === 0) problems.push('no source matches this prefix');
    for (const source of matches) {
      const name = path.basename(source.path);
      if (rule.evidenceMode && !rule.evidenceMode.includes(source.evidenceMode))
        problems.push(
          `${name}: evidenceMode is ${source.evidenceMode}, expected ${rule.evidenceMode.join(' or ')}`,
        );
      for (const kind of refKinds) {
        const suffix = kind[0].toUpperCase() + kind.slice(1);
        const present = new Set(source[kind] ?? []);
        for (const ref of rule[`require${suffix}`] ?? [])
          if (!present.has(ref)) problems.push(`${name}: ${kind} lacks ${ref}`);
        for (const ref of rule[`forbid${suffix}`] ?? [])
          if (present.has(ref))
            problems.push(`${name}: ${kind} includes forbidden ${ref}`);
      }
    }
    results.push({
      match: rule.match,
      routed: matches.map((source) => ({
        path: path.basename(source.path),
        evidenceMode: source.evidenceMode,
        uiDomainRefs: source.uiDomainRefs,
        axisRefs: source.axisRefs,
      })),
      problems,
    });
  }
  return {
    ok: results.every((result) => result.problems.length === 0),
    results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const report = checkRouting(
    await readJson(required(options, 'contract')),
    await readJson(required(options, 'expected')),
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
