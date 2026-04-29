import * as path from 'path';
import * as fsSync from 'fs';
import * as vm from 'vm';
import * as vscode from 'vscode';
import { CheckResult } from './types';
import { buildContext, TerminalAPI, ValidatorContext } from '../context/ValidatorContext';
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

interface SandboxModule {
  exports: unknown;
}

interface SandboxRuntime {
  cache: Map<string, SandboxModule>;
  context: vm.Context;
  courseDir: string;
}

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
    let runtime: SandboxRuntime;
    try {
      const courseDir = path.dirname(path.dirname(validatorPath));
      runtime = this._createSandboxRuntime(courseDir);
      const mod = this._loadSandboxModule(
        path.resolve(validatorPath),
        runtime,
      );
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
      return await Promise.race([this._invokeSandboxValidator(fn, ctx, runtime), timeout]);
    } catch (err) {
      return { status: 'fail', message: String(err) };
    }
  }

  private _createSandboxRuntime(courseDir: string): SandboxRuntime {
    return {
      cache: new Map<string, SandboxModule>(),
      context: vm.createContext(Object.create(null)),
      courseDir: path.resolve(courseDir),
    };
  }

  private _loadSandboxModule(
    modulePath: string,
    runtime: SandboxRuntime,
  ): SandboxModule {
    const resolvedPath = this._resolveSandboxModulePath(modulePath, runtime.courseDir);
    const cached = runtime.cache.get(resolvedPath);
    if (cached) { return cached; }

    const mod = vm.runInContext('({ exports: {} })', runtime.context) as SandboxModule;
    runtime.cache.set(resolvedPath, mod);

    if (resolvedPath.endsWith('.json')) {
      const json = fsSync.readFileSync(resolvedPath, 'utf8');
      mod.exports = vm.runInContext(
        `JSON.parse(${JSON.stringify(json)})`,
        runtime.context,
      ) as unknown;
      return mod;
    }

    const src = fsSync.readFileSync(resolvedPath, 'utf8');
    const moduleDir = path.dirname(resolvedPath);
    const sandboxRequire = this._buildSandboxRequire(moduleDir, runtime);

    const wrapper = new vm.Script(
      `(function(__hostRequire, module, __filename, __dirname) {
        const require = (id) => __hostRequire(String(id));
        const exports = module.exports;
        (function(require, module, exports, __filename, __dirname) { 'use strict'; ${src}\n })(require, module, exports, __filename, __dirname);
        return module.exports;
      })`,
      { filename: resolvedPath },
    );
    const fn = wrapper.runInContext(runtime.context, { timeout: VALIDATOR_TIMEOUT_MS }) as (
      require: (id: string) => unknown,
      module: SandboxModule,
      __filename: string,
      __dirname: string,
    ) => unknown;
    mod.exports = fn(sandboxRequire, mod, resolvedPath, moduleDir);
    return mod;
  }

  private _buildSandboxRequire(
    moduleDir: string,
    runtime: SandboxRuntime,
  ) {
    const requireFn = (id: string) => {
      if (BLOCKED_MODULES.has(id)) {
        throw new Error(`Validator cannot require('${id}') — blocked for security.`);
      }
      if (!id.startsWith('.')) {
        throw new Error(`Validator cannot require('${id}') — only relative files inside the course directory are allowed.`);
      }

      const candidate = path.resolve(moduleDir, id);
      const resolved = this._resolveModuleCandidate(candidate, runtime.courseDir);
      return this._loadSandboxModule(resolved, runtime).exports;
    };

    Object.defineProperty(requireFn, 'resolve', {
      value: (id: string) => {
        if (!id.startsWith('.')) {
          throw new Error(`Validator cannot resolve('${id}') — only relative files are allowed.`);
        }
        return this._resolveModuleCandidate(path.resolve(moduleDir, id), runtime.courseDir);
      },
    });

    return requireFn;
  }

  private _resolveModuleCandidate(candidate: string, courseDir: string): string {
    const courseRoot = path.resolve(courseDir);
    const probes = [
      candidate,
      `${candidate}.js`,
      `${candidate}.json`,
      path.join(candidate, 'index.js'),
      path.join(candidate, 'index.json'),
    ].map((p) => path.resolve(p));

    for (const probe of probes) {
      if (probe !== courseRoot && !probe.startsWith(courseRoot + path.sep)) {
        continue;
      }
      try {
        const stat = fsSync.statSync(probe);
        if (stat.isFile()) {
          return probe;
        }
      } catch {
        // try the next probe
      }
    }

    throw new Error(`Validator module "${candidate}" could not be resolved inside the course directory.`);
  }

  private _resolveSandboxModulePath(modulePath: string, courseDir: string): string {
    return this._resolveModuleCandidate(modulePath, courseDir);
  }

  private async _invokeSandboxValidator(
    validatorFn: (ctx: ValidatorContext) => Promise<CheckResult>,
    hostContext: ValidatorContext,
    runtime: SandboxRuntime,
  ): Promise<CheckResult> {
    const bridge = (op: string, args: unknown[]): unknown => {
      switch (op) {
        case 'files.exists':
          return hostContext.files.exists(this._expectStringArg(args, 0, op));
        case 'files.read':
          return hostContext.files.read(this._expectStringArg(args, 0, op));
        case 'files.matches':
          return hostContext.files.matches(
            this._expectStringArg(args, 0, op),
            this._expectRegExpArg(args, 1, op),
          );
        case 'files.list':
          return hostContext.files.list(this._expectStringArg(args, 0, op));
        case 'terminal.lastCommand':
          return hostContext.terminal.lastCommand();
        case 'terminal.outputContains':
          return hostContext.terminal.outputContains(this._expectStringArg(args, 0, op));
        case 'terminal.run':
          return hostContext.terminal.run(this._expectStringArg(args, 0, op));
        case 'terminal.runShell':
          return hostContext.terminal.runShell(this._expectStringArg(args, 0, op));
        case 'env.get':
          return hostContext.env.get(this._expectStringArg(args, 0, op));
        case 'workspace.getConfig':
          return hostContext.workspace.getConfig(this._expectStringArg(args, 0, op));
        default:
          throw new Error(`Unknown validator bridge operation: ${op}`);
      }
    };

    const invoke = new vm.Script(
      `(async function(__validator, __bridge) {
        const bridgeAsync = (op) => (...args) => Promise.resolve(__bridge(op, args));
        const ctx = {
          files: {
            exists: bridgeAsync('files.exists'),
            read: bridgeAsync('files.read'),
            matches: bridgeAsync('files.matches'),
            list: bridgeAsync('files.list'),
          },
          terminal: {
            lastCommand: bridgeAsync('terminal.lastCommand'),
            outputContains: bridgeAsync('terminal.outputContains'),
            run: bridgeAsync('terminal.run'),
            runShell: bridgeAsync('terminal.runShell'),
          },
          env: {
            get: (name) => __bridge('env.get', [name]),
          },
          workspace: {
            getConfig: bridgeAsync('workspace.getConfig'),
          },
          pass: (message) => ({ status: 'pass', message }),
          fail: (message) => ({ status: 'fail', message }),
          warn: (message) => ({ status: 'warn', message }),
        };
        return await __validator(ctx);
      })`,
    );

    const run = invoke.runInContext(runtime.context, { timeout: VALIDATOR_TIMEOUT_MS }) as (
      validator: (ctx: ValidatorContext) => Promise<CheckResult>,
      bridge: (op: string, args: unknown[]) => unknown,
    ) => Promise<CheckResult>;

    return await run(validatorFn, bridge);
  }

  private _expectStringArg(args: unknown[], index: number, op: string): string {
    const value = args[index];
    if (typeof value !== 'string') {
      throw new Error(`${op} expects argument ${index + 1} to be a string.`);
    }
    return value;
  }

  private _expectRegExpArg(args: unknown[], index: number, op: string): RegExp {
    const value = args[index];
    if (Object.prototype.toString.call(value) !== '[object RegExp]') {
      throw new Error(`${op} expects argument ${index + 1} to be a RegExp.`);
    }
    return value as RegExp;
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
