# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Instrktr** is a VS Code extension that runs interactive, hands-on coding courses directly inside the editor. It embeds course instructions, step validation, progress tracking, hints, and solution diffs into a sidebar panel. No external backend — all state lives in VS Code's local `globalStorageUri` as JSON files, with optional cross-device sync via GitHub Gists.

The extension is published to the VS Code Marketplace (`instrktr.instrktr`). The entry point is `src/extension.ts`; the compiled output is `dist/extension.js` (bundled by esbuild, never edited directly).

## Commands

```bash
npm run build       # production bundle (minified, no sourcemaps) → dist/extension.js
npm run watch       # rebuild on file change (sourcemaps on, no minify)
npm run lint        # eslint src/
npm run package     # vsce package → .vsix for marketplace upload
```

There is no automated test suite. The `test-course/` folder (a two-step "Git Fundamentals" course) is used for manual validation of the full load/check/navigate flow. To load it, set `instrktr.localCoursePath` to its absolute path in VS Code settings, or use the **Instrktr: Open Local Course Folder** command.

## Architecture

### Extension lifecycle (`src/extension.ts`)

`activate()` wires everything together:
1. Instantiates all singletons (`AuthManager`, `ProgressStore`, `GistSync`, `StepRunner`, `TerminalWatcher`, `RegistryFetcher`, `InstalledCourses`, `CourseDownloader`).
2. Pulls Gist progress on startup and on every sign-in.
3. Registers all VS Code commands and keybindings.
4. Auto-starts a course if `instrktr.localCoursePath` or `instrktr.startupCourse` is configured.
5. Sets the `instrktr.courseLoaded` context key (used to gate keybindings) via `runner.onStateChange`.

### Core engine (`src/engine/`)

| File | Responsibility |
|------|---------------|
| `types.ts` | All shared interfaces: `CourseDef`, `StepDef`, `StepState`, `CheckResult`, `Registry*` |
| `StepRunner.ts` | Owns the active course: loads manifest, tracks current step index, drives navigation, calls `ValidatorRunner`, fires `onStateChange` / `onStepPass` events |
| `CourseLoader.ts` | Reads and validates `course.json` (checks `engineVersion` via semver, resolves file paths) |
| `ValidatorRunner.ts` | Executes JS validators via `require()` or Bash validators via `execFile()`; enforces 30-second timeout |
| `ValidatorContext.ts` | Builds the sandbox context object passed to JS validators (file API, terminal API, pass/fail/warn helpers) |
| `FileScaffolder.ts` | Copies `starter/` files into the workspace at the beginning of each step |
| `ProgressStore.ts` | Reads/writes `progress.json` in `globalStorageUri`; tracks which step IDs are complete per course |
| `MigrationRunner.ts` | Remaps old step IDs to new ones using the `migration` table in `course.json` when a course upgrades versions |

### GitHub integration (`src/github/`)

| File | Responsibility |
|------|---------------|
| `AuthManager.ts` | GitHub OAuth via VS Code's built-in provider; exposes `state.token`, fires `onDidChangeState` |
| `RegistryFetcher.ts` | Fetches `registry.json` from the configured URL; 24-hour in-memory cache |
| `CourseDownloader.ts` | Downloads a GitHub release zip (`archive/refs/tags/v{version}.zip`), extracts via `yauzl`, stores in `globalStorageUri/courses/{id}@{version}/` |
| `InstalledCourses.ts` | Persists `installed-courses.json`; maps course IDs to their local directory and version |
| `GistSync.ts` | Push/pull progress JSON to a private GitHub Gist; debounced push triggered on every step pass |

### Webview UI (`src/webview/`)

Two webview view providers registered in `package.json`:
- `PanelProvider` (`instrktr.panel`) — active course: instructions, hints, check results, solution diff
- `CatalogProvider` (`instrktr.catalog`) — course browser: list, install, uninstall

Communication is bidirectional via `postMessage` / `onDidReceiveMessage`. The static assets (`src/webview/ui/main.js`, `catalog.js`, `styles.css`) are plain JS/CSS (no framework) and are served as webview resources.

### Validator execution model

**JS validators** (`validate.js`): required at runtime via `require(path)`, called with a `ValidatorContext` object. Must return `{ status: 'pass'|'fail'|'warn', message: string }`. The context provides `ctx.files.*` (read/exists/matches/list), `ctx.terminal.*` (run command, check output), and `ctx.pass()` / `ctx.fail()` / `ctx.warn()` helpers. Path traversal outside the workspace root throws.

**Bash validators** (`validate.sh`): run via `execFile('bash', [path], { cwd: courseDir })` with two env vars injected:
- `INSTRKTR_WORKSPACE` — absolute path to learner's workspace
- `INSTRKTR_STEP` — zero-based step index

Exit codes: `0` = pass (stdout becomes message), `1` = fail, `2` = warn.

Both types have a hard 30-second timeout.

## Course manifest format (`course.json`)

```json
{
  "id": "unique-course-id",
  "title": "Human-readable title",
  "version": "1.0.0",
  "engineVersion": ">=0.1.0",
  "steps": [
    {
      "id": "step-id",
      "title": "Step Title",
      "instructions": "steps/01-foo/instructions.md",
      "hints": ["Hint text"],
      "validator": "steps/01-foo/validate.js",
      "starter": "steps/01-foo/starter",
      "solution": "steps/01-foo/solution"
    }
  ],
  "migration": {
    "0.9.0": { "old-step-id": "new-step-id" }
  }
}
```

All paths in `course.json` are relative to the course directory. `engineVersion` uses semver range syntax and is checked against the installed extension version. `migration` maps old course versions to step-ID remapping tables — see `MigrationRunner.ts` for the algorithm.

## Local storage layout

All persistent state lives under VS Code's `globalStorageUri` (e.g., `~/.config/Code/User/globalStorage/instrktr/`):

```
progress.json             # { [courseId]: { completedSteps: string[], currentStep: string } }
installed-courses.json    # { [courseId]: { version, installedAt, courseDir } }
registry-cache.json       # { fetchedAt: number, registry: Registry }
courses/
  {courseId}@{version}/   # extracted course directories
```

## Key design constraints

- **No Node.js server** — the extension runs entirely inside VS Code's extension host process. All async I/O goes through `vscode.workspace.fs` or Node's `fs`/`child_process`.
- **`vscode` is external** in esbuild — never bundled; always provided by the VS Code runtime.
- **JS validators are `require()`d at runtime** — the cache is always busted (`delete require.cache[...]`) so hot-reloading works in dev mode.
- **Dev mode** (`localCoursePath` or `openLocalCourse` command) sets up a `vscode.workspace.createFileSystemWatcher` on `course.json` and reloads automatically on changes.
- **TypeScript target:** ES2022, module resolution `Node16`. Strict mode enabled. Output is CommonJS (esbuild `format: 'cjs'`).
