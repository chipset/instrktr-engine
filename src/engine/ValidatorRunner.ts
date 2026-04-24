import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { CheckResult } from './types';
import { buildContext, TerminalAPI } from '../context/ValidatorContext';

const execFileAsync = promisify(execFile);
const VALIDATOR_TIMEOUT_MS = 30_000;

export class ValidatorRunner {
  constructor(private readonly _workspaceRoot: vscode.Uri) {}

  async run(validatorPath: string, terminal: TerminalAPI): Promise<CheckResult> {
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
          const { stdout, stderr } = await execFileAsync(cmd, args, { cwd, shell: true });
          return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
        } catch (err: unknown) {
          const e = err as { stdout?: string; stderr?: string; code?: number };
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
