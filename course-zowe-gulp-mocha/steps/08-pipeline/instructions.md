# Build the Deployment Pipeline

In this final step you will assemble all your Gulp tasks into a single `deploy` pipeline using `gulp.series()`.

## The pipeline

```
deploy
  └── series
       ├── clean             clear dist/ before starting
       ├── listElements      verify the element exists in Endevor
       ├── retrieveElement   pull the latest source from Endevor
       ├── runTests          run Mocha — fail fast if anything is broken
       └── addElement        push the processed source back to Endevor
```

## Add a `clean` task

Replace the placeholder `clean` from step 2 with one that recreates `dist/`:

```js
const fs = require('fs').promises;

async function clean() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log('dist/ cleaned.');
}
```

## Add a `runTests` task

Run Mocha from inside Gulp so test failures abort the pipeline:

```js
const { promisify } = require('util');
const { exec }      = require('child_process');
const execAsync     = promisify(exec);

async function runTests() {
  const { stdout } = await execAsync('npx mocha test --recursive --timeout 5000');
  console.log(stdout);
}
```

## Wire everything together

```js
const deploy = gulp.series(clean, listElements, retrieveElement, runTests, addElement);

exports.clean           = clean;
exports.listElements    = listElements;
exports.retrieveElement = retrieveElement;
exports.runTests        = runTests;
exports.addElement      = addElement;
exports.deploy          = deploy;
exports.default         = deploy;
```

## Verify

```bash
npx gulp --tasks
```

You should see the `deploy` task with its series chain listed below it:

```
[HH:mm:ss] Tasks for .../gulpfile.js
[HH:mm:ss] ├── clean
[HH:mm:ss] ├── listElements
[HH:mm:ss] ├── retrieveElement
[HH:mm:ss] ├── runTests
[HH:mm:ss] ├── addElement
[HH:mm:ss] └─┬ deploy
[HH:mm:ss]   └─┬ <series>
[HH:mm:ss]     ├── clean
[HH:mm:ss]     ├── listElements
[HH:mm:ss]     ├── retrieveElement
[HH:mm:ss]     ├── runTests
[HH:mm:ss]     └── addElement
```

Run `npx mocha test --recursive` one final time to confirm all tests still pass, then click **Check My Work**.
