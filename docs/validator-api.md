# Validator API Reference

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
Runs a command in the workspace and returns its output. Use this for validation checks (e.g. `git log`, `npm test`). Do not use for long-running processes.

```js
const { stdout, exitCode } = await context.terminal.run('git log --oneline -1');
if (exitCode !== 0) {
  return context.fail('No commits found yet.');
}
```

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
