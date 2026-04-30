import * as path from 'path';
import { vi } from 'vitest';

export class Uri {
  fsPath: string;
  path: string;

  private constructor(fsPath: string) {
    this.fsPath = fsPath;
    this.path = fsPath;
  }

  static file(p: string): Uri { return new Uri(p); }

  static parse(value: string): Uri { return new Uri(value); }

  toString(): string { return this.fsPath; }

  static joinPath(base: Uri, ...parts: string[]): Uri {
    return new Uri(path.join(base.fsPath, ...parts));
  }
}

export const workspace = {
  fs: {
    stat: vi.fn(),
    readFile: vi.fn(),
    readDirectory: vi.fn(),
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
  },
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(''),
  }),
  createFileSystemWatcher: vi.fn().mockReturnValue({
    onDidChange: vi.fn(),
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn(),
    dispose: vi.fn(),
  }),
};

export class RelativePattern {
  constructor(public base: Uri, public pattern: string) {}
}

export class EventEmitter<T> {
  private _listeners: Array<(v: T) => void> = [];
  event = (listener: (v: T) => void) => {
    this._listeners.push(listener);
    return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
  };
  fire(value: T) { this._listeners.forEach(l => l(value)); }
  dispose() { this._listeners = []; }
}

export const commands = {
  executeCommand: vi.fn().mockResolvedValue(undefined),
};

export const window = {
  createOutputChannel: vi.fn().mockReturnValue({
    appendLine: vi.fn(),
    dispose: vi.fn(),
  }),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
};

export const authentication = {
  getSession: vi.fn(),
  onDidChangeSessions: vi.fn(() => ({ dispose: vi.fn() })),
};

export enum FileType {
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}
