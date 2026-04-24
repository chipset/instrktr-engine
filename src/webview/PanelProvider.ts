import * as vscode from 'vscode';
import { StepRunner } from '../engine/StepRunner';
import { AuthManager, AuthState } from '../github/AuthManager';
import type { StepState } from '../engine/types';

export class PanelProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'instrktr.panel';

  private _view?: vscode.WebviewView;
  private _lastState?: StepState;
  private _lastAuth?: AuthState;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _runner: StepRunner,
    private readonly _auth: AuthManager,
  ) {
    _runner.onStateChange((state) => this._setState(state));
    _auth.onDidChangeState((authState) => this._setAuth(authState));
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui')],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) { return; }
      if (this._lastState) {
        webviewView.webview.postMessage({ command: 'setState', state: this._lastState });
      }
      if (this._lastAuth) {
        webviewView.webview.postMessage({ command: 'setAuth', auth: this._lastAuth });
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'ready':
          if (this._lastState) {
            webviewView.webview.postMessage({ command: 'setState', state: this._lastState });
          }
          webviewView.webview.postMessage({ command: 'setAuth', auth: this._auth.state });
          break;

        case 'checkWork': {
          const result = await this._runner.check();
          webviewView.webview.postMessage({ command: 'checkResult', result });
          break;
        }

        case 'nextStep': {
          const advanced = await this._runner.nextStep();
          if (!advanced) {
            vscode.window.showInformationMessage('Course complete! 🎉');
          }
          break;
        }

        case 'previousStep':
          await this._runner.previousStep();
          break;

        case 'signIn':
          await this._auth.signIn();
          break;

        case 'signOut':
          this._auth.signOut();
          break;

        case 'openFile': {
          const uri = vscode.Uri.joinPath(this._runner.workspaceRoot, message.path);
          vscode.commands.executeCommand('vscode.open', uri);
          break;
        }
      }
    });
  }

  private _setState(state: StepState) {
    this._lastState = state;
    this._view?.webview.postMessage({ command: 'setState', state });
  }

  private _setAuth(auth: AuthState) {
    this._lastAuth = auth;
    this._view?.webview.postMessage({ command: 'setAuth', auth });
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const uiBase = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui');
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'main.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stylesUri}" rel="stylesheet">
  <title>Instrktr</title>
</head>
<body>
  <div class="empty-state" id="empty-state">
    <p>No course loaded.</p>
    <p>Run <strong>Instrktr: Start Course</strong> from the Command Palette to begin.</p>
  </div>

  <div class="panel" id="panel" hidden>
    <header class="step-header">
      <span class="step-progress" id="step-progress"></span>
      <span class="course-title" id="course-title"></span>
      <h1 class="step-title" id="step-title"></h1>
      <div class="step-dots" id="step-dots"></div>
    </header>

    <section class="instructions" id="instructions"></section>

    <section class="hints" id="hints-section" hidden>
      <div class="hint" id="hint-text"></div>
      <button class="btn btn-ghost" id="next-hint-btn" hidden>Next Hint</button>
    </section>

    <div class="result" id="result" hidden>
      <span class="result-icon" id="result-icon"></span>
      <span class="result-message" id="result-message"></span>
    </div>

    <footer class="actions">
      <button class="btn btn-ghost" id="prev-btn" hidden>← Prev</button>
      <button class="btn btn-ghost" id="hint-btn">Show Hint</button>
      <button class="btn btn-primary" id="check-btn">Check My Work</button>
      <button class="btn btn-primary" id="next-btn" hidden>Next Step →</button>
    </footer>
  </div>

  <div class="auth-bar" id="auth-bar">
    <span class="auth-label" id="auth-label"></span>
    <button class="btn btn-ghost btn-sm" id="auth-btn"></button>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
