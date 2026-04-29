# Instrktr Configuration Reference

All settings live under the `instrktr` namespace and can be set at User, Workspace, or Workspace Folder scope via **File → Preferences → Settings** or directly in `settings.json`.

---

## Settings

### `instrktr.registryUrl`

**Type:** `string` | **Default:** `""`

The URL of the `registry.json` file that populates the Browse Courses catalog. Must point to a raw JSON file — a GitHub raw URL is the most common choice.

```json
"instrktr.registryUrl": "https://raw.githubusercontent.com/your-org/instrktr-registry/main/registry.json"
```

Leave blank to use no catalog (you can still open local courses via the command palette).

---

### `instrktr.startupCourse`

**Type:** `string` | **Default:** `""`

A course ID from the registry to automatically start when VS Code opens. If the course is not yet installed, Instrktr downloads it first, then starts it. The course ID must match the `id` field in `registry.json`.

```json
"instrktr.startupCourse": "git-basics"
```

Useful for workshops and classroom environments where every participant should land on the same course without any manual steps.

**Precedence:** `localCoursePath` takes priority — if both are set, `localCoursePath` wins.

---

### `instrktr.localCoursePath`

**Type:** `string` | **Default:** `""`

Absolute path, or a VS Code-style workspace-relative path, to a local course folder on disk. When set, Instrktr opens this folder automatically on activation in **dev watch mode** — the panel reloads whenever any course file changes. Intended for course authors iterating locally.

```json
"instrktr.localCoursePath": "/Users/alice/courses/course-git-basics"
```

> **Dev mode behavior:** Any file change inside the course folder triggers a 500 ms debounced panel reload. No manual restart needed while authoring.

**Precedence:** Takes priority over `startupCourse`.

---

### `instrktr.presentationMode`

Boolean. Default: `false`. When enabled, Instrktr optimizes the course panel for live presentations or instructor-led demos:

- hides GitHub sign-in/sync controls
- hides learner hint controls
- hides and blocks solution comparison from the panel
- slightly increases panel spacing and type scale for projector readability

```jsonc
"instrktr.presentationMode": true
```

Use this when driving a workshop from a projected VS Code window and you want to avoid accidental spoilers while keeping navigation and **Check My Work** available.

### `instrktr.debugValidatorCommands`

**Type:** `boolean` | **Default:** `false`

When enabled, Instrktr writes validator command execution and permission decisions to the **Instrktr** output channel. Use this when a validator command does not prompt as expected, or when you need to confirm whether a check used `context.terminal.run(...)`, a Bash validator, a cached allow decision, or only workspace-scoped file APIs such as `context.files.exists(...)`.

```json
"instrktr.debugValidatorCommands": true
```

The log includes command text, working directory, course/step metadata when available, permission decisions, exit codes, and output byte counts. It does not log full stdout/stderr.

---

### `instrktr.disableValidatorCommandSecurityChecks`

**Type:** `boolean` | **Default:** `false`

Disables validator command permission prompts globally. When enabled, commands from `context.terminal.run(...)` and Bash validators run without asking.

```json
"instrktr.disableValidatorCommandSecurityChecks": true
```

Only enable this for courses you fully trust. Validator commands run as your user and can inspect or change files that your VS Code process can access.

---

## Precedence and Load Order

On activation, Instrktr resolves what to start in this order:

1. `instrktr.localCoursePath` — if non-empty, opens that folder in dev mode and stops
2. `instrktr.startupCourse` — if non-empty, checks the local install cache:
   - Already installed → starts immediately
   - Not installed → fetches the registry, downloads the course, then starts
3. Neither set → opens the bundled JavaScript Fundamentals course if it is packaged with the extension; otherwise the panel shows the "No course loaded" empty state

Before any course starts, Instrktr requires a learner workspace folder for starter files,
validators, terminal commands, and `open:` links. If VS Code has no folder open, Instrktr
prompts you to choose a folder and uses that folder as the course working directory.
Extension global storage is used only for downloaded course packages and progress data,
not learner work files.

---

## Scope Examples

### User scope — applies across all workspaces

Open `~/.config/Code/User/settings.json` (macOS: `~/Library/Application Support/Code/User/settings.json`):

```json
{
  "instrktr.registryUrl": "https://raw.githubusercontent.com/chipset/instrktr-registry/main/registry.json"
}
```

