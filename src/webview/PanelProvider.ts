import * as vscode from 'vscode';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { StepRunner } from '../engine/StepRunner';
import { AuthManager, AuthState } from '../github/AuthManager';
import type { StepState } from '../engine/types';
import { rewriteInstructionImages } from './rewriteInstructionImages';

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
    this._updateWebviewLocalRoots(webviewView.webview, this._runner.getCourseDirectory());

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
          try {
            const result = await this._runner.check();
            webviewView.webview.postMessage({ command: 'checkResult', result });
          } catch (err) {
            webviewView.webview.postMessage({
              command: 'checkResult',
              result: { status: 'fail', message: `Unexpected error during check: ${String(err)}` },
            });
          }
          break;
        }

        case 'nextStep':
          await this._runner.nextStep();
          break;

        case 'previousStep':
          await this._runner.previousStep();
          break;

        case 'jumpToStep':
          if (typeof message.index !== 'number' || !Number.isInteger(message.index)) { break; }
          await this._runner.jumpToStep(message.index);
          break;

        case 'restartCourse':
          await this._runner.restart();
          break;

        case 'signIn': {
          const result = await this._auth.signIn();
          if (!result.signedIn) {
            webviewView.webview.postMessage({
              command: 'setAuth',
              auth: { ...this._auth.state, error: 'Sign-in was cancelled or failed.' },
            });
          }
          break;
        }

        case 'signOut':
          this._auth.signOut();
          break;

        case 'openFile': {
          if (typeof message.path !== 'string') { break; }
          const root = this._runner.workspaceRoot.fsPath;
          const resolved = path.resolve(root, message.path);
          if (resolved !== root && !resolved.startsWith(root + path.sep)) { break; } // block path traversal
          vscode.commands.executeCommand('vscode.open', vscode.Uri.file(resolved));
          break;
        }

        case 'openSolution': {
          const solutionDir = this._runner.currentStepSolutionDir();
          if (!solutionDir) { break; }
          const files = await listFilesRecursive(vscode.Uri.file(solutionDir));
          if (files.length === 0) { break; }
          const solutionBase = vscode.Uri.file(solutionDir);

          let targetFile = files[0];
          if (files.length > 1) {
            const items = files.map((f) => ({
              label: f.path.slice(solutionBase.path.length + 1),
              uri: f,
            }));
            const pick = await vscode.window.showQuickPick(items, {
              placeHolder: 'Choose a file to compare with the solution',
            });
            if (!pick) { break; }
            targetFile = pick.uri;
          }

          const rel = targetFile.path.slice(solutionBase.path.length + 1);
          const workspaceUri = vscode.Uri.joinPath(this._runner.workspaceRoot, rel);
          await vscode.commands.executeCommand(
            'vscode.diff',
            workspaceUri,
            targetFile,
            `${rel}  (Your file ↔ Solution)`,
          );
          break;
        }
      }
    });
  }

  private _setState(state: StepState) {
    const webview = this._view?.webview;
    const courseDir = this._runner.getCourseDirectory();
    if (webview) {
      this._updateWebviewLocalRoots(webview, courseDir);
    }
    let outgoing: StepState = state;
    if (
      webview &&
      state.loaded &&
      'instructionsHtml' in state &&
      typeof state.instructionsHtml === 'string'
    ) {
      outgoing = {
        ...state,
        instructionsHtml: rewriteInstructionImages(state.instructionsHtml, courseDir, webview),
      };
    }
    this._lastState = outgoing;
    this._view?.webview.postMessage({ command: 'setState', state: outgoing });
  }

  private _updateWebviewLocalRoots(webview: vscode.Webview, courseDir?: string) {
    const uiBase = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui');
    const roots = courseDir
      ? [uiBase, vscode.Uri.file(courseDir)]
      : [uiBase];
    webview.options = { enableScripts: true, localResourceRoots: roots };
  }

  private _setAuth(auth: AuthState) {
    this._lastAuth = auth;
    this._view?.webview.postMessage({ command: 'setAuth', auth });
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const uiBase = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui');
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'styles.css'));
    const hljsUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'highlight-instrktr.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'main.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stylesUri}" rel="stylesheet">
  <link href="${hljsUri}" rel="stylesheet">
  <title>Instrktr</title>
</head>
<body>
  <div class="empty-state" id="empty-state">
    <p id="empty-message">No course loaded.</p>
    <p id="empty-hint">Run <strong>Instrktr: Start Course</strong> from the Command Palette to begin.</p>
    <p id="empty-error" class="load-error" hidden></p>
  </div>

  <div class="completion-screen" id="completion-screen" hidden>
    <div class="completion-icon">🎉</div>
    <h2 class="completion-heading">Course Complete!</h2>
    <p class="completion-course" id="completion-title"></p>
    <p class="completion-sub">You've finished every step.</p>
    <button class="btn btn-ghost" id="restart-btn">Restart Course</button>
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
      <div class="hint-header">
        <span class="hint-label">Hint</span>
        <span class="hint-counter" id="hint-counter"></span>
        <button class="btn btn-ghost btn-sm" id="dismiss-hints-btn" aria-label="Dismiss hints">✕</button>
      </div>
      <div class="hint" id="hint-text"></div>
      <button class="btn btn-ghost btn-sm" id="next-hint-btn" hidden>Next Hint →</button>
    </section>

    <div class="result" id="result" hidden>
      <div class="result-body">
        <span class="result-icon" id="result-icon"></span>
        <span class="result-message" id="result-message"></span>
      </div>
      <button class="btn btn-ghost btn-sm" id="compare-btn" hidden>↕ Compare with Solution</button>
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

async function listFilesRecursive(dir: vscode.Uri): Promise<vscode.Uri[]> {
  const results: vscode.Uri[] = [];
  try {
    const entries = await vscode.workspace.fs.readDirectory(dir);
    for (const [name, type] of entries) {
      const child = vscode.Uri.joinPath(dir, name);
      if (type === vscode.FileType.Directory) {
        results.push(...await listFilesRecursive(child));
      } else if (type === vscode.FileType.File) {
        results.push(child);
      }
    }
  } catch { /* directory may not exist */ }
  return results;
}

function getNonce() {
  return randomBytes(16).toString('hex');
}
