import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { ExecError } from '../engine/types';
import { logValidatorCommandDebug } from '../logger';

export type CommandSource = 'terminal.run' | 'terminal.runShell' | 'bashValidator' | 'bashSetup';

export interface CommandPermissionRequest {
  command: string;
  cwd: string;
  source: CommandSource;
  courseId?: string;
  stepId?: string;
  validatorPath?: string;
}

export interface CommandPermissionService {
  requestPermission(request: CommandPermissionRequest): Promise<boolean>;
}

export interface CommandRunOptions extends CommandPermissionRequest {
  env?: NodeJS.ProcessEnv;
}

export interface CommandRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

/** Split a command string into [cmd, ...args] honouring single- and double-quoted tokens. */
export function parseCommand(command: string): string[] {
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

export class AllowAllCommandPermissionService implements CommandPermissionService {
  async requestPermission(): Promise<boolean> {
    return true;
  }
}

export class SecureCommandRunner {
  constructor(private readonly _permissions: CommandPermissionService) {}

  async run(options: CommandRunOptions): Promise<CommandRunResult> {
    logValidatorCommandDebug(
      `request source=${options.source} cwd=${JSON.stringify(options.cwd)} command=${JSON.stringify(options.command)} course=${options.courseId ?? '<none>'} step=${options.stepId ?? '<none>'}`,
    );
    const allowed = await this._permissions.requestPermission(options);
    if (!allowed) {
      logValidatorCommandDebug(
        `denied source=${options.source} cwd=${JSON.stringify(options.cwd)} command=${JSON.stringify(options.command)}`,
      );
      return {
        stdout: '',
        stderr: 'Command denied by user.',
        exitCode: 126,
      };
    }

    const [cmd, ...args] = parseCommand(options.command);
    if (!cmd) {
      logValidatorCommandDebug('failed reason=empty-command');
      return {
        stdout: '',
        stderr: 'No command provided.',
        exitCode: 1,
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        cwd: options.cwd,
        env: options.env,
      });
      logValidatorCommandDebug(
        `completed exitCode=0 command=${JSON.stringify(options.command)} stdoutBytes=${stdout.length} stderrBytes=${stderr.length}`,
      );
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err: unknown) {
      const e = err as ExecError;
      logValidatorCommandDebug(
        `completed exitCode=${e.code ?? 1} command=${JSON.stringify(options.command)} stdoutBytes=${(e.stdout ?? '').length} stderrBytes=${(e.stderr ?? '').length}`,
      );
      return {
        stdout: (e.stdout ?? '').trim(),
        stderr: (e.stderr ?? '').trim(),
        exitCode: e.code ?? 1,
      };
    }
  }

  async runShell(options: CommandRunOptions): Promise<CommandRunResult> {
    logValidatorCommandDebug(
      `request source=${options.source} cwd=${JSON.stringify(options.cwd)} command=${JSON.stringify(options.command)} course=${options.courseId ?? '<none>'} step=${options.stepId ?? '<none>'}`,
    );
    const allowed = await this._permissions.requestPermission(options);
    if (!allowed) {
      logValidatorCommandDebug(
        `denied source=${options.source} cwd=${JSON.stringify(options.cwd)} command=${JSON.stringify(options.command)}`,
      );
      return {
        stdout: '',
        stderr: 'Command denied by user.',
        exitCode: 126,
      };
    }

    if (!options.command.trim()) {
      logValidatorCommandDebug('failed reason=empty-shell-command');
      return {
        stdout: '',
        stderr: 'No command provided.',
        exitCode: 1,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(options.command, {
        cwd: options.cwd,
        env: options.env,
        shell: process.env['SHELL'] ?? '/bin/sh',
      });
      logValidatorCommandDebug(
        `completed exitCode=0 command=${JSON.stringify(options.command)} stdoutBytes=${stdout.length} stderrBytes=${stderr.length}`,
      );
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err: unknown) {
      const e = err as ExecError;
      logValidatorCommandDebug(
        `completed exitCode=${e.code ?? 1} command=${JSON.stringify(options.command)} stdoutBytes=${(e.stdout ?? '').length} stderrBytes=${(e.stderr ?? '').length}`,
      );
      return {
        stdout: (e.stdout ?? '').trim(),
        stderr: (e.stderr ?? '').trim(),
        exitCode: e.code ?? 1,
      };
    }
  }
}
