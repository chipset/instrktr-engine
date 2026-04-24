import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { CheckResult } from './types';
import { buildContext, TerminalAPI } from '../context/ValidatorContext';

const execFileAsync = promisify(execFile);

export class ValidatorRunner {
  constructor(private readonly _workspaceRoot: vscode.Uri) {}

  async run(validatorPath: string, terminal: TerminalAPI): Promise<CheckResult> {
    let fn: (ctx: ReturnType<typeof buildContext>) => Promise<CheckResult>;
    try {
      // Cache-bust so reloading a course picks up changes
      delete require.cache[require.resolve(validatorPath)];
      fn = require(validatorPath);
    } catch (err) {
      return { status: 'fail', message: `Could not load validator: ${err}` };
    }

    try {
      const ctx = buildContext(this._workspaceRoot, terminal);
      return await fn(ctx);
    } catch (err) {
      return { status: 'fail', message: `Validator threw an error: ${err}` };
    }
  }

  static buildTerminalAPI(workspaceRoot: vscode.Uri): TerminalAPI {
    const cwd = workspaceRoot.fsPath;
    return {
      async lastCommand() { return ''; },       // filled in Session 6
      async outputContains() { return false; }, // filled in Session 6
      async run(command) {
        try {
          // Split on first space so we can pass args array (avoids shell injection)
          const [cmd, ...args] = command.split(/\s+/);
          const { stdout } = await execFileAsync(cmd, args, { cwd });
          return { stdout: stdout.trim(), exitCode: 0 };
        } catch (err: unknown) {
          const execErr = err as { stdout?: string; stderr?: string; code?: number };
          return {
            stdout: (execErr.stdout ?? execErr.stderr ?? '').trim(),
            exitCode: execErr.code ?? 1,
          };
        }
      },
    };
  }
}
