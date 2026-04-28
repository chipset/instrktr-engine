# Changelog

## [0.3.10] — 2026-04-28

### Added
- Validator command permission prompts now explain the command, working directory, course, and step before running `context.terminal.run(...)` or Bash validators. Learners can choose **Allow Once**, **Always Allow**, or **Deny**.
- Added `instrktr.debugValidatorCommands` to log validator command routing, permission decisions, and exit codes to the Instrktr output channel.

### Tooling
- Added ESLint dependencies and a flat config so `npm run lint` is enforceable.

---

## [0.3.9] — 2026-04-27

### Added
- **Mandatory trust-and-sandbox acknowledgment step** — every course now begins with a built-in step 0 that explains what course code can do, asks the learner to verify they trust the source and have reviewed the manifest, and recommends running the course in a sandboxed environment (Codespaces, Dev Containers, a VM, or a dedicated user account). The step is injected by the loader and cannot be removed by a course author. Course authors should not use the reserved step ID `__instrktr_trust_ack__`.

### Notes for upgraders
- Existing learner progress saved before this release used pre-injection step indices. On the next launch, the trust step appears at index 0 and the user's previously stored `currentStep` may be off by one. Use **Next Step →** to navigate to the correct position; previously completed work is preserved on disk.

### Security
- Closes the residual hardening items from the third-pass audit:
  - Expanded `BLOCKED_MODULES` to include `module`, `vm`, `os`, `inspector`, `repl`, `v8`, and their `node:` forms — `node:module` was the most important addition, since it exposes `Module._load` which would have bypassed `safeRequire`
  - Extended the `ValidatorContext.env.get` blocklist with `OAUTH`, `BEARER`, `KUBECONFIG`, `SSH_AUTH_SOCK`, `SESSION_ID`, `COOKIE`, `AUTH_*`, and `*_AUTH`
  - `.git/` cleanup after `git clone` now runs in a `finally` block so a partial clone cannot leave hooks behind
  - Type-check `message.path` and `message.index` on webview messages before passing to filesystem / runner
  - `MigrationRunner` filters migration table values to strings only

---

## [0.3.8] — 2026-04-26

### Added
- Courses are now downloaded via `git clone --depth 1` when git is available on PATH — faster and more efficient for large courses
- `.git/` directory is removed immediately after clone to prevent hook execution and credential leakage
- Falls back to the existing ZIP download path when git is not installed

### Security
- `registry.json` entries with a malformed `repo` field (not strictly `org/repo`) are now rejected at parse time, blocking injection at the source

---

## [0.3.7] — 2026-04-26

### Security
- Fixed path-traversal bypass in ValidatorContext and PanelProvider: `startsWith(root)` check now requires a path separator after the prefix, preventing a workspace path of `/home/user/project` from being bypassed by `/home/user/project-evil/file`
- Fixed ZIP path traversal (zip-slip): each entry path is now resolved and checked against `destDir` before extraction
- FileScaffolder now skips symlinks in `starter/` directories — a malicious course could previously use a symlink to read arbitrary files from the learner's system into the workspace
- `installed-courses.json` is now validated on load; each entry's fields are confirmed to be strings before `courseDir` is trusted

---

## [0.3.6] — 2026-04-26

### Added
- Check button now has a 35-second client-side timeout — if the extension host crashes mid-check the button re-enables automatically instead of staying disabled forever
- Validator-free steps (no `validator` field) now show **Next Step →** immediately instead of a "Check My Work" button that auto-passes
- Hints section has a **✕** dismiss button so learners can close hints once they no longer need them
- Solution comparison: when a step has multiple solution files, clicking **↕ Compare with Solution** shows a Quick Pick to choose which file to diff

### Fixed
- Semver engine version comparison was using JavaScript's string coercion (`<` on tuples) — `0.3.10` was incorrectly considered less than `0.3.9`. Fixed with explicit numeric comparison.
- GistSync only searched the first page (100 gists) when looking for the progress gist — now paginates until all gists are checked
- 404 detection in GistSync used fragile string matching; now uses a typed `GitHubApiError` class carrying the HTTP status code
- HTML in rendered instructions is now sanitized via DOMParser before being set as `innerHTML` — strips `<script>` tags, `on*` event attributes, and `javascript:` hrefs

