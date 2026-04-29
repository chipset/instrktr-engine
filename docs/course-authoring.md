# Course Authoring Guide

## Directory Structure

Each course is a standalone GitHub repo with this layout:

```
course-my-topic/
├── course.json                    # course manifest
├── steps/
│   ├── 01-first-step/
│   │   ├── instructions.md        # step content (Markdown)
│   │   ├── validate.js            # JS checker  ─┐ use one or the other
│   │   ├── validate.sh            # Bash checker ─┘
│   │   ├── starter/               # files copied into workspace on step entry (optional)
│   │   └── solution/              # reference solution shown on fail/warn (optional)
│   └── 02-second-step/
│       └── ...
└── .github/
    └── workflows/
        └── release.yml            # auto-tags on merge to main
```

---

## `course.json`

```json
{
  "id": "git-basics",
  "title": "Git Fundamentals",
  "version": "1.0.0",
  "engineVersion": ">=0.3.5",
  "steps": [
    {
      "id": "init-repo",
      "title": "Initialize a Repository",
      "instructions": "steps/01-init-repo/instructions.md",
      "hints": ["Run git init in the terminal.", "Check for a .git directory after running the command."],
      "starter": "steps/01-init-repo/starter",
      "solution": "steps/01-init-repo/solution",
      "validator": "steps/01-init-repo/validate.sh"
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
| `hints` | | Array of hint strings revealed one at a time by the learner |
| `validator` | | Path to `validate.js` or `validate.sh`. If omitted, step auto-passes |
| `starter` | | Path to a folder whose contents are copied into the workspace when the step begins |
| `solution` | | Path to a folder with reference files. Shown as a diff when a check fails or warns |

> **Reserved step ID.** Instrktr automatically prepends a built-in trust-and-sandbox acknowledgment step (ID `__instrktr_trust_ack__`) at index 0 of every loaded course. Do not author a step with that ID — it will be ignored. Your steps are presented to learners starting at index 1.

---

## Writing Instructions

Instructions are standard Markdown. Two special link syntaxes are supported:

### Open-file links

Use `open:` links to give learners a one-click shortcut to open a specific file in the editor:

```markdown
Edit [app.py](open:app.py) to add the route.
```

The path is relative to the workspace root. These render as styled file chips in the panel — clicking one opens the file directly in the VS Code editor.

### Regular links

Normal `https://` links open in the system browser as usual.

### Fenced code blocks

Standard Markdown **fenced** blocks (triple backticks) render with a **Copy** button in the Active Course panel. Learners click **Copy** and paste into the editor, a new file, or an external terminal. You do not add any special syntax for the button — only normal Markdown fences in `instructions.md`.

**What gets a Copy button:** fenced blocks only. Inline `` `code` `` in a sentence does not.

### Syntax highlighting

