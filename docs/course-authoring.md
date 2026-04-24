# Course Authoring Guide

## Directory Structure

Each course is a standalone GitHub repo with this layout:

```
course-my-topic/
├── course.json                    # course manifest
├── steps/
│   ├── 01-first-step/
│   │   ├── instructions.md        # step content (Markdown)
│   │   ├── validate.js            # checker function
│   │   ├── starter/               # files copied into workspace on step entry (optional)
│   │   └── solution/              # reference solution shown on fail/warn (optional)
│   └── 02-second-step/
│       └── ...
└── .github/
    └── workflows/
        └── release.yml            # auto-tags on merge to main
```

## `course.json`

```json
{
  "id": "git-basics",
  "title": "Git Fundamentals",
  "version": "1.0.0",
  "engineVersion": ">=0.1.0",
  "steps": [
    {
      "id": "init-repo",
      "title": "Initialize a Repository",
      "instructions": "steps/01-init-repo/instructions.md",
      "starter": "steps/01-init-repo/starter",
      "solution": "steps/01-init-repo/solution",
      "validator": "steps/01-init-repo/validate.js"
    }
  ]
}
```

### Step fields

| Field | Required | Description |
|---|---|---|
| `id` | ✓ | Unique slug, used for progress tracking and migration |
| `title` | ✓ | Shown in the panel header |
| `instructions` | ✓ | Path to a Markdown file |
| `validator` | | Path to a `validate.js` file. If omitted, step auto-passes |
| `starter` | | Path to a folder whose contents are copied into the workspace when the step begins |
| `solution` | | Path to a folder with reference files. Shown as a diff when a check fails or warns |

## Writing Instructions

Instructions are standard Markdown. Two special link syntaxes are supported:

### Open-file links

Use `open:` links to give learners a one-click shortcut to open a specific file in the editor:

```markdown
Edit [Open `src/index.js`](open:src/index.js) to add the function.
```

The path is relative to the workspace root. These render as styled file chips in the panel — clicking one opens the file directly in the VS Code editor.

### Regular links

Normal `https://` links open in the system browser as usual.

## Starter Files

Files in the `starter/` folder are copied into the workspace root when a learner enters the step. Use them to scaffold boilerplate the learner doesn't need to write themselves.

- Copying is additive — existing workspace files are not deleted
- Subdirectory structure is preserved: `starter/src/index.js` → workspace `src/index.js`
- If no `starter` is set, the workspace is left as-is from the previous step

## Solution Files

Files in the `solution/` folder mirror the workspace structure and represent the correct end state for the step:

```
solution/
└── src/
    └── index.js    # shown as diff against workspace src/index.js
```

When a validator returns `fail` or `warn`, a **↕ Compare with Solution** button appears in the panel. Clicking it opens VS Code's diff editor for each file in the solution folder (left = learner's file, right = solution). Multiple files open as separate diff tabs.

Solution files are included in the downloaded course package but are not surfaced in the learner UI unless a check fails.

## Writing Validators

See [validator-api.md](./validator-api.md) for the full `context` API.

### Tips

- **Prefer authoritative checks over terminal history.** Run `git log` yourself rather than checking what the learner typed — it's more reliable.
- **Use `warn` for "almost right".** It lets the learner proceed without blocking them on style issues.
- **Use `fail` only when the work genuinely isn't done.** Avoid false negatives that frustrate learners who did the right thing differently.
- **Give actionable messages.** Include the exact command or change needed, not just "incorrect".

## Versioning and Migration

Bump `version` in `course.json` whenever you change step structure. Learners on an older version will see a migration notification on next load.

If you rename, reorder, or remove steps, add a `migration` table so existing progress maps correctly:

```json
{
  "migration": {
    "1.0.0": {
      "old-step-id": "new-step-id"
    }
  }
}
```

Each entry maps an old step ID (from the version listed) to the new step ID.

## Publishing

1. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
2. Add the course to the registry (`registry.json` in your registry repo):

```json
{
  "id": "git-basics",
  "title": "Git Fundamentals",
  "description": "...",
  "repo": "your-org/course-git-basics",
  "latestVersion": "1.0.0",
  "tags": ["git", "beginner"]
}
```

The GitHub Actions `release.yml` workflow (included by `create-instrktr-course`) tags automatically on every merge to `main`.

## Scaffolding a New Course

```
npx create-instrktr-course
```

Creates the full directory structure, a sample step, and the release workflow.
