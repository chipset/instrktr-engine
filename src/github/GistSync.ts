import * as vscode from 'vscode';
import { CourseProgress } from '../engine/ProgressStore';
import { logError } from '../logger';

const GIST_FILENAME = 'instrktr-progress.json';
const GIST_DESCRIPTION = 'Instrktr — course progress sync';
const API = 'https://api.github.com';
const GIST_REQUEST_TIMEOUT_MS = 15_000;

type ProgressMap = Record<string, CourseProgress>;

class GitHubApiError extends Error {
  constructor(readonly status: number, method: string, path: string) {
    super(`GitHub API ${method} ${path} → ${status}`);
  }
}

export class GistSync {
  private _gistId: string | undefined;
  private _pushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly _globalState: vscode.Memento) {
    this._gistId = this._globalState.get<string>('gistSyncId');
  }

  /** Pull remote progress and merge with local. Returns merged map, or null on any error. */
  async pull(token: string, local: ProgressMap): Promise<ProgressMap | null> {
    try {
      const remote = await this._fetchRemote(token);
      if (!remote) { return null; }
      return this._merge(local, remote);
    } catch {
      return null;
    }
  }

  /** Schedule a debounced push (300 ms). Safe to call after every step pass. */
  debouncedPush(token: string, data: ProgressMap) {
    if (this._pushTimer) { clearTimeout(this._pushTimer); }
    this._pushTimer = setTimeout(() => {
      this._push(token, data).catch((err) => {
        logError('Background Gist sync failed', err);
      });
    }, 300);
  }

  /** Immediate push. */
  async push(token: string, data: ProgressMap): Promise<void> {
    await this._push(token, data);
  }

  private async _fetchRemote(token: string): Promise<ProgressMap | null> {
    const gistId = await this._resolveGistId(token);
    if (!gistId) { return null; }

    let res: Record<string, unknown> | null;
    try {
      res = await this._request('GET', `/gists/${gistId}`, token) as Record<string, unknown>;
    } catch (err) {
      if (this._is404(err)) {
        // Gist was deleted remotely — clear our cached ID
        await this._clearGistId();
      }
      return null;
    }

    const files = res?.files as Record<string, { content?: string }> | undefined;
    const content = files?.[GIST_FILENAME]?.content;
    if (!content) { return null; }

    try {
      return JSON.parse(content) as ProgressMap;
    } catch {
      return null;
    }
  }

  private async _push(token: string, data: ProgressMap): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    const gistId = await this._resolveGistId(token);

    if (gistId) {
      try {
        await this._request('PATCH', `/gists/${gistId}`, token, {
          files: { [GIST_FILENAME]: { content } },
        });
      } catch (err) {
        if (this._is404(err)) {
          // Gist was deleted — clear cache and create a new one
          await this._clearGistId();
          await this._createGist(token, content);
        } else {
          throw err;
        }
      }
    } else {
      await this._createGist(token, content);
    }
  }

  private async _createGist(token: string, content: string): Promise<void> {
    const created = await this._request('POST', '/gists', token, {
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content } },
    }) as { id?: string };

    if (created?.id) {
      this._gistId = created.id;
      await this._globalState.update('gistSyncId', this._gistId);
    }
  }

  private async _resolveGistId(token: string): Promise<string | undefined> {
    if (this._gistId) { return this._gistId; }

    type GistItem = { files: Record<string, unknown>; id: string };
    for (let page = 1; ; page++) {
      const gists = await this._request('GET', `/gists?per_page=100&page=${page}`, token) as unknown[];
      if (!Array.isArray(gists) || gists.length === 0) { break; }

      const found = (gists as GistItem[]).find((g) => GIST_FILENAME in g.files);
      if (found) {
        this._gistId = found.id;
        await this._globalState.update('gistSyncId', this._gistId);
        return this._gistId;
      }

      if (gists.length < 100) { break; } // reached the last page
    }
    return undefined;
  }

  private async _clearGistId(): Promise<void> {
    this._gistId = undefined;
    await this._globalState.update('gistSyncId', undefined);
  }

  private _is404(err: unknown): boolean {
    return err instanceof GitHubApiError && err.status === 404;
  }

  private async _request(
    method: string,
    path: string,
    token: string,
    body?: unknown,
  ): Promise<unknown> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(GIST_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new GitHubApiError(res.status, method, path);
    }
    if (res.status === 204) { return null; }
    return res.json();
  }

  private _merge(local: ProgressMap, remote: ProgressMap): ProgressMap {
    const merged: ProgressMap = { ...local };
    for (const [id, remoteProgress] of Object.entries(remote)) {
      const localProgress = local[id];
      if (!localProgress) {
        merged[id] = remoteProgress;
      } else {
        const localTime = new Date(localProgress.lastActiveAt).getTime();
        const remoteTime = new Date(remoteProgress.lastActiveAt).getTime();
        merged[id] = remoteTime > localTime ? remoteProgress : localProgress;
      }
    }
    return merged;
  }
}