Instrktr highlights **fenced** code in the Active Course panel using [highlight.js](https://highlightjs.org/). Highlighting is automatic whenever you put a **language identifier** on the **opening** fence line, right after the opening backticks.

**Format (required for highlighting):**

````markdown
```bash
echo "hello"
```
````

Rules:

1. **Opening fence only** — put the language tag on the first line (` ```bash `). The closing fence is plain ` ``` ` (no tag).
2. **One word for the language** — use the usual short name: `bash`, `sh`, `yaml`, `json`, `javascript` / `js`, `typescript` / `ts`, `python`, `java`, `sql`, `xml`, `html`, `css`, `dockerfile`, `diff`, `plaintext`, `text`, etc. Extra words on the same line (e.g. editor metadata) are ignored; only the first token is used.
3. **Case** — prefer lowercase tags (`yaml` not `YAML`); common names are recognized as highlight.js defines them.
4. **Unknown or missing language** — if the tag is empty or not a known grammar, Instrktr still shows the block and **Copy**, and picks highlighting with **auto-detection** (best-effort).
5. **Not highlighted** — single-backtick **inline** code, and indented code blocks (if you use them), are not passed through the highlighter the same way; prefer triple-backtick fences for anything you want colored.

The panel theme uses VS Code–aware colors (`highlight-instrktr.css`) so highlighting stays readable in light and dark themes.

#### Example: command learners should run

Write this in `instructions.md`:

````markdown
From the project root, run:

```bash
npm install && npm test
```

If `npm` is not on your PATH, use the full path your instructor shared.
````

Learners see the shell block with **Copy** and can paste the exact command.

#### Example: multi-line config or manifest

````markdown
Add a `docker-compose.yml` with this service definition:

```yaml
services:
  app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: npm run dev
```
````

Optional **language tags** control **syntax highlighting** in the panel and help readers in the source; the **Copy** button always copies the plain text of the block (no HTML markup).

#### Example: longer snippet (workshop / mainframe-adjacent flows)

````markdown
Paste this JCL-style job card into your editor and adjust the job name:

```text
//MYJOB   JOB (ACCT),'TRAINING',CLASS=A,MSGCLASS=X
//STEP1   EXEC PGM=IEFBR14
//SYSPRINT DD SYSOUT=*
```

Then save as `hello.jcl` in the workspace root.
````

Use a language tag that matches what learners expect (`text`, `jcl`, `sh`, etc.). Unknown tags still get a **Copy** button and **auto-detected** highlighting when possible.

### Images in instructions

Place image files **inside the course repository** (for example next to the step under `steps/01-intro/assets/`) and reference them with a path **relative to the course root** (the folder that contains `course.json`):

```markdown
![Architecture overview](steps/01-intro/assets/overview.png)
```

- **`https:` / `http:`** image URLs are allowed unchanged (useful for hosted diagrams).
- **`data:`** URIs are passed through as-is.
- Paths that try to leave the course pack with `..` segments are **not** rewritten and stay broken by design.

Keep assets small; prefer PNG or SVG for clarity in the narrow sidebar.

---

## Starter Files

Files in the `starter/` folder are copied into the workspace root when a learner enters the step. Use them to scaffold boilerplate the learner doesn't need to write themselves.

- Copying is **additive** — existing workspace files are never overwritten
- Subdirectory structure is preserved: `starter/src/index.js` → workspace `src/index.js`
- If a file already exists (learner has modified it), it is skipped and the learner is notified
- If no `starter` is set, the workspace is left as-is from the previous step
- Symlinks inside `starter/` are skipped and never followed — do not use symlinks to reference shared assets

---

## Solution Files

Files in the `solution/` folder mirror the workspace structure and represent the correct end state for the step:

```
solution/
└── src/
    └── index.js    # shown as diff against workspace src/index.js
```

When a validator returns `fail` or `warn`, a **↕ Compare with Solution** button appears in the panel. Clicking it opens VS Code's diff editor for each file in the solution folder (left = learner's file, right = solution). Multiple files open as separate diff tabs.

Solution files are included in the downloaded course package but are not surfaced to the learner unless a check fails.

---

## Writing Validators

Every step can have one validator — either a JavaScript file or a Bash script. Both produce the same pass / fail / warn outcomes in the panel.

### When to use Bash (`validate.sh`)

Bash is the right choice for:
- Courses that teach shell workflows (git, CLI tools, DevOps)
- Checks that are naturally one-liners (`grep`, `test`, `jq`)
- Running external programs and checking their output or exit code
- Environments where you want the simplest possible validator

Bash validators run from the **course directory**, so learners cannot tamper with or fake the script. The learner's workspace is always available via `$INSTRKTR_WORKSPACE`.

```bash
#!/bin/bash
# steps/01-init-repo/validate.sh

cd "$INSTRKTR_WORKSPACE" || exit 1

if [ ! -d ".git" ]; then
  echo "No .git directory found. Run: git init"
  exit 1
fi

COMMITS=$(git log --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "$COMMITS" -eq 0 ]; then
  echo "Repository initialized, but no commits yet. Stage your files and commit."
  exit 2
fi

echo "Git repository initialized with ${COMMITS} commit(s)."
exit 0
```

Exit codes: `0` = pass, `1` = fail, `2` = warn. Whatever is printed to stdout becomes the panel message.

### When to use JavaScript (`validate.js`)

JavaScript is the right choice for:
- Courses that teach Node.js, web development, or structured data formats
- Parsing JSON, YAML, or regex with capture groups
- Multi-step async checks with complex branching logic
- Using the full `context` API (`files.list()`, `env.get()`, `workspace.getConfig()`)

```js
// steps/02-create-app/validate.js
module.exports = async function validate(context) {
  if (!await context.files.exists('app.py')) {
    return context.fail('app.py not found. Create it in the workspace root.');
  }

  const src = await context.files.read('app.py');
  if (!src.includes('Flask(__name__)')) {
    return context.fail('app.py must create a Flask instance: app = Flask(__name__)');
  }

  const { exitCode } = await context.terminal.run(
    'python3 -c "import ast; ast.parse(open(\'app.py\').read())"'
  );
  if (exitCode !== 0) {
    return context.fail('app.py has a syntax error.');
  }

  return context.pass('Flask app created correctly.');
};
```

See [validator-api.md](./validator-api.md) for the complete API reference, all bash patterns, and a comparison guide.

### Validator tips

- **Prefer authoritative checks over terminal history.** Run `git log` yourself rather than checking what the learner typed — it's more reliable and unfakeable.
- **Use `warn` for "almost right".** It lets the learner proceed without blocking them on style issues.
- **Use `fail` only when the work is genuinely incomplete.** Avoid false negatives that frustrate learners who solved it differently.
- **Give actionable messages.** Tell the learner exactly what to do — the exact command or the exact line to change.
- **In bash, always quote `"$INSTRKTR_WORKSPACE"`** to handle paths with spaces.
- **In bash, `cd "$INSTRKTR_WORKSPACE"` before running workspace-relative commands** like `git log`.

---

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

Each entry maps an old step ID (from the version listed) to the new step ID. Learners whose progress was on `old-step-id` will resume from `new-step-id`.

---

## Publishing

1. Bump `version` in `course.json`
2. Commit and push to `main` — the included `release.yml` GitHub Actions workflow auto-tags and creates a GitHub Release
3. Add or update the course entry in your registry's `registry.json`:

```json
{
  "id": "git-basics",
  "title": "Git Fundamentals",
  "description": "Learn the core Git workflow: init, commit, branch, and merge.",
  "repo": "your-org/course-git-basics",
  "latestVersion": "1.1.0",
  "tags": ["git", "beginner"]
}
```

The `repo` field must be exactly `owner/name` — no protocol prefix, no `.git` suffix, no slashes within each segment.

Instrktr downloads courses using `git clone --depth 1 --branch v{version}` when `git` is available, then removes the `.git` directory. If git is not installed, it falls back to:
```
https://github.com/{repo}/archive/refs/tags/v{latestVersion}.zip
```

---

## Scaffolding a New Course

```
npx create-instrktr-course
```

Creates the full directory structure, a sample step with both `validate.js` and `validate.sh` examples, and the `release.yml` workflow.
