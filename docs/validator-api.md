# Validator API Reference

Validators can be written in **JavaScript** (`validate.js`) or **Bash** (`validate.sh`). Both support the same pass / fail / warn outcomes and the same 30-second timeout. Use whichever fits your course best — bash is ideal for shell-native checks (git, file system, CLI tools), JavaScript for structured parsing (JSON, regex, multi-step logic).

---

## Bash validators

Bash validators run as a child process from the **course directory** — not the workspace. This means learners cannot edit or tamper with the script regardless of what access they have to their workspace.

### Contract

| | Detail |
|---|---|
| **Working directory** | Course directory (where `course.json` lives) |
| **Exit 0** | Pass — shows Next Step button |
| **Exit 1** | Fail — learner should try again |
| **Exit 2** | Warn — partially correct, learner can proceed |
| **stdout** | Becomes the message shown in the panel |
| **Timeout** | 30 seconds — script is killed and reported as fail |

### Environment variables

| Variable | Value |
|---|---|
| `INSTRKTR_WORKSPACE` | Absolute path to the learner's workspace root |
| `INSTRKTR_STEP` | Current step index (0-based integer) |

All other environment variables from the VS Code process are also available (`PATH`, `HOME`, etc.).

### Platform support

Bash validators are not supported on Windows. If a learner runs a course with a `.sh` validator on Windows, the check will return a `fail` with a message directing them to use a JS validator instead. If your course targets Windows learners, write validators in JavaScript.

### Shebang

Always include `#!/bin/bash` as the first line. On macOS the system `bash` is v3 — if you need arrays or associative arrays, add a dependency on `bash` 4+ or rewrite in JS.

### Minimal example

```bash
#!/bin/bash
# steps/01-install-flask/validate.sh

if ! python3 -c "import flask" 2>/dev/null; then
  echo "Flask is not installed. Run: pip install -r requirements.txt"
  exit 1
fi

VERSION=$(python3 -c "import flask; print(flask.__version__)")
echo "Flask ${VERSION} is installed."
exit 0
```

---

### Common patterns

#### Check a file exists

```bash
#!/bin/bash
if [ ! -f "$INSTRKTR_WORKSPACE/app.py" ]; then
  echo "Create app.py in the workspace root first."
  exit 1
fi
echo "app.py found."
exit 0
```

#### Check file content

```bash
#!/bin/bash
APP="$INSTRKTR_WORKSPACE/app.py"

if [ ! -f "$APP" ]; then
  echo "app.py not found."
  exit 1
fi

if ! grep -q "Flask(__name__)" "$APP"; then
  echo "app.py must create a Flask instance: app = Flask(__name__)"
  exit 1
fi

echo "Flask app created correctly."
exit 0
```

#### Run a CLI tool and inspect output

```bash
#!/bin/bash
cd "$INSTRKTR_WORKSPACE" || exit 1

LOG=$(git log --oneline 2>&1)
if [ $? -ne 0 ]; then
  echo "No git repository found. Run: git init"
  exit 1
fi

if [ -z "$LOG" ]; then
  echo "Repository initialized but no commits yet. Stage your files and commit."
  exit 1
fi

echo "Git repository has commits. Well done."
exit 0
```

#### Warn instead of fail

Use exit code `2` when the work is partially correct and the learner should be able to continue:

```bash
#!/bin/bash
REQS="$INSTRKTR_WORKSPACE/requirements.txt"

if [ ! -f "$REQS" ]; then
  echo "Create requirements.txt first."
  exit 1
fi

if ! grep -qi "flask" "$REQS"; then
  echo "requirements.txt exists but Flask is not listed as a dependency."
  exit 1
fi

if ! python3 -c "import flask" 2>/dev/null; then
  echo "requirements.txt looks correct, but Flask isn't installed yet. Run: pip install -r requirements.txt"
  exit 2
fi

echo "Flask is installed and listed in requirements.txt."
exit 0
```

#### Check JSON content with `jq`

```bash
#!/bin/bash
CONFIG="$INSTRKTR_WORKSPACE/zowe.config.json"

if [ ! -f "$CONFIG" ]; then
  echo "zowe.config.json not found."
  exit 1
fi

HOST=$(jq -r '.profiles.zosmf.properties.host // empty' "$CONFIG" 2>/dev/null)
if [ -z "$HOST" ]; then
  echo "zowe.config.json is missing the zosmf host. Check profiles.zosmf.properties.host."
  exit 1
fi

echo "Zowe config looks correct. Host: $HOST"
exit 0
```

#### Multi-check with specific failure messages

```bash
#!/bin/bash
WS="$INSTRKTR_WORKSPACE"

# 1. File must exist
if [ ! -f "$WS/app.py" ]; then
  echo "app.py not found."
  exit 1
fi

# 2. Must import statistics
if ! grep -q "import statistics" "$WS/app.py"; then
  echo "app.py must import the statistics module. Add: import statistics"
  exit 1
fi

# 3. Must define the /analyze route
if ! grep -q "'/analyze'" "$WS/app.py" && ! grep -q '"/analyze"' "$WS/app.py"; then
  echo "app.py must define an /analyze route."
  exit 1
fi

# 4. Syntax check
if ! python3 -m py_compile "$WS/app.py" 2>/dev/null; then
  echo "app.py has a syntax error. Fix it and try again."
  exit 1
fi

echo "app.py defines the /analyze route and passes syntax check."
exit 0
```

#### Check a directory structure

