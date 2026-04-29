import * as vscode from 'vscode';

let _channel: vscode.OutputChannel | undefined;

function channel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel('Instrktr');
  }
  return _channel;
}

export function log(message: string): void {
  channel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function logError(message: string, err?: unknown): void {
  const suffix = err != null ? `: ${err}` : '';
  log(`ERROR ${message}${suffix}`);
}

export function logValidatorCommandDebug(message: string): void {
  const enabled = vscode.workspace
    .getConfiguration('instrktr')
    .get<boolean>('debugValidatorCommands', false);
  if (!enabled) { return; }
  log(`DEBUG validator-command ${message}`);
}

export function disposeLogger(): void {
  _channel?.dispose();
  _channel = undefined;
}
