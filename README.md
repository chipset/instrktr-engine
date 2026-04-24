# Instrktr

Run hands-on coding courses directly inside VS Code — no browser tab switching, no VMs, no setup friction.

## What it does

The Instrktr is a runtime that loads interactive courses into your editor. Each course is a sequence of steps with:

- **Instructions** rendered as formatted Markdown in the sidebar
- **Validators** that check your work against the real state of the workspace
- **Starter files** scaffolded automatically when a step begins
- **Hints** available on demand

Your progress is saved locally and synced across devices via GitHub Gist (optional, requires sign-in).

## Getting started

1. Open the **Instrktr** panel in the activity bar (the ▶ icon)
2. Browse and install a course from the catalog
3. Work through each step in your editor
4. Click **Check Work** when you think you're done

## Installing courses

Click **Browse Courses** in the Instrktr panel to open the catalog. Install any course with one click — it downloads automatically from GitHub.

To run a course you're authoring locally, use the command palette:

```
Instrktr: Open Local Course Folder
```

This opens the course in **dev watch mode** — the panel reloads automatically whenever you save a course file.

## Authoring courses

Courses are plain GitHub repos with a `course.json` manifest and step folders:

```
course-my-topic/
├── course.json
└── steps/
    ├── 01-first-step/
    │   ├── instructions.md
    │   ├── starter/        ← files copied into workspace
    │   └── validate.js     ← checks learner's work
    └── 02-second-step/
        └── ...
```

Validators receive a `context` object:

```js
module.exports = async function validate(context) {
  if (!await context.files.exists('src/index.js')) {
    return context.fail('Create src/index.js first.');
  }
  const src = await context.files.read('src/index.js');
  if (!src.includes('export default')) {
    return context.warn('File found, but nothing is exported yet.');
  }
  return context.pass('Looks great!');
};
```

See the [Validator API reference](docs/validator-api.md) for the full API.

## Scaffold a new course

```
npx create-instrktr-course
```

Creates a complete course skeleton with a GitHub Actions release workflow.

## Progress sync

Sign in with GitHub (**Instrktr: Sign in with GitHub**) to sync your progress across machines via a private GitHub Gist. Your data is stored in your own account — the extension never sends it anywhere else.

## Commands

| Command | Description |
|---|---|
| `Instrktr: Browse Courses` | Open the course catalog |
| `Instrktr: Open Local Course Folder` | Load a local course (dev mode) |
| `Instrktr: Refresh Course Catalog` | Force-refresh the registry |
| `Instrktr: Restart Course` | Reset progress for the active course |
| `Instrktr: Sign in with GitHub` | Enable cross-device sync |
| `Instrktr: Sign out of GitHub` | Disconnect GitHub account |

## Requirements

- VS Code 1.93 or later
- Node.js is **not** required — validators run in the extension host

## License

MIT
