# Standalone skill distribution

## Installation contract

Designome ships one skill, `skills/designome/`. It is a complete installation unit for `skills add`, for Codex (`--agent codex`, installed under `.agents/skills/`) and Claude Code (`--agent claude-code`, installed under `.claude/skills/`), and the only skill of both plugin manifests, `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json`. It installs without a global Designome executable, npm runtime dependencies, or access to the development checkout. Node.js 24 or newer is required. The host agent still supplies visual reasoning and browser interaction.

Extraction, installation and audit are one workflow: an audit needs an installed or supplied accepted Design DNA, and installation needs an extracted and accepted one. One skill therefore covers all three operations, and registries list a single entry.

```text
skills/designome/
  SKILL.md
  workflows/
    extract.md
    install.md
    audit.md
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

`SKILL.md` holds the shared rules and routes the request to one operation. The agent then reads only that operation's workflow file, so a request loads the instructions it needs and no more. `contract.json` (skill contract 2.0) maps each operation to its workflow and execution owner: `extract` to the host agent, `install` to the Designome runtime, `audit` to both. The runtime under `scripts/runtime/` is shipped once and shared by the three operations. The internal `instructions.md` files under `scripts/runtime/skill-sources/` are reference material, not additional discoverable `SKILL.md` entry points. Prompts remain specialized and are read only when routed.

Every relative path in `SKILL.md` and in `workflows/` resolves from the skill directory, the one that contains `SKILL.md`.

The skill resolves `scripts/runtime` relative to its own installed directory. Shell commands use that absolute path regardless of the current working directory. No command depends on the original repository being two directories above the installed skill. Runtime metadata reads and imports resolve within the bundle.

## Generation and coherence

`pnpm build:skills` builds the committed `skills/designome/` directory from `skill-sources/designome/` and an explicit list of shared resource directories. It rewrites repository-relative paths in every shipped Markdown file to the bundled runtime, and removes any other directory under `skills/`. Keeping generated artifacts in Git allows the ordinary GitHub `skills add` command to work without a post-install build hook. The build never follows symlinks or includes the repository's dependencies, tests, target projects, or run directories.

`bundle-manifest.json` contains SHA-256 hashes of shipped files and a deterministic aggregate fingerprint. These bind instructions and resources to one snapshot; they are integrity metadata, not a signature or publisher-authentication mechanism. `pnpm check:skills` compares installed-in-repository artifacts against freshly derived expectations, including unexpected files. It also rejects any skill directory that is no longer built. It does not silently regenerate them.

Update canonical files, format them, regenerate, then run `pnpm check`. Commit generated artifacts with each source change. Do not run the generator inside a user's installed skill directory. Updating an installed skill replaces its distribution through the skill manager; local edits inside that distribution are not a supported override mechanism.

## Ownership alongside DNA installation

The skill manager owns standalone distributions. DNA installation continues to own generated design documentation, CSS, and its installation manifest. Project-owned CSS overrides remain preserved.

DNA installation exports a lightweight project-local audit skill, `designome-audit`, so agents in the target project can audit without the full skill. Its `SKILL.md` is composed from `skill-sources/project-audit/frontmatter.md` and the same `workflows/audit.md` the full skill ships, so both audit paths follow one set of instructions. It keeps its own name so it never collides with a `designome` skill installed in the same directory.

Each host directory is handled separately. When it already holds a standalone `designome` skill, or a legacy standalone `designome-audit`, with a recognized bundle manifest, and the project-local export is not already DNA-managed there, DNA installation leaves that skill untouched and exports nothing for that host. The standalone skill's runtime and integrity are outside `verify-install` coverage. The bundle marker identifies ownership; it does not certify runtime integrity. The lightweight export reports deterministic tooling unavailable when none is installed.

Once exported, the project-local audit skill stays DNA-managed even if a standalone skill is added later, so it is never orphaned. Replacing it through another installer does not silently transfer ownership; existing checksum conflict handling continues to apply.

## Validation boundaries

The distribution tests invoke a pinned real `skills add` CLI twice per host, `codex` and `claude-code`, in a fresh project with only the `designome` skill available. They remove the installation source and run the installed helper under Node's filesystem permission model, allowing only the temporary workspace. A negative read test confirms the development checkout is inaccessible.

The tests cover helper startup, normalized request validation, screenshot metadata initialization, lossless context construction, DNA validation, two consecutive DNA installations, override preservation, installation verification, doctor, static audit planning, preservation of the standalone skill, and manual-change detection. They also check deterministic generation, missing and unexpected files and skill directories, stale source detection, workflow references, and absence of nested discoverable skills.

The screenshot fixture is a synthetic PNG used only for deterministic metadata testing. These checks do not establish visual extraction quality, perceptual fidelity, real browser coverage, or automatic human acceptance. The pinned installer test uses a local source and does not prove GitHub authentication or network availability.
