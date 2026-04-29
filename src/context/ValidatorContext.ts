import * as vscode from 'vscode';
import * as path from 'path';
import { CheckResult } from '../engine/types';

export interface TerminalAPI {
  lastCommand(): Promise<string>;
  outputContains(text: string): Promise<boolean>;
  run(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  runShell(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export interface ValidatorContext {
  files: {
    exists(filePath: string): Promise<boolean>;
    read(filePath: string): Promise<string>;
    matches(filePath: string, pattern: RegExp): Promise<boolean>;
    list(dirPath: string): Promise<string[]>;
  };
  terminal: TerminalAPI;
  env: {
    get(name: string): string | undefined;
  };
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
  const resolve = (p: string) => {
    // Prevent path traversal outside workspace root
    const root = workspaceRoot.fsPath;
    const resolved = path.resolve(root, p);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error(`Path "${p}" escapes the workspace root.`);
    }
    return vscode.Uri.file(resolved);
  };

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
      async list(dirPath) {
        try {
          const entries = await vscode.workspace.fs.readDirectory(resolve(dirPath));
          return entries.map(([name]) => name);
        } catch {
          return [];
        }
      },
    },
    terminal,
    env: {
      get(name) {
        // Block variables that commonly hold credentials, tokens, or secrets.
        // Substring match, so e.g. ZOWE_OPT_PASSWORD is blocked too.
        // This is best-effort — env.get is documented as not a security boundary.
        const upper = name.toUpperCase();
        if (
          upper.includes('TOKEN') || upper.includes('SECRET') ||
          upper.includes('PASSWORD') || upper.includes('PASSWD') ||
          upper.includes('CREDENTIAL') || upper.includes('API_KEY') ||
          upper.includes('PRIVATE_KEY') || upper.includes('ACCESS_KEY') ||
          upper.includes('OAUTH') || upper.includes('BEARER') ||
          upper.includes('KUBECONFIG') || upper.includes('SSH_AUTH_SOCK') ||
          upper.includes('SESSION_ID') || upper.includes('COOKIE') ||
          upper.startsWith('AUTH_') || upper.endsWith('_AUTH')
        ) {
          return undefined;
        }
        return process.env[name];
      },
    },
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
