# Transactional installation and doctor

`designome doctor --project <directory> [--dna <accepted-dna>]` is strictly read-only. It reports `writesPerformed: false` and checks the bounded target, `package.json`, accepted Design DNA, runtime-to-skill contract version, manifest readability, managed checksums, interrupted transaction state, and configured audit providers.

## Transaction phases

Installation exposes these phases in its plan:

1. diagnostic
2. preflight
3. plan
4. prepare
5. validate prepared files
6. apply atomically per path
7. verify
8. commit the manifest as the last planned target artifact
9. cleanup

Desired files are prepared in an isolated operating-system temporary directory. Before each apply, the runtime rechecks the observed checksum from the plan. A durable Designome-owned journal stores pre-write backups before mutation. Failure rolls actions back in reverse order, removes temporary artifacts and empty Designome-created directories, and leaves no partial installation.

An interrupted journal is detected by `doctor` without mutation. A later write-authorized `install` or orchestrated resume restores backups before replanning.

## Missing package example

For a target without `package.json`, both `doctor` and installation return `PROJECT_PACKAGE_JSON_MISSING` with the checked path, prerequisite, resolution, and `writesPerformed: false`. No `.designome`, documentation, CSS, or guidance path is created.

## Conflict example

A modified managed file produces a conflict containing:

- path
- expected owner `designome`
- recorded checksum
- observed checksum
- conflict nature
- refused operations
- safe resolutions

Designome never overwrites the file automatically. Unmanaged collisions and missing managed files also fail before application.
