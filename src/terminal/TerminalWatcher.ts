import * as vscode from 'vscode';
import { TerminalAPI } from '../context/ValidatorContext';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class TerminalWatcher implements vscode.Disposable {
  private _terminal?: vscode.Terminal;
  private _lastCommand = '';
  private _lastOutput = '';
  private _disposables: vscode.Disposable[] = [];

  constructor(private readonly _workspaceRoot: vscode.Uri) {}

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
    const self = this;

    return {
      async lastCommand() {
        return self._lastCommand;
      },

      async outputContains(text: string) {
        return self._lastOutput.includes(text);
      },

      async run(command: string) {
        try {
          const { stdout, stderr } = await execFileAsync(command, [], { cwd, shell: true });
          return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
        } catch (err: unknown) {
          const e = err as { stdout?: string; stderr?: string; code?: number };
          return {
            stdout: (e.stdout ?? '').trim(),
            stderr: (e.stderr ?? '').trim(),
            exitCode: e.code ?? 1,
          };
        }
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
