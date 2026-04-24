# Validator API Reference

Validators can be written in **JavaScript** (`validate.js`) or **Bash** (`validate.sh`). Point to whichever you prefer in the `validator` field of `course.json`.

---

## Bash validators

Bash validators run from the **course directory** (not the workspace), so learners cannot tamper with the script. The learner's workspace is available via the `INSTRKTR_WORKSPACE` environment variable.

### Exit codes

| Exit code | Meaning |
|---|---|
| `0` | Pass — shows Next Step button |
| `1` | Fail — learner should try again |
| `2` | Warn — partially correct, lets learner proceed |

### Environment variables

| Variable | Value |
|---|---|
| `INSTRKTR_WORKSPACE` | Absolute path to the learner's workspace root |
| `INSTRKTR_STEP` | Current step index (0-based) |

### stdout

Whatever is printed to stdout becomes the message shown in the panel.

### Example

```bash
#!/bin/bash
# steps/01-init-repo/validate.sh

if [ ! -d "$INSTRKTR_WORKSPACE/.git" ]; then
  echo "No .git directory found. Run: git init"
  exit 1
fi

if ! grep -q "Initial commit" "$(git -C "$INSTRKTR_WORKSPACE" log --oneline 2>/dev/null)"; then
  echo "Repository initialized but no commits yet. Stage and commit your files."
  exit 2
fi

echo "Git repository initialized and first commit made."
exit 0
```

---

## JavaScript validators

Every step's `validate.js` exports a single async function that receives a `context` object.

## Signature

```js
module.exports = async function validate(context) {
  // ...
  return context.pass('Message shown to learner');
};
```

## Return Values

Always return one of:

| Method | Meaning |
|---|---|
| `context.pass(message)` | Step complete — shows Next Step button |
| `context.fail(message)` | Not done yet — learner should try again |
| `context.warn(message)` | Partially correct — lets learner proceed with a warning |

## `context.files`

### `files.exists(path)`
Returns `true` if the file or directory exists relative to the workspace root.

```js
const hasGit = await context.files.exists('.git');
```

### `files.read(path)`
Returns the file contents as a string. Throws if the file doesn't exist.

```js
const content = await context.files.read('src/index.js');
```

### `files.matches(path, pattern)`
Returns `true` if the file contents match the given RegExp. Returns `false` if the file doesn't exist.

```js
const ok = await context.files.matches('README.md', /## Installation/);
```

### `files.list(dirPath)`
Returns an array of filenames (not full paths) inside a directory relative to the workspace root. Returns an empty array if the directory doesn't exist.

```js
const entries = await context.files.list('src');
if (!entries.includes('index.js')) {
  return context.fail('Create src/index.js first.');
}
```

## `context.env`

### `env.get(name)`
Returns the value of an environment variable, or `undefined` if it isn't set.

```js
const apiKey = context.env.get('ZOWE_OPT_PASSWORD');
if (!apiKey) {
  return context.fail('ZOWE_OPT_PASSWORD is not set.');
}
```

## `context.terminal`

### `terminal.lastCommand()`
Returns the last command the learner ran in the Instrktr terminal.

```js
const cmd = await context.terminal.lastCommand();
if (!cmd.includes('git init')) {
  return context.warn('Try using the terminal command.');
}
```

### `terminal.outputContains(text)`
Returns `true` if the last command's output contained the given text.

```js
const passed = await context.terminal.outputContains('initialized empty');
```

### `terminal.run(command)`
Runs a command in the workspace and returns its output. Use this for validation checks (e.g. `git log`, `npm test`). Do not use for long-running processes. Times out after 30 seconds.

```js
const { stdout, stderr, exitCode } = await context.terminal.run('git log --oneline -1');
if (exitCode !== 0) {
  return context.fail('No commits found yet.');
}
```

`stderr` contains any error output from the command. Both `stdout` and `stderr` are strings.

## `context.workspace`

### `workspace.getConfig(key)`
Reads a VS Code setting from the `instrktr` namespace.

```js
const url = await context.workspace.getConfig('registryUrl');
```

## Full Example

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

  // 3. Verify they used the terminal
  const cmd = await context.terminal.lastCommand();
  if (!cmd.includes('npm init')) {
    return context.warn('Looks good! Next time try using `npm init -y` in the terminal.');
  }

  return context.pass('package.json created successfully!');
};
```
