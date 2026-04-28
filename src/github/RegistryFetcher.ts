import * as vscode from 'vscode';
import { Registry, CachedRegistry } from '../engine/types';
import { logError } from '../logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = 'registry-cache.json';
const REGISTRY_FETCH_TIMEOUT_MS = 10_000;

export class RegistryFetcher {
  constructor(private readonly _storageUri: vscode.Uri) {}

  async fetch(): Promise<Registry> {
    const url = this._registryUrl();
    if (!url) {
      throw new Error(
        'No registry URL configured. Set "instrktr.registryUrl" in settings.',
      );
    }

    const cached = await this._loadCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.registry;
    }

    try {
      const registry = await this._fetchRemote(url);
      await this._saveCache(registry);
      return registry;
    } catch (err) {
      if (cached) {
        vscode.window.showWarningMessage(
          'Instrktr: Could not reach registry — showing cached course list.',
        );
        return cached.registry;
      }
      throw new Error(`Failed to fetch registry and no cache available: ${err}`, { cause: err });
    }
  }

  /** Force a fresh fetch, ignoring the TTL. */
  async refresh(): Promise<Registry> {
    const url = this._registryUrl();
    if (!url) {
      throw new Error('No registry URL configured.');
    }
    const registry = await this._fetchRemote(url);
    await this._saveCache(registry);
    return registry;
  }

  private _registryUrl(): string {
    return vscode.workspace
      .getConfiguration('instrktr')
      .get<string>('registryUrl', '');
  }

  private async _fetchRemote(url: string): Promise<Registry> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REGISTRY_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching registry from ${url}`);
    }

    const data: unknown = await response.json();
    return this._validate(data);
  }

  private _validate(data: unknown): Registry {
    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray((data as Registry).courses)
    ) {
      throw new Error('registry.json must be an object with a "courses" array');
    }

    const registry = data as Registry;
    for (const [i, course] of registry.courses.entries()) {
      for (const field of ['id', 'title', 'description', 'repo', 'latestVersion'] as const) {
        if (typeof course[field] !== 'string' || !course[field]) {
          throw new Error(`Registry course[${i}] missing required field: "${field}"`);
        }
      }
      if (!/^[\w.-]+\/[\w.-]+$/.test(course.repo)) {
        throw new Error(`Registry course[${i}] has invalid repo format: "${course.repo}" (expected "org/repo")`);
      }
    }

    return registry;
  }

  private async _loadCache(): Promise<CachedRegistry | null> {
    try {
      const uri = vscode.Uri.joinPath(this._storageUri, CACHE_FILE);
      const bytes = await vscode.workspace.fs.readFile(uri);
      return JSON.parse(Buffer.from(bytes).toString('utf8')) as CachedRegistry;
    } catch {
      return null;
    }
  }

  private async _saveCache(registry: Registry): Promise<void> {
    try {
      const cached: CachedRegistry = { fetchedAt: Date.now(), registry };
      const uri = vscode.Uri.joinPath(this._storageUri, CACHE_FILE);
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(JSON.stringify(cached, null, 2)),
      );
    } catch (err) {
      logError('Failed to write registry cache', err);
    }
  }
}