### Workspace scope — applies only to this project

Add `.vscode/settings.json` to your repo:

```json
{
  "instrktr.startupCourse": "git-basics"
}
```

When a learner opens this repo, Instrktr automatically starts the `git-basics` course — no manual setup required.

### Course-authoring workspace

```json
{
  "instrktr.localCoursePath": "${workspaceFolder}"
}
```

Points Instrktr at the current workspace root. Combined with **Instrktr: Open Local Course Folder**, this makes the course folder reload live on every save.

> **Note:** `${workspaceFolder}` is resolved by Instrktr when reading this setting — you do not need to hardcode the path.

---

## Workshop / Classroom Setup

For a fully zero-touch experience — participants open VS Code and the course starts immediately:

**Step 1 — Commit a `.vscode/settings.json` to your workshop repo:**

```json
{
  "instrktr.registryUrl": "https://raw.githubusercontent.com/your-org/instrktr-registry/main/registry.json",
  "instrktr.startupCourse": "your-course-id"
}
```

**Step 2 — Ask participants to:**
1. Clone the workshop repo
2. Open it in VS Code
3. Install the Instrktr extension (if not already installed)

The course installs and starts automatically on first open.

---

## Course Author Dev Workflow

Fastest iteration loop while writing a course:

```json
{
  "instrktr.localCoursePath": "/Users/alice/courses/course-my-topic"
}
```

Or use a workspace-relative variable so the setting is portable:

```json
{
  "instrktr.localCoursePath": "${workspaceFolder}"
}
```

Then open the course folder as your VS Code workspace. Every time you save `course.json`, an `instructions.md`, or a `validate.js`, the panel reloads automatically within half a second.

---

## Advanced: Per-Folder Settings in a Monorepo

If you keep multiple courses in one repo, VS Code's **multi-root workspaces** let you activate a different course per folder:

**.vscode/course-git-basics.code-workspace:**
```json
{
  "folders": [
    { "path": "." }
  ],
  "settings": {
    "instrktr.localCoursePath": "${workspaceFolder}/course-git-basics"
  }
}
```

Open each `.code-workspace` file to target a specific course without touching your global settings.

---

## Registry JSON Format

The registry file referenced by `instrktr.registryUrl` must follow this schema:

```json
{
  "courses": [
    {
      "id": "git-basics",
      "title": "Git Fundamentals",
      "description": "Learn the core Git workflow: init, commit, branch, and merge.",
      "repo": "your-org/course-git-basics",
      "latestVersion": "1.0.0",
      "tags": ["git", "beginner"]
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `id` | ✓ | Unique slug — must match what you put in `instrktr.startupCourse` |
| `title` | ✓ | Display name shown in the catalog |
| `description` | ✓ | Short summary shown in the catalog |
| `repo` | ✓ | GitHub repo in `org/repo` form — must match the pattern `owner/name` exactly |
| `latestVersion` | ✓ | Semver string matching a git tag on the repo (e.g. `v1.0.0`) |
| `tags` | | Array of strings used for display grouping |

Instrktr downloads courses using `git clone --depth 1` when `git` is available, falling back to:
```
https://github.com/{repo}/archive/refs/tags/v{latestVersion}.zip
```

No GitHub authentication is required for public repos.

---

## Environment Variables in Validators

Validators can read environment variables via `context.env.get()`. These come from the shell environment where VS Code was launched. To inject variables for all courses in a workspace, set them in your shell profile or use a `.env`-loading tool before opening VS Code.

```js
// validate.js
module.exports = async function validate(context) {
  const host = context.env.get('ZOWE_OPT_HOST');
  if (!host) {
    return context.fail('ZOWE_OPT_HOST is not set. Check your environment.');
  }
  return context.pass('Host is configured.');
};
```

---

## Full Reference Table

| Setting | Type | Default | Scope |
|---|---|---|---|
| `instrktr.registryUrl` | string | `""` | User / Workspace |
| `instrktr.startupCourse` | string | `""` | User / Workspace |
| `instrktr.localCoursePath` | string | `""` | User / Workspace |
| `instrktr.presentationMode` | boolean | `false` | User / Workspace |
| `instrktr.debugValidatorCommands` | boolean | `false` | User / Workspace |
| `instrktr.disableValidatorCommandSecurityChecks` | boolean | `false` | User |
