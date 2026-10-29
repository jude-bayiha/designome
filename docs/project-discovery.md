# Target discovery and component reuse

`designome discover --project <installation-root>` is read-only. It separates the
Git/workspace root, selected frontend, shared packages, installation DNA and
applicable instruction paths. Package declarations admit workspace paths; resolved
imports establish use. A declared library alone never establishes component use.
No target code becomes screenshot evidence.

Discovery reads package.json workspaces (array or packages), pnpm block-list
workspace patterns, JSONC TypeScript/JavaScript paths and a local extended config,
package exports, component configurations and bounded source roots. It excludes
node_modules, skill bundles, private runs and common build outputs from traversal.
Package resolution may follow normal package-manager links; resolved source paths
must remain inside the workspace. Limits fail explicitly rather than yielding a
silently complete inventory. Dynamic imports, custom resolvers, deep config
inheritance and conditional exports can require host review.

One eligible frontend is selected automatically. Multiple frontends remain
`ambiguous`; select `discover --frontend apps/console` or use a project-relative
`--css-entry` for installation. Audit uses `frontend` in its user-owned config,
otherwise the installed CSS entry identifies the app. DNA, docs and manifest stay
at the supplied installation root; tests execute from the resolved frontend cwd.
Native packages are identified separately and are not forced into the web adapter.

Installation records concrete component files, reuse imports, shared-package
paths, themes, aliases and import evidence in its integration dossier. Agent
guidance links this inventory before component selection. Existing components,
customizations and aliases must be reused; no initialization or overwrite runs.
Library defaults must be adapted to the DNA rather than overriding its grammar.
User overrides retain their existing preservation and checksum policies.

## Browser capability inventory

`doctor` and audit planning share the same resolution. They distinguish:

- `declared`: an application/workspace package declares Playwright;
- `resolvable`: the package resolves from the selected frontend;
- `configured`: configuration files exist in that frontend;
- `browserAvailable`: the default Chromium executable exists;
- `serverReachable`: unprobed until browser navigation succeeds;
- `captureExecuted`: false until a real capture succeeds.

`available` means package resolution and executable existence, not successful
launch. Launch errors preserve the capability details. Config files are never
executed during discovery; project fixtures may pass their authorized browser
page, browser/channel and server setup directly to the capture adapter. An
unavailable default Chromium does not prohibit an authorized host browser.
`in-app-browser` depends on host tools; its presence is never asserted by the CLI.
`managed-playwright` remains an explicit, unavailable setup proposal. No consumer
dependency or browser installation runs silently.

A React DOM declaration, including a peer dependency in a shared library, is not
an application entry point. React-only packages need a web entry or executable
web script; framework packages remain candidates and explicit selection still
resolves genuine multi-application ambiguity. Bounded source discovery includes
Next.js `pages/` as well as `src/` and `app/`.

Reuse imports are resolved again from the frontend's aliases and declared public
workspace exports. Package-local aliases are not copied into frontend guidance.
Examples retain the original importer path; relative examples are only valid from
that importer. If no frontend specifier can be resolved, the component keeps a
concrete source path with an unknown import rather than inventing an alias or
initializing another library. Export wildcard substitutions apply to every target
occurrence and preserve literal characters in the matched subpath.
