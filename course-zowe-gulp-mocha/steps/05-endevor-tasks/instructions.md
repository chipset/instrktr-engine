# Wire Endevor Into Gulp

Now that `EndevorService` is in place, update [gulpfile.js](open:gulpfile.js) to add Endevor-powered tasks.

## Import the service and configure it

Add this near the top of your gulpfile, after the `require('gulp')` line:

```js
const path = require('path');
const fs   = require('fs').promises;
const { EndevorService } = require('./src/endevor');

const OUTPUT_DIR = 'dist';

const service = new EndevorService({
  instance:    process.env.ENDEVOR_INSTANCE    || 'ENDEVOR',
  environment: process.env.ENDEVOR_ENV         || 'DEV',
  system:      process.env.ENDEVOR_SYSTEM      || 'MYAPP',
  subsystem:   process.env.ENDEVOR_SUBSYSTEM   || 'MAIN',
  stageNumber: process.env.ENDEVOR_STAGE       || '1',
});

const ELEMENT_NAME = process.env.ELEMENT_NAME || 'HELLOPGM';
const ELEMENT_TYPE = process.env.ELEMENT_TYPE || 'COBOL';
```

Reading from environment variables means you can point the same pipeline at `DEV`, `TEST`, or `PROD` without editing the file.

## Add three Endevor tasks

```js
async function listElements() {
  const elements = await service.listElements();
  console.log(`Found ${elements.length} element(s):`);
  elements.forEach(el => console.log(`  ${el.elmName}`));
}

async function retrieveElement() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.retrieveElement(ELEMENT_NAME, ELEMENT_TYPE, outFile);
  console.log(`Retrieved ${ELEMENT_NAME} → ${outFile}`);
}

async function addElement() {
  const sourceFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.addElement(ELEMENT_NAME, ELEMENT_TYPE, sourceFile, 'DEVOPS', 'Automated update');
  console.log(`Pushed ${ELEMENT_NAME} to Endevor`);
}
```

## Export the new tasks

```js
exports.listElements    = listElements;
exports.retrieveElement = retrieveElement;
exports.addElement      = addElement;
```

Keep your existing `clean`, `hello`, and `default` exports in place.

## Verify

```bash
npx gulp --tasks
```

You should now see `listElements`, `retrieveElement`, and `addElement` in the list.

Click **Check My Work** when done.
