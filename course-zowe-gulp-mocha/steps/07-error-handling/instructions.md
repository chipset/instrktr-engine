# Add Error Handling and Error-Path Tests

Right now, if Zowe CLI fails (wrong credentials, network timeout, element not found), the raw error from `execAsync` propagates. In a CI pipeline that produces confusing stack traces. Wrap each method to produce clear, actionable messages.

## Update `src/endevor.js`

Wrap each `execAsync` call in a try/catch:

```js
async listElements() {
  try {
    const { stdout } = await execAsync(
      `zowe endevor list elements ${this.buildBaseArgs()} --rfj`,
    );
    const result = JSON.parse(stdout);
    return result.data;
  } catch (err) {
    throw new Error(`Failed to list elements: ${err.stderr || err.message}`);
  }
}
```

Apply the same pattern to `retrieveElement` and `addElement`:

```js
async retrieveElement(name, type, outputPath) {
  try {
    await execAsync(`zowe endevor retrieve element ${name} ${this.buildBaseArgs()} --type ${type} --to-file ${outputPath}`);
  } catch (err) {
    throw new Error(`Failed to retrieve element "${name}": ${err.stderr || err.message}`);
  }
}

async addElement(name, type, sourceFile, ccid, comment) {
  try {
    await execAsync(
      `zowe endevor add element ${name} ${this.buildBaseArgs()} ` +
      `--type ${type} --from-file ${sourceFile} --ccid "${ccid}" --comment "${comment}"`,
    );
  } catch (err) {
    throw new Error(`Failed to add element "${name}": ${err.stderr || err.message}`);
  }
}
```

## Add error-path tests

Add these `describe` blocks to `test/endevor.test.js`:

```js
describe('listElements() — error handling', function () {
  it('throws a descriptive error when Zowe CLI fails', async function () {
    const fakeErr = Object.assign(new Error('Command failed'), {
      stderr: 'ENDEVOR0003E Authentication failed',
    });
    sinon.stub(childProcess, 'exec').yields(fakeErr, '', fakeErr.stderr);

    let caughtError;
    try {
      await service.listElements();
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).to.be.instanceOf(Error);
    expect(caughtError.message).to.include('Failed to list elements');
  });
});

describe('retrieveElement() — error handling', function () {
  it('throws a descriptive error when Zowe CLI fails', async function () {
    sinon.stub(childProcess, 'exec').yields(
      Object.assign(new Error('Command failed'), { stderr: 'Element not found' }),
      '',
      'Element not found',
    );

    let caughtError;
    try {
      await service.retrieveElement('MISSING', 'COBOL', 'dist/MISSING.cbl');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError.message).to.include('Failed to retrieve element');
    expect(caughtError.message).to.include('"MISSING"');
  });
});
```

## Run all tests

```bash
npx mocha test --recursive --timeout 5000
```

All existing and new tests should pass. Click **Check My Work** when done.
