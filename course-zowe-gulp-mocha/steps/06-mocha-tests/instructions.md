# Test EndevorService with Mocha and Sinon

Your `EndevorService` methods call the Zowe CLI via `child_process.exec`. With Sinon you can replace that call with a stub that returns fake output — so tests run instantly without a mainframe connection.

## Create `test/endevor.test.js`

Open [test/endevor.test.js](open:test/endevor.test.js) and write:

```js
const sinon        = require('sinon');
const childProcess = require('child_process');
const { expect }   = require('chai');
const { EndevorService } = require('../src/endevor');

describe('EndevorService', function () {
  let service;

  beforeEach(function () {
    service = new EndevorService({
      instance:    'ENDEVOR',
      environment: 'DEV',
      system:      'MYAPP',
      subsystem:   'MAIN',
      stageNumber: '1',
    });
  });

  afterEach(function () {
    sinon.restore(); // remove all stubs after each test
  });

  // ── listElements ────────────────────────────────────────────────────────────

  describe('listElements()', function () {
    it('returns the data array from Zowe CLI output', async function () {
      const fakeOutput = JSON.stringify({
        data: [{ elmName: 'HELLOPGM' }, { elmName: 'WORLDPGM' }],
      });
      sinon.stub(childProcess, 'exec').yields(null, fakeOutput, '');

      const elements = await service.listElements();

      expect(elements).to.deep.equal([
        { elmName: 'HELLOPGM' },
        { elmName: 'WORLDPGM' },
      ]);
    });

    it('passes the correct Endevor location flags', async function () {
      sinon.stub(childProcess, 'exec').yields(null, JSON.stringify({ data: [] }), '');

      await service.listElements();

      const cmd = childProcess.exec.firstCall.args[0];
      expect(cmd).to.include('--instance ENDEVOR');
      expect(cmd).to.include('--environment DEV');
      expect(cmd).to.include('--system MYAPP');
      expect(cmd).to.include('--rfj');
    });
  });

  // ── retrieveElement ─────────────────────────────────────────────────────────

  describe('retrieveElement()', function () {
    it('calls zowe endevor retrieve with the element name and type', async function () {
      sinon.stub(childProcess, 'exec').yields(null, '', '');

      await service.retrieveElement('HELLOPGM', 'COBOL', 'dist/HELLOPGM.cbl');

      const cmd = childProcess.exec.firstCall.args[0];
      expect(cmd).to.include('retrieve element HELLOPGM');
      expect(cmd).to.include('--type COBOL');
      expect(cmd).to.include('--to-file dist/HELLOPGM.cbl');
    });
  });

  // ── addElement ──────────────────────────────────────────────────────────────

  describe('addElement()', function () {
    it('includes the ccid and comment in the CLI command', async function () {
      sinon.stub(childProcess, 'exec').yields(null, '', '');

      await service.addElement('HELLOPGM', 'COBOL', 'dist/HELLOPGM.cbl', 'DEVOPS', 'Automated update');

      const cmd = childProcess.exec.firstCall.args[0];
      expect(cmd).to.include('add element HELLOPGM');
      expect(cmd).to.include('--ccid "DEVOPS"');
      expect(cmd).to.include('--comment "Automated update"');
    });
  });
});
```

## Run your tests

```bash
npx mocha test --recursive --timeout 5000
```

All tests should pass. No z/OS connection is needed — Sinon intercepts every `exec` call before it reaches the shell.

Click **Check My Work** when done.