---


### Added
- Bash validator support (`validate.sh`) — runs from the course directory so learners cannot tamper with the script
- `INSTRKTR_WORKSPACE` and `INSTRKTR_STEP` env vars injected into bash validators
- Exit code convention: `0` = pass, `1` = fail, `2` = warn; stdout becomes the panel message
- Docs updated: validator-api.md and course-authoring.md cover bash validators

---

## [0.3.4] — 2026-04-24

### Fixed
- `engineVersion` check now does proper semver comparison against the actual extension version — `>=0.3.0` is correctly enforced instead of being silently ignored
- FileScaffolder toast summarises skipped files (shows first 3 + count) instead of listing every filename

### Added
- `Instrktr: Jump to Step…` command in the command palette — opens a Quick Pick list of all steps

---

## [0.3.3] — 2026-04-24

### Fixed
- `instrktr.checkWork` command now registered in extension host — was listed in package.json but unreachable from command palette
- Dev mode course watcher now reloads `course.json` on file change, not just the current step — adding/renaming steps is reflected immediately
- Removed duplicate `instrktr.startCourse` command (was identical to `openLocalCourse` after previous fix)

### Added
- Keybindings: `Cmd+Shift+Enter` (Check My Work), `Cmd+Shift+]` (Next Step), `Cmd+Shift+[` (Prev Step) — only active when a course is loaded
- `instrktr.courseLoaded` context key set via `setContext` so keybindings don't interfere with other extensions

---

## [0.3.2] — 2026-04-24

### Added
- `instrktr.startupCourse` setting — auto-installs and starts a registry course by ID on activation
- `instrktr.localCoursePath` setting — auto-starts a local course folder on activation (dev watch mode)
- Stylized I-beam icon for marketplace and activity bar
- Configuration reference docs at `docs/configuration.md`

### Fixed
- `CatalogProvider` nonce now uses `crypto.randomBytes` instead of `Math.random`
- `instrktr.startCourse` command no longer hardcodes a missing `test-course/` directory — it now opens a folder picker (same as `openLocalCourse`)
- `package.json` version bumped to match CHANGELOG

---

## [0.3.1] — 2026-04-24

### Added
- `open:` link syntax in instructions — `[Open \`file.py\`](open:file.py)` renders as a file chip that opens the file in the editor
- Solution folder support — add a `solution/` folder to any step and reference it via `"solution"` in `course.json`
- **↕ Compare with Solution** button appears in the result panel after a fail or warn, opening VS Code's diff editor for each solution file
- Course Authoring Guide at `docs/course-authoring.md`

---

## [0.3.0] — 2026-04-23

### Added
- GitHub Gist sync — progress persists across machines when signed in with GitHub
- Course catalog webview with install, update, and uninstall support
- `Instrktr: Browse Courses` command and sidebar catalog view
- `Instrktr: Open Local Course Folder` command — loads a course from disk in dev watch mode
- `Instrktr: Restart Course` command
- `Instrktr: Sign in / Sign out` commands for GitHub OAuth
- Status bar item showing current course and step number
- Course version migration — progress carries over when a course updates
- Dev watch mode — panel reloads automatically when course files change
- Step dots navigation in the panel header

### Changed
- Course progress is now keyed by course ID and version (enables migrations)
- Validator context `terminal.run()` now returns `{ stdout, exitCode }` for reliable exit-code checks

### Fixed
- Panel no longer stuck on "Loading…" after reload
- Catalog click listener no longer leaks on every render
- ZIP extraction now handles any top-level directory name (not just `{repo}-{version}`)

---

## [0.2.0] — initial internal release

- Core step runner with file scaffolding and terminal integration
- Markdown instructions rendered server-side via `marked`
- `context.files` and `context.terminal` validator API
- Progress persistence to `globalStorageUri`

---

## [0.1.0] — prototype

- Basic webview panel with hardcoded test course
