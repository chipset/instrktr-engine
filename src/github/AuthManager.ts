import * as vscode from 'vscode';

export interface AuthState {
  signedIn: boolean;
  username?: string;
  error?: string;
}

export class AuthManager implements vscode.Disposable {
  private _session: vscode.AuthenticationSession | undefined;
  private _onDidChangeState = new vscode.EventEmitter<AuthState>();
  readonly onDidChangeState = this._onDidChangeState.event;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    this._disposables.push(
      vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === 'github') {
          await this._refresh();
          this._onDidChangeState.fire(this.state);
        }
      }),
    );
  }

  get state(): AuthState {
    if (!this._session) { return { signedIn: false }; }
    return {
      signedIn: true,
      username: this._session.account.label,
    };
  }

  get accessToken(): string | undefined {
    return this._session?.accessToken;
  }

  /** Silently check for an existing session — never prompts. */
  async loadSilent(): Promise<void> {
    try {
      this._session = await vscode.authentication.getSession('github', ['gist'], {
        silent: true,
      });
    } catch {
      this._session = undefined;
    }
  }

  /** Prompt the user to sign in if not already authenticated. */
  async signIn(): Promise<AuthState> {
    try {
      this._session = await vscode.authentication.getSession('github', ['gist'], {
        createIfNone: true,
      });
    } catch {
      this._session = undefined;
    }
    this._onDidChangeState.fire(this.state);
    return this.state;
  }

  /** Clear our reference — the VS Code account stays; user manages it via Accounts menu. */
  signOut(): void {
    this._session = undefined;
    this._onDidChangeState.fire(this.state);
  }

  private async _refresh(): Promise<void> {
    try {
      this._session = await vscode.authentication.getSession('github', ['gist'], {
        silent: true,
      });
    } catch {
      this._session = undefined;
    }
  }

  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._onDidChangeState.dispose();
  }
}
