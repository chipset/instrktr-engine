# Create Your First Gulpfile

Gulp 4 defines tasks as plain exported JavaScript functions. There is no separate "task registration" call — anything you export from `gulpfile.js` becomes an available task.

## Create `gulpfile.js`

Create [gulpfile.js](open:gulpfile.js) in your workspace root:

```js
const gulp = require('gulp');
const fs   = require('fs').promises;

async function hello() {
  console.log('Gulp is running!');
}

async function clean() {
  await fs.rm('dist', { recursive: true, force: true });
  console.log('dist/ cleaned.');
}

exports.hello   = hello;
exports.clean   = clean;
exports.default = hello;
```

## Run it

```bash
npx gulp hello
```

Expected output:

```
[HH:mm:ss] Using gulpfile .../gulpfile.js
[HH:mm:ss] Starting 'hello'...
Gulp is running!
[HH:mm:ss] Finished 'hello' after X ms
```

## List all tasks

```bash
npx gulp --tasks
```

This prints a tree of every exported task. You'll use this command to verify your setup in later steps.

Click **Check My Work** when done.
