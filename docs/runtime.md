# Runtime and CLI

The Designome runtime supports the agent skills with deterministic operations. It does not call a model API or perform visual design reasoning.

## Commands

### Initialize an extraction run

```bash
node bin/designome.mjs init-run \
  --output .designome/runs/<run-id> \
  --motion off \
  --image /absolute/path/reference-1.png \
  --image /absolute/path/reference-2.jpeg
```

The command validates input paths, deduplicates identical images, reads PNG/JPEG/GIF dimensions, computes SHA-256 hashes, fingerprints the configuration, and writes:

- `source-manifest.json`;
- `run-context.json`;
- `run-plan.json`;
- an empty `stages/` directory.

Repeating the same command returns `unchanged`. Reusing the directory with different inputs fails instead of silently replacing the run.

### Validate Design DNA

```bash
node bin/designome.mjs validate-dna --file <design-dna.json>
node bin/designome.mjs validate-dna \
  --file <design-dna.json> \
  --require-accepted
```

Runtime validation checks versions, unique identities, source and evidence references, matrix concepts, claim evidence requirements, component references, motion rules, and acceptance status. Repository CI additionally validates the complete JSON Schema with Ajv.

### Install accepted Design DNA

```bash
node bin/designome.mjs install \
  --dna <accepted-design-dna.json> \
  --project <target-project> \
  --css-entry src/styles/globals.css \
  --dry-run

node bin/designome.mjs install \
  --dna <accepted-design-dna.json> \
  --project <target-project> \
  --css-entry src/styles/globals.css \
  --instructions-reviewed
```

The installer refuses non-project roots, broad paths, escaped CSS entries, unaccepted DNA, unsafe literal CSS values, duplicate generated token names, unmanaged markers, and modified managed artifacts.

Current target artifacts are:

```text
.designome/design-dna.json
.designome/manifest.json
<css-directory>/designome.generated.css
<css-directory>/designome.overrides.css
<css-entry> managed import block
AGENTS.md managed guidance block
```

The accepted Design DNA is copied verbatim. Review source paths, notes, and extensions for private metadata before installation, especially when the target repository will be shared.

Only literal accepted token values become CSS custom properties. Relationships, ranges, and unknown values remain comments rather than fabricated CSS values.

### Verify an installation

```bash
node bin/designome.mjs verify-install --project <target-project>
```

Verification checks the manifest, accepted Design DNA, full-file hashes, exact marker multiplicity, managed-block hashes, and presence of user-owned overrides.

## Exit behavior

| Exit | Meaning                                                  |
| ---: | -------------------------------------------------------- |
|    0 | Command completed or installation is valid               |
|    1 | Invalid input, contract failure, or verification failure |
|    2 | Installation conflict; no write was performed            |

Commands emit machine-readable JSON. Errors are emitted as JSON on standard error with a stable code, message, and details array.
