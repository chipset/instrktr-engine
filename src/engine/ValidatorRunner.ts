import * as path from 'path';
import * as fs from 'fs/promises';
import * as vm from 'vm';
import * as vscode from 'vscode';
import { CheckResult } from './types';
import { buildContext, TerminalAPI } from '../context/ValidatorContext';
import {
  AllowAllCommandPermissionService,
  CommandPermissionService,
  SecureCommandRunner,
} from '../security/SecureCommandRunner';
import { logValidatorCommandDebug } from '../logger';

// Modules a course validator must never be able to load.
// Critical: 'module' exposes Module._load which bypasses safeRequire entirely.
// Critical: 'vm' lets a validator run unrestricted code in a new context.
const BLOCKED_MODULES = new Set([
  'child_process', 'cluster', 'dgram', 'dns',
  'fs', 'fs/promises', 'node:fs', 'node:fs/promises',
  'http', 'http2', 'https', 'net',
  'node:child_process', 'node:cluster', 'node:dgram', 'node:dns',
  'node:http', 'node:http2', 'node:https', 'node:net',
  'inspector', 'node:inspector',
  'module', 'node:module',
  'os', 'node:os',
  'readline', 'tls', 'worker_threads',
  'node:readline', 'node:tls', 'node:worker_threads',
  'repl', 'node:repl',
  'v8', 'node:v8',
  'vm', 'node:vm',
]);

const VALIDATOR_TIMEOUT_MS = 30_000;

export class ValidatorRunner {
  private readonly _commandRunner: SecureCommandRunner;

  constructor(
    private readonly _workspaceRoot: vscode.Uri,
    permissions: CommandPermissionService = new AllowAllCommandPermissionService(),
  ) {
    this._commandRunner = new SecureCommandRunner(permissions);
  }

  async run(
    validatorPath: string,
    terminal: TerminalAPI,
    stepIndex?: number,
    courseId?: string,
    stepId?: string,
  ): Promise<CheckResult> {
    if (validatorPath.endsWith('.sh')) {
      return this._runBash(validatorPath, stepIndex ?? 0, courseId, stepId);
    }
    logValidatorCommandDebug(
      `js-validator path=${JSON.stringify(validatorPath)} course=${courseId ?? '<none>'} step=${stepId ?? '<none>'}`,
    );
    return this._runJs(validatorPath, terminal, courseId, stepId);
  }

  private async _runBash(
    validatorPath: string,
    stepIndex: number,
    courseId?: string,
    stepId?: string,
  ): Promise<CheckResult> {
    if (process.platform === 'win32') {
      logValidatorCommandDebug(`bash-validator unsupported platform=win32 path=${JSON.stringify(validatorPath)}`);
      return {
        status: 'fail',
        message: 'Bash validators are not supported on Windows. Use a JS validator (validate.js) instead.',
      };
    }

    const courseDir = path.dirname(path.dirname(validatorPath)); // step dir → course dir

    // Defense-in-depth: _safeCourseJoin in StepRunner is the primary guard, but
    // re-validate here so _runBash is safe even if called from another code path.
    const resolvedScript = path.resolve(validatorPath);
    const resolvedCourseDir = path.resolve(courseDir);
    if (!resolvedScript.startsWith(resolvedCourseDir + path.sep)) {
      logValidatorCommandDebug(`bash-validator blocked reason=outside-course path=${JSON.stringify(validatorPath)}`);
      return { status: 'fail', message: 'Validator path is outside the course directory.' };
    }

    const workspace = this._workspaceRoot.fsPath;
    const shell = process.env['SHELL'] ?? 'bash';
    const command = `${shell} "${validatorPath}"`;
    logValidatorCommandDebug(
      `bash-validator path=${JSON.stringify(validatorPath)} cwd=${JSON.stringify(courseDir)} command=${JSON.stringify(command)} course=${courseId ?? '<none>'} step=${stepId ?? '<none>'}`,
    );

    const timeout = new Promise<CheckResult>((_, reject) =>
      setTimeout(
        () => reject(new Error('Validator timed out after 30 seconds.')),
        VALIDATOR_TIMEOUT_MS,
      ),
    );

    const run = (async (): Promise<CheckResult> => {
      const result = await this._commandRunner.run({
        command,
        cwd: courseDir,
        source: 'bashValidator',
        courseId,
        stepId,
        validatorPath,
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
      if (result.exitCode === 0) {
        const stdout = result.stdout;
        return { status: 'pass', message: stdout.trim() || 'Step complete!' };
      }

      const message = (result.stdout || result.stderr).trim() || 'Check failed.';
      const status = result.exitCode === 2 ? 'warn' : 'fail';
      return { status, message };
    })();

    try {
      return await Promise.race([run, timeout]);
    } catch (err) {
      return { status: 'fail', message: String(err) };
    }
  }

  private async _runJs(
    validatorPath: string,
    terminal: TerminalAPI,
    courseId?: string,
    stepId?: string,
  ): Promise<CheckResult> {
    let fn: (ctx: ReturnType<typeof buildContext>) => Promise<CheckResult>;
    try {
      const src = await fs.readFile(validatorPath, 'utf8');
      const validatorDir = path.dirname(validatorPath);

      // Build a require that blocks dangerous built-in modules.
      // cache is intentionally omitted — exposing require.cache would allow
      // a validator to poison modules for subsequent require() calls.
      const safeRequire = Object.assign(
        (id: string) => {
          if (BLOCKED_MODULES.has(id)) {
            throw new Error(`Validator cannot require('${id}') — blocked for security.`);
          }
          const resolved = id.startsWith('.') ? path.resolve(validatorDir, id) : id;
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require(resolved);
        },
        { resolve: require.resolve, main: require.main },
      );

      const mod = { exports: {} as Record<string, unknown> };
      // vm.runInThisContext gives the script the current global (process, Buffer, etc.)
      // but injects our safeRequire so the module-level require is intercepted.
      const wrapper = vm.runInThisContext(
        `(function(require, module, exports, __filename, __dirname) { ${src}\n })`,
        { filename: validatorPath },
      );
      wrapper(safeRequire, mod, mod.exports, validatorPath, validatorDir);
      fn = mod.exports as unknown as typeof fn;
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
      const cwd = this._workspaceRoot.fsPath;
      const scopedTerminal: TerminalAPI = {
        lastCommand: () => terminal.lastCommand(),
        outputContains: (text: string) => terminal.outputContains(text),
        run: (command: string) => this._commandRunner.run({
          command,
          cwd,
          source: 'terminal.run',
          courseId,
          stepId,
          validatorPath,
        }),
        runShell: (command: string) => this._commandRunner.runShell({
          command,
          cwd,
          source: 'terminal.runShell',
          courseId,
          stepId,
          validatorPath,
        }),
      };
      const ctx = buildContext(this._workspaceRoot, scopedTerminal);
      return await Promise.race([fn(ctx), timeout]);
    } catch (err) {
      return { status: 'fail', message: String(err) };
    }
  }

  static buildTerminalAPI(
    workspaceRoot: vscode.Uri,
    permissions: CommandPermissionService = new AllowAllCommandPermissionService(),
  ): TerminalAPI {
    const cwd = workspaceRoot.fsPath;
    const commandRunner = new SecureCommandRunner(permissions);
    return {
      async lastCommand() { return ''; },
      async outputContains() { return false; },
      async run(command) {
        return commandRunner.run({
          command,
          cwd,
          source: 'terminal.run',
        });
      },
      async runShell(command) {
        return commandRunner.runShell({
          command,
          cwd,
          source: 'terminal.runShell',
        });
      },
    };
  }
}
