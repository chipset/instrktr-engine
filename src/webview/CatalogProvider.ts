import * as vscode from 'vscode';
import { RegistryFetcher } from '../github/RegistryFetcher';
import { InstalledCourses } from '../github/InstalledCourses';
import { RegistryCourse } from '../engine/types';

export type CatalogMessage =
  | { command: 'refresh' }
  | { command: 'install'; courseId: string }
  | { command: 'start'; courseId: string }
  | { command: 'uninstall'; courseId: string };

export class CatalogProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'instrktr.catalog';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _registry: RegistryFetcher,
    private readonly _installed: InstalledCourses,
    private readonly _onInstall: (course: RegistryCourse) => Promise<void>,
    private readonly _onStart: (courseId: string) => void,
    private readonly _onUninstall: (courseId: string) => Promise<void>,
  ) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui')],
    };
    view.webview.html = this._getHtml(view.webview);

    view.webview.onDidReceiveMessage(async (msg: CatalogMessage) => {
      switch (msg.command) {
        case 'refresh':
          await this._sendCatalog(true);
          break;
        case 'install': {
          const reg = await this._registry.fetch().catch(() => null);
          const course = reg?.courses.find((c) => c.id === msg.courseId);
          if (course) { await this._onInstall(course); }
          await this._sendCatalog(false);
          break;
        }
        case 'start':
          this._onStart(msg.courseId);
          break;
        case 'uninstall':
          await this._onUninstall(msg.courseId);
          await this._sendCatalog(false);
          break;
      }
    });

    view.onDidChangeVisibility(() => {
      if (view.visible) { this._sendCatalog(false); }
    });

    this._sendCatalog(false);
  }

  /** Called externally after an install completes to refresh badges. */
  async refresh() {
    await this._sendCatalog(false);
  }

  private async _sendCatalog(forceRefresh: boolean) {
    try {
      const reg = forceRefresh
        ? await this._registry.refresh()
        : await this._registry.fetch();

      const courses = reg.courses.map((c) => {
        const inst = this._installed.get(c.id);
        let badge: 'none' | 'installed' | 'update';
        if (!inst) { badge = 'none'; }
        else if (inst.version === c.latestVersion) { badge = 'installed'; }
        else { badge = 'update'; }
        return { ...c, installedVersion: inst?.version ?? null, badge };
      });

      this._view?.webview.postMessage({ command: 'setCatalog', courses });
    } catch (err) {
      const msg = String(err);
      const isUnconfigured = msg.includes('No registry URL');
      this._view?.webview.postMessage({
        command: 'setError',
        message: isUnconfigured
          ? 'No registry configured. Set "instrktr.registryUrl" in VS Code Settings to browse courses.'
          : msg,
      });
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const uiBase = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'ui');
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'styles.css'));
    const catalogCssUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'catalog.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(uiBase, 'catalog.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stylesUri}" rel="stylesheet">
  <link href="${catalogCssUri}" rel="stylesheet">
  <title>Course Catalog</title>
</head>
<body>
  <div class="catalog-toolbar">
    <span class="catalog-heading">Course Catalog</span>
    <button class="btn btn-ghost btn-sm" id="refresh-btn" title="Refresh catalog">↻</button>
  </div>

  <div id="error-state" class="error-state" hidden>
    <p id="error-message"></p>
    <button class="btn btn-ghost btn-sm" id="retry-btn">Retry</button>
  </div>

  <div id="loading-state" class="loading-state">Loading…</div>

  <div id="course-list" hidden></div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  return require('crypto').randomBytes(16).toString('hex');
}
