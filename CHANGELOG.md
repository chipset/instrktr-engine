# Changelog

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
