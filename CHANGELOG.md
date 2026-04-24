# Changelog

## [0.3.5] — 2026-04-24

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
