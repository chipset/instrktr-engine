import * as path from 'path';
import * as fs from 'fs/promises';
import * as vm from 'vm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { CheckResult, ExecError } from './types';
import { buildContext, TerminalAPI } from '../context/ValidatorContext';

// Modules a course validator must never be able to load.
const BLOCKED_MODULES = new Set([
  'child_process', 'cluster', 'dgram', 'dns',
  'fs', 'fs/promises', 'node:fs', 'node:fs/promises',
  'http', 'http2', 'https', 'net',
  'node:child_process', 'node:http', 'node:http2', 'node:https', 'node:net',
  'readline', 'tls', 'worker_threads',
  'node:readline', 'node:tls', 'node:worker_threads',
]);

const execFileAsync = promisify(execFile);
const VALIDATOR_TIMEOUT_MS = 30_000;

/** Split a command string into [cmd, ...args] honouring single- and double-quoted tokens. */
function parseCommand(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (const ch of command.trim()) {
    if (ch === "'" && !inDouble) { inSingle = !inSingle; }
    else if (ch === '"' && !inSingle) { inDouble = !inDouble; }
    else if (ch === ' ' && !inSingle && !inDouble) {
      if (current) { args.push(current); current = ''; }
    } else { current += ch; }
  }
  if (current) { args.push(current); }
  return args;
}

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
            // Minimal environment: only what validators legitimately need.
            // Deliberately excludes tokens, secrets, and other process env vars.
            PATH: process.env['PATH'] ?? '/usr/local/bin:/usr/bin:/bin',
            HOME: process.env['HOME'] ?? '',
            LANG: process.env['LANG'] ?? '',
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
      const src = await fs.readFile(validatorPath, 'utf8');
      const validatorDir = path.dirname(validatorPath);

      // Build a require that blocks dangerous built-in modules.
      const safeRequire = Object.assign(
        (id: string) => {
          if (BLOCKED_MODULES.has(id)) {
            throw new Error(`Validator cannot require('${id}') — blocked for security.`);
          }
          const resolved = id.startsWith('.') ? path.resolve(validatorDir, id) : id;
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require(resolved);
        },
        { resolve: require.resolve, main: require.main, cache: require.cache },
      );

      const mod = { exports: {} as Record<string, unknown> };
      // vm.runInThisContext gives the script the current global (process, Buffer, etc.)
      // but injects our safeRequire so the module-level require is intercepted.
      const wrapper = vm.runInThisContext(
        `(function(require, module, exports, __filename, __dirname) { ${src}\n })`,
        { filename: validatorPath },
      );
      wrapper(safeRequire, mod, mod.exports, validatorPath, validatorDir);
      fn = mod.exports as typeof fn;
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
          const [cmd, ...args] = parseCommand(command);
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
