import * as vscode from 'vscode';
import * as path from 'path';
import { CheckResult } from '../engine/types';

export interface TerminalAPI {
  lastCommand(): Promise<string>;
  outputContains(text: string): Promise<boolean>;
  run(command: string): Promise<{ stdout: string; exitCode: number }>;
}

export interface ValidatorContext {
  files: {
    exists(filePath: string): Promise<boolean>;
    read(filePath: string): Promise<string>;
    matches(filePath: string, pattern: RegExp): Promise<boolean>;
  };
  terminal: TerminalAPI;
  workspace: {
    getConfig(key: string): Promise<string>;
  };
  pass(message: string): CheckResult;
  fail(message: string): CheckResult;
  warn(message: string): CheckResult;
}

export function buildContext(
  workspaceRoot: vscode.Uri,
  terminal: TerminalAPI,
): ValidatorContext {
  const resolve = (p: string) => vscode.Uri.joinPath(workspaceRoot, p);

  return {
    files: {
      async exists(filePath) {
        try {
          await vscode.workspace.fs.stat(resolve(filePath));
          return true;
        } catch {
          return false;
        }
      },
      async read(filePath) {
        const bytes = await vscode.workspace.fs.readFile(resolve(filePath));
        return Buffer.from(bytes).toString('utf8');
      },
      async matches(filePath, pattern) {
        try {
          const bytes = await vscode.workspace.fs.readFile(resolve(filePath));
          return pattern.test(Buffer.from(bytes).toString('utf8'));
        } catch {
          return false;
        }
      },
    },
    terminal,
    workspace: {
      async getConfig(key) {
        return vscode.workspace.getConfiguration('instrktr').get<string>(key) ?? '';
      },
    },
    pass: (message) => ({ status: 'pass', message }),
    fail: (message) => ({ status: 'fail', message }),
    warn: (message) => ({ status: 'warn', message }),
  };
}

export class FileWatcher {
  private _watcher?: vscode.FileSystemWatcher;
  private _onChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onChangeEmitter.event;

  watch(workspaceRoot: vscode.Uri, glob = '**/*') {
    this._watcher?.dispose();
    const pattern = new vscode.RelativePattern(workspaceRoot, glob);
    this._watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this._watcher.onDidChange((uri) => this._onChangeEmitter.fire(uri));
    this._watcher.onDidCreate((uri) => this._onChangeEmitter.fire(uri));
    this._watcher.onDidDelete((uri) => this._onChangeEmitter.fire(uri));
  }

  dispose() {
    this._watcher?.dispose();
    this._onChangeEmitter.dispose();
  }
}
