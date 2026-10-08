// Project the Markdown dossier of a draft Design DNA without accepting or installing it.
// Usage: node project-dossier.mjs --dna <design-dna.json> --output <new-directory>
import fs from 'node:fs/promises';
import path from 'node:path';
import { projectDocumentation } from '../../../src/index.mjs';
import { exists, parseArgs, readJson, required, writeJson } from './lib.mjs';

const options = parseArgs(process.argv.slice(2));
const dnaPath = path.resolve(required(options, 'dna'));
const output = path.resolve(required(options, 'output'));
if (await exists(output)) throw new Error(`${output} already exists`);

const dna = await readJson(dnaPath);
// Generators must not learn where the sources live, even from prose.
let serialized = JSON.stringify(dna);
for (const source of dna.sources ?? [])
  if (source.path)
    serialized = serialized.replaceAll(
      JSON.stringify(source.path).slice(1, -1),
      'source:' + source.id,
    );

const documents = await projectDocumentation(JSON.parse(serialized));
let bytes = 0;
for (const [filename, content] of documents) {
  const destination = path.join(output, filename);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);
  bytes += Buffer.byteLength(content);
}
const brief = documents.get('README.md');
await writeJson(path.join(path.dirname(output), 'dossier.json'), {
  dna: dnaPath,
  dnaStatus: dna.status,
  files: documents.size,
  bytes,
  briefBytes: brief ? Buffer.byteLength(brief) : null,
});
console.log(`${documents.size} files, ${bytes} bytes in ${output}`);
