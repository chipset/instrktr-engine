import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { Uri } from '../__mocks__/vscode';
import { ValidatorRunner } from '../engine/ValidatorRunner';

const terminalStub = {
  lastCommand: async () => '',
  outputContains: async () => false,
  run: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
};

async function makeValidator(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'instrktr-validator-'));
  const stepDir = path.join(root, 'steps', '01-test');
  await fs.mkdir(stepDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(stepDir, name), contents, 'utf8');
  }

  return {
    root,
    validatorPath: path.join(stepDir, 'validate.js'),
  };
}

describe('ValidatorRunner JS sandbox', () => {
  const cleanup: string[] = [];

  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('does not expose process or blocked built-in modules to validators', async () => {
    const { root, validatorPath } = await makeValidator({
      'validate.js': `
        module.exports = async function validate(context) {
          if (typeof process !== 'undefined') {
            return context.fail('process should not be exposed');
          }
          try {
            require('fs');
            return context.fail('fs should be blocked');
          } catch {}
          return context.pass('sandboxed');
        };
      `,
    });
    cleanup.push(root);

    const runner = new ValidatorRunner(Uri.file('/workspace') as never);
    await expect(runner.run(validatorPath, terminalStub, 0)).resolves.toEqual({
      status: 'pass',
      message: 'sandboxed',
    });
  });

  it('does not allow host-function constructor escapes through validator APIs', async () => {
    const { root, validatorPath } = await makeValidator({
      'validate.js': `
        module.exports = async function validate(context) {
          const probes = [
            () => require.constructor('return typeof process')(),
            () => context.pass.constructor('return typeof process')(),
            () => context.files.read.constructor('return typeof process')(),
            () => context.terminal.run.constructor('return typeof process')(),
          ];
          for (const probe of probes) {
            try {
              if (probe() !== 'undefined') {
                return context.fail('sandbox escape detected');
              }
            } catch {}
          }
          return context.pass('sealed');
        };
      `,
    });
    cleanup.push(root);

    const runner = new ValidatorRunner(Uri.file('/workspace') as never);
    await expect(runner.run(validatorPath, terminalStub, 0)).resolves.toEqual({
      status: 'pass',
      message: 'sealed',
    });
  });

  it('loads relative helper modules inside the same sandbox', async () => {
    const { root, validatorPath } = await makeValidator({
      'validate.js': `
        const helper = require('./helper');
        module.exports = async function validate(context) {
          return helper(context);
        };
      `,
      'helper.js': `
        module.exports = async function helper(context) {
          return context.pass(typeof process);
        };
      `,
    });
    cleanup.push(root);

    const runner = new ValidatorRunner(Uri.file('/workspace') as never);
    await expect(runner.run(validatorPath, terminalStub, 0)).resolves.toEqual({
      status: 'pass',
      message: 'undefined',
    });
  });
});
