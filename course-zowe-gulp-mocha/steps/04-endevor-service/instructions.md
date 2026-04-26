# Build the EndevorService Class

Instead of calling Zowe CLI directly from your Gulpfile, you will encapsulate it in an `EndevorService` class. This keeps Gulp tasks thin and makes every CLI call easy to test with Sinon stubs.

The skeleton in [src/endevor.js](open:src/endevor.js) already has the constructor and a `buildBaseArgs()` helper. Implement the three methods marked `TODO`.

## The interface

```js
class EndevorService {
  constructor(config)                                      // { instance, environment, system, subsystem, stageNumber }
  buildBaseArgs()                                          // returns the common CLI flags (done for you)
  async listElements()                                     // returns array of element objects
  async retrieveElement(name, type, outputPath)            // retrieves one element to a local file
  async addElement(name, type, sourceFile, ccid, comment)  // adds/updates an element in Endevor
}
```

## Zowe Endevor CLI commands to use

**List elements** — returns JSON when `--rfj` is passed:
```bash
zowe endevor list elements --instance ENDEVOR --environment DEV \
  --system MYAPP --subsystem MAIN --stage-number 1 --rfj
```
Parse `stdout` with `JSON.parse()` and return `result.data`.

**Retrieve an element** to a local file:
```bash
zowe endevor retrieve element HELLOPGM \
  --instance ENDEVOR --environment DEV --system MYAPP \
  --subsystem MAIN --stage-number 1 --type COBOL \
  --to-file dist/HELLOPGM.cbl
```

**Add/update an element** from a local file:
```bash
zowe endevor add element HELLOPGM \
  --instance ENDEVOR --environment DEV --system MYAPP \
  --subsystem MAIN --stage-number 1 --type COBOL \
  --from-file dist/HELLOPGM.cbl --ccid "DEVOPS" --comment "Automated deployment"
```

## Implementation pattern

```js
async listElements() {
  const { stdout } = await execAsync(
    `zowe endevor list elements ${this.buildBaseArgs()} --rfj`
  );
  const result = JSON.parse(stdout);
  return result.data;
}
```

Use the same `execAsync` approach for `retrieveElement` and `addElement` — they don't need to parse the output.

Click **Check My Work** when done.
