import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { CheckResult, ExecError } from './types';
import { buildContext, TerminalAPI } from '../context/ValidatorContext';

const execFileAsync = promisify(execFile);
const VALIDATOR_TIMEOUT_MS = 30_000;

export class ValidatorRunner {
  constructor(private readonly _workspaceRoot: vscode.Uri) {}

  async run(validatorPath: string, terminal: TerminalAPI, stepIndex?: number): Promise<CheckResult> {
    if (validatorPath.endsWith('.sh')) {
      return this._runBash(validatorPath, stepIndex ?? 0);
    }
    return this._runJs(validatorPath, terminal);
  }

  private async _runBash(validatorPath: string, stepIndex: number): Promise<CheckResult> {
    if (process.platform === 'win32') {
      return {
        status: 'fail',
        message: 'Bash validators are not supported on Windows. Use a JS validator (validate.js) instead.',
      };
    }

    const courseDir = path.dirname(path.dirname(validatorPath)); // step dir → course dir
    const workspace = this._workspaceRoot.fsPath;
    const shell = process.env['SHELL'] ?? 'bash';

    const timeout = new Promise<CheckResult>((_, reject) =>
      setTimeout(
        () => reject(new Error('Validator timed out after 30 seconds.')),
        VALIDATOR_TIMEOUT_MS,
      ),
    );

    const run = new Promise<CheckResult>(async (resolve) => {
      try {
        const { stdout } = await execFileAsync(shell, [validatorPath], {
          cwd: courseDir,
          env: {
            ...process.env,
            INSTRKTR_WORKSPACE: workspace,
            INSTRKTR_STEP: String(stepIndex),
          },
        });
        resolve({ status: 'pass', message: stdout.trim() || 'Step complete!' });
      } catch (err: unknown) {
        const e = err as ExecError;
        const message = (e.stdout ?? e.stderr ?? String(err)).trim() || 'Check failed.';
        const exitCode = e.code ?? 1;
        const status = exitCode === 2 ? 'warn' : 'fail';
        resolve({ status, message });
      }
    });

    try {
      return await Promise.race([run, timeout]);
    } catch (err) {
      return { status: 'fail', message: String(err) };
    }
  }

  private async _runJs(validatorPath: string, terminal: TerminalAPI): Promise<CheckResult> {
    let fn: (ctx: ReturnType<typeof buildContext>) => Promise<CheckResult>;
    try {
      delete require.cache[require.resolve(validatorPath)];
      fn = require(validatorPath);
    } catch (err) {
      return { status: 'fail', message: `Could not load validator: ${err}` };
    }

    const timeout = new Promise<CheckResult>((_, reject) =>
      setTimeout(
        () => reject(new Error('Validator timed out after 30 seconds.')),
        VALIDATOR_TIMEOUT_MS,
      ),
    );

    try {
      const ctx = buildContext(this._workspaceRoot, terminal);
      return await Promise.race([fn(ctx), timeout]);
    } catch (err) {
      return { status: 'fail', message: String(err) };
    }
  }

  static buildTerminalAPI(workspaceRoot: vscode.Uri): TerminalAPI {
    const cwd = workspaceRoot.fsPath;
    return {
      async lastCommand() { return ''; },
      async outputContains() { return false; },
      async run(command) {
        try {
          const [cmd, ...args] = command.split(/\s+/);
          const { stdout, stderr } = await execFileAsync(cmd, args, { cwd });
          return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
        } catch (err: unknown) {
          const e = err as ExecError;
          return {
            stdout: (e.stdout ?? '').trim(),
            stderr: (e.stderr ?? '').trim(),
            exitCode: e.code ?? 1,
          };
        }
      },
    };
  }
}
