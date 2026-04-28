import * as crypto from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  CommandPermissionRequest,
  CommandPermissionService,
  parseCommand,
} from './SecureCommandRunner';
import { logValidatorCommandDebug } from '../logger';

const STORE_KEY = 'instrktr.allowedCommands.v1';

type StoredPermissions = Record<string, true>;

function normalizeCommand(command: string): string {
  return parseCommand(command).join('\u0000');
}

function permissionKey(request: CommandPermissionRequest): string {
  const payload = JSON.stringify({
    source: request.source,
    courseId: request.courseId ?? '',
    stepId: request.stepId ?? '',
    cwd: path.resolve(request.cwd),
    command: normalizeCommand(request.command),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function describeCommand(request: CommandPermissionRequest): string {
  if (request.source === 'bashValidator') {
    return 'Runs this step\'s Bash validator script. Bash validators can inspect the workspace and run shell commands.';
  }
  if (request.source === 'terminal.runShell') {
    return 'Runs a shell command in the workspace. Shell commands can use expansions and control operators such as ~, &&, pipes, and redirects.';
  }

  const [cmd, ...args] = parseCommand(request.command);
  if (cmd === 'test' && (args[0] === '-f' || args[0] === '-e' || args[0] === '-d')) {
    const kind = args[0] === '-d' ? 'directory' : 'file or path';
    return `Checks whether the ${kind} "${args[1] ?? ''}" exists in the workspace.`;
  }
  if (cmd === 'npm' && (args[0] === 'test' || (args[0] === 'run' && args[1] === 'test'))) {
    return 'Runs the workspace test suite so the course can verify the result.';
  }
  if (cmd === 'git') {
    return 'Runs Git in the workspace so the course can verify repository state.';
  }
  if (cmd === 'node') {
    return 'Runs Node.js in the workspace so the course can verify project behavior.';
  }
  if (!cmd) {
    return 'Attempts to run an empty command; this will fail.';
  }
  return 'Runs a course validator command in the workspace.';
}

export class VSCodeCommandPermissionService implements CommandPermissionService {
  constructor(private readonly _state: vscode.Memento) {}

  async requestPermission(request: CommandPermissionRequest): Promise<boolean> {
    const securityDisabled = vscode.workspace
      .getConfiguration('instrktr')
      .get<boolean>('disableValidatorCommandSecurityChecks', false);
    if (securityDisabled) {
      logValidatorCommandDebug(
        `permission bypass=security-disabled command=${JSON.stringify(request.command)}`,
      );
      return true;
    }

    const key = permissionKey(request);
    const stored = this._state.get<StoredPermissions>(STORE_KEY, {});
    if (stored[key]) {
      logValidatorCommandDebug(
        `permission cached=allow key=${key} command=${JSON.stringify(request.command)}`,
      );
      return true;
    }

    const detail = [
      describeCommand(request),
      '',
      `Command: ${request.command}`,
      `Working directory: ${request.cwd}`,
      request.courseId ? `Course: ${request.courseId}` : undefined,
      request.stepId ? `Step: ${request.stepId}` : undefined,
      request.validatorPath ? `Validator: ${request.validatorPath}` : undefined,
    ].filter((line): line is string => Boolean(line)).join('\n');

    const choice = await vscode.window.showWarningMessage(
      'Instrktr course validator wants to run a command.',
      { modal: true, detail },
      'Allow Once',
      'Always Allow',
      'Deny',
    );
    logValidatorCommandDebug(
      `permission prompt choice=${choice ?? '<dismissed>'} key=${key} command=${JSON.stringify(request.command)}`,
    );

    if (choice === 'Always Allow') {
      await this._state.update(STORE_KEY, { ...stored, [key]: true });
      return true;
    }
    return choice === 'Allow Once';
  }
}
