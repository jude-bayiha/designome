# Standalone skill distribution

## Installation contract

Each directory under `skills/` is a complete installation unit for `skills add`. Each can be installed independently, without siblings, a global Designome executable, npm runtime dependencies, or access to the development checkout. Node.js 24 or newer is required. The host agent still supplies visual reasoning and browser interaction.

```text
skills/designome-extract/
  SKILL.md
  contract.json
  agents/openai.yaml
  bundle-manifest.json
  scripts/runtime/
    bin/designome.mjs
    src/
    concepts/
    schemas/
    prompts/
    docs/
    examples/
    skill-sources/
    package.json
```

All three skills contain the same shared runtime resources, with separate specialized entry points. Duplication in the shipped artifacts is intentional; canonical sources remain maintained once. The internal `instructions.md` files are reference material, not additional discoverable `SKILL.md` entry points. Prompts remain specialized and are read only when routed.

The skill resolves `scripts/runtime` relative to its own installed directory. Shell commands use that absolute path regardless of the current working directory. No command depends on the original repository being two directories above the installed skill. Runtime metadata reads and imports resolve within the bundle.

## Generation and coherence

`pnpm build:skills` builds the committed `skills/` directories from `skill-sources/` and an explicit list of shared resource directories. Keeping generated artifacts in Git allows the ordinary GitHub `skills add` command to work without a post-install build hook. The build never follows symlinks or includes the repository's dependencies, tests, target projects, or run directories.

`bundle-manifest.json` contains SHA-256 hashes of shipped files and a deterministic aggregate fingerprint. These bind instructions and resources to one snapshot; they are integrity metadata, not a signature or publisher-authentication mechanism. `pnpm check:skills` compares installed-in-repository artifacts against freshly derived expectations, including unexpected files. It does not silently regenerate them.

Update canonical files, format them, regenerate, then run `pnpm check`. Commit generated artifacts with each source change. Do not run the generator inside a user's installed skill directory. Updating an installed skill replaces its distribution through the skill manager; local edits inside that distribution are not a supported override mechanism.

## Ownership alongside DNA installation

The skill manager owns standalone distributions. DNA installation continues to own generated design documentation, CSS, and its installation manifest. Project-owned CSS overrides remain preserved.

When an independently installed `designome-audit` has a recognized bundle manifest and its entry point is not already DNA-managed, DNA installation leaves that skill untouched. Its runtime and integrity are outside `verify-install` coverage. The bundle marker identifies ownership; it does not certify runtime integrity. Without a standalone distribution, DNA installation still exports the lightweight project-local audit skill and its request references. That lightweight export reports deterministic tooling unavailable when none is installed.

Replacing an already DNA-managed audit skill through another installer does not silently transfer ownership. Existing checksum conflict handling continues to apply.

## Validation boundaries

The distribution tests invoke a pinned real `skills add` CLI twice per skill in a fresh project with only that skill available. They remove the installation source and run the installed helper under Node's filesystem permission model, allowing only the temporary workspace. A negative read test confirms the development checkout is inaccessible.

The tests cover helper startup, normalized request validation, screenshot metadata initialization, lossless context construction, DNA validation, two consecutive DNA installations, override preservation, installation verification, doctor, static audit planning, and manual-change detection. They also check deterministic generation, missing and unexpected files, stale source detection, and absence of nested discoverable skills.

The screenshot fixture is a synthetic PNG used only for deterministic metadata testing. These checks do not establish visual extraction quality, perceptual fidelity, real browser coverage, or automatic human acceptance. The pinned installer test uses a local source and does not prove GitHub authentication or network availability.