```bash
#!/bin/bash
WS="$INSTRKTR_WORKSPACE"

MISSING=""
[ ! -f "$WS/templates/index.html" ]   && MISSING="$MISSING templates/index.html"
[ ! -f "$WS/templates/results.html" ] && MISSING="$MISSING templates/results.html"

if [ -n "$MISSING" ]; then
  echo "Missing files:$MISSING"
  exit 1
fi

echo "Both templates are in place."
exit 0
```

---

### Tips

- **Always `cd "$INSTRKTR_WORKSPACE"` when running workspace-relative commands** like `git log`. Without it, git will look for a repo in the course directory.
- **Redirect stderr to `/dev/null`** on commands that emit noisy errors when they fail (`2>/dev/null`), then check the exit code separately.
- **Quote every path variable** — `"$INSTRKTR_WORKSPACE"` not `$INSTRKTR_WORKSPACE` — to handle spaces in paths.
- **Use `jq` for JSON, `python3 -c` for Python syntax checks** — both are widely available.
- **Keep stdout to one line** where possible. The panel renders it as plain text; long multi-line messages can overflow.

---

## JavaScript validators

Every step's `validate.js` exports a single async function that receives a `context` object.

### Signature

```js
module.exports = async function validate(context) {
  // ...
  return context.pass('Message shown to learner');
};
```

### Return values

Always return one of:

| Method | Meaning |
|---|---|
| `context.pass(message)` | Step complete — shows Next Step button |
| `context.fail(message)` | Not done yet — learner should try again |
| `context.warn(message)` | Partially correct — lets learner proceed with a warning |

---

### `context.files`

#### `files.exists(path)`
Returns `true` if the file or directory exists relative to the workspace root.

```js
const hasGit = await context.files.exists('.git');
```

#### `files.read(path)`
Returns the file contents as a string. Throws if the file doesn't exist.

```js
const content = await context.files.read('src/index.js');
```

#### `files.matches(path, pattern)`
Returns `true` if the file contents match the given RegExp. Returns `false` if the file doesn't exist.

```js
const ok = await context.files.matches('README.md', /## Installation/);
```

#### `files.list(dirPath)`
Returns an array of filenames (not full paths) inside a directory relative to the workspace root. Returns an empty array if the directory doesn't exist.

```js
const entries = await context.files.list('src');
if (!entries.includes('index.js')) {
  return context.fail('Create src/index.js first.');
}
```

---

### `context.env`

#### `env.get(name)`
Returns the value of an environment variable, or `undefined` if it isn't set.

```js
const apiKey = context.env.get('ZOWE_OPT_PASSWORD');
if (!apiKey) {
  return context.fail('ZOWE_OPT_PASSWORD is not set.');
}
```

---

### `context.terminal`

#### `terminal.lastCommand()`
Returns the last command the learner ran in the Instrktr terminal.

```js
const cmd = await context.terminal.lastCommand();
if (!cmd.includes('git init')) {
  return context.warn('Try using the terminal command.');
}
```

#### `terminal.outputContains(text)`
Returns `true` if the last command's output contained the given text.

```js
const passed = await context.terminal.outputContains('initialized empty');
```

#### `terminal.run(command)`
Runs a command in the workspace and returns its output. Use this for authoritative checks (`git log`, `npm test`, CLI tools). Do not use for long-running processes. Times out after 30 seconds.

```js
const { stdout, stderr, exitCode } = await context.terminal.run('git log --oneline -1');
if (exitCode !== 0) {
  return context.fail('No commits found yet.');
}
```

`stderr` contains any error output. Both `stdout` and `stderr` are trimmed strings.

Before a validator command runs, Instrktr asks the learner for permission. The prompt explains what the command is checking, shows the exact command and working directory, and offers **Allow Once**, **Always Allow**, or **Deny**. Always-allow decisions are scoped to the exact normalized command, course, step, source, and workspace directory.

Workspace file checks such as `context.files.exists('package.json')` do not prompt because they are already constrained to the workspace root and cannot inspect paths outside it.

---

### `context.workspace`

#### `workspace.getConfig(key)`
Reads a VS Code setting from the `instrktr` namespace.

```js
const url = await context.workspace.getConfig('registryUrl');
```

---

### Full JavaScript example

```js
module.exports = async function validate(context) {
  // 1. Check the file exists
  if (!await context.files.exists('package.json')) {
    return context.fail('No package.json found. Run `npm init -y` first.');
  }

  // 2. Check the content is valid JSON with a "name" field
  const raw = await context.files.read('package.json');
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    return context.fail('package.json is not valid JSON.');
  }

  if (!pkg.name) {
    return context.warn('package.json exists but has no "name" field.');
  }

  // 3. Verify the install actually ran
  const { exitCode } = await context.terminal.run('node -e "require(\'express\')"');
  if (exitCode !== 0) {
    return context.warn('package.json looks good, but dependencies are not installed. Run: npm install');
  }

  return context.pass('package.json created and dependencies installed!');
};
```

---

## Choosing between Bash and JavaScript

| Use Bash when… | Use JavaScript when… |
|---|---|
| Checking file existence or content with shell tools | Parsing JSON, YAML, or structured file formats |
| Running CLI tools (`git`, `pip`, `jq`, `curl`) | Using regex with capture groups |
| Checking environment setup | Performing multi-step async logic |
| The course is shell/DevOps focused | The course is Node.js / frontend focused |
| You want the simplest possible validator | You need `warn` with complex conditions |

Both support the same 30-second timeout, pass/fail/warn outcomes, and the same message display in the panel.
