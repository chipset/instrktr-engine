# Promises and async/await

Every Zowe CLI call in the main course uses `async/await`. This step explains why that is — and what is happening underneath.

## The problem: callbacks

Node.js was built around callbacks — functions passed as arguments that run when an operation completes:

```js
const { exec } = require('child_process');

exec('echo hello', (err, stdout) => {
  if (err) { console.error(err); return; }
  console.log(stdout);
});
```

Callbacks become hard to read when chained. Promises and async/await solve this.

## Promises

A **Promise** represents a value that will be available later. You create one like this:

```js
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

`resolve` is called when the async work is done.

## async / await

Mark a function `async` and you can `await` any Promise inside it:

```js
async function runPipeline() {
  console.log('Starting…');
  await delay(1000);             // waits 1 second
  console.log('Step 1 done.');
  await delay(500);
  console.log('Step 2 done.');
}

runPipeline();
```

`await` pauses only the `async` function — the rest of Node.js keeps running.

## `util.promisify`

The `child_process.exec` callback style can be converted to a Promise automatically:

```js
const { exec }      = require('child_process');
const { promisify } = require('util');
const execAsync     = promisify(exec);

async function runCommand(cmd) {
  const { stdout } = await execAsync(cmd);
  return stdout.trim();
}
```

This is exactly the pattern used in `EndevorService`.

## The exercise

Open [async-demo.js](open:async-demo.js). Fill in:

1. A `delay(ms)` function that returns a Promise resolving after `ms` milliseconds
2. An `async function runSteps()` that:
   - Logs `"Step 1: listing elements…"`
   - Awaits `delay(200)`
   - Logs `"Step 2: retrieving element…"`
   - Awaits `delay(200)`
   - Logs `"Done."`
3. A call to `runSteps()` at the bottom

Run it: `node async-demo.js`

Expected output (with a short pause between each line):
```
Step 1: listing elements…
Step 2: retrieving element…
Done.
```

Click **Check My Work** when done.
