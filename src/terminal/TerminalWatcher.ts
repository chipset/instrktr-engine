import * as vscode from 'vscode';
import { TerminalAPI } from '../context/ValidatorContext';
import {
  AllowAllCommandPermissionService,
  CommandPermissionService,
  SecureCommandRunner,
} from '../security/SecureCommandRunner';

export class TerminalWatcher implements vscode.Disposable {
  private _terminal?: vscode.Terminal;
  private _lastCommand = '';
  private _lastOutput = '';
  private _disposables: vscode.Disposable[] = [];
  private _commandRunner: SecureCommandRunner;

  constructor(
    private _workspaceRoot: vscode.Uri,
    private readonly _permissions: CommandPermissionService = new AllowAllCommandPermissionService(),
  ) {
    this._commandRunner = new SecureCommandRunner(_permissions);
  }

  setWorkspaceRoot(workspaceRoot: vscode.Uri) {
    if (this._workspaceRoot.fsPath === workspaceRoot.fsPath) { return; }
    this._workspaceRoot = workspaceRoot;
    this._lastCommand = '';
    this._lastOutput = '';
    this._terminal?.dispose();
    this._terminal = undefined;
  }

  /**
   * Creates (or reuses) the named Instrktr terminal and starts listening
   * for shell integration events.
   */
  start(): vscode.Terminal {
    // Reuse if already open
    const existing = vscode.window.terminals.find((t) => t.name === 'Instrktr');
    if (existing) {
      this._terminal = existing;
    } else {
      this._terminal = vscode.window.createTerminal({
        name: 'Instrktr',
        cwd: this._workspaceRoot,
      });
    }

    this._terminal.show(true); // show but don't steal focus

    // Shell integration: capture command + output when execution ends
    this._disposables.push(
      vscode.window.onDidEndTerminalShellExecution(async (e) => {
        if (e.terminal !== this._terminal) { return; }
        this._lastCommand = e.execution.commandLine.value.trim();
        this._lastOutput = await this._readStream(e.execution.read());
      }),
    );

    return this._terminal;
  }

  /** Build the TerminalAPI object to pass into ValidatorContext. */
  buildAPI(): TerminalAPI {
    const cwd = this._workspaceRoot.fsPath;

    return {
      lastCommand: async () => this._lastCommand,

      outputContains: async (text: string) => this._lastOutput.includes(text),

      run: async (command: string) => {
        return this._commandRunner.run({
          command,
          cwd,
          source: 'terminal.run',
        });
      },

      runShell: async (command: string) => {
        return this._commandRunner.runShell({
          command,
          cwd,
          source: 'terminal.runShell',
        });
      },
    };
  }

  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }

  private async _readStream(stream: AsyncIterable<string>): Promise<string> {
    const chunks: string[] = [];
    try {
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    } catch {
      // stream may end abruptly; partial output is fine
    }
    return chunks.join('');
  }
}
