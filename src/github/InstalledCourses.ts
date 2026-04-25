import * as vscode from 'vscode';

export interface InstalledEntry {
  id: string;
  version: string;
  installedAt: string;
  courseDir: string;
}

const FILE = 'installed-courses.json';

export class InstalledCourses {
  private _data: Record<string, InstalledEntry> = {};

  constructor(private readonly _storageUri: vscode.Uri) {}

  async load(): Promise<void> {
    try {
      const uri = vscode.Uri.joinPath(this._storageUri, FILE);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
      this._data = this._validate(parsed);
    } catch {
      this._data = {};
    }
  }

  private _validate(raw: unknown): Record<string, InstalledEntry> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return {}; }
    const result: Record<string, InstalledEntry> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      if (
        val && typeof val === 'object' && !Array.isArray(val) &&
        typeof (val as Record<string, unknown>).id === 'string' &&
        typeof (val as Record<string, unknown>).version === 'string' &&
        typeof (val as Record<string, unknown>).installedAt === 'string' &&
        typeof (val as Record<string, unknown>).courseDir === 'string'
      ) {
        result[key] = val as InstalledEntry;
      }
    }
    return result;
  }

  get(id: string): InstalledEntry | undefined {
    return this._data[id];
  }

  all(): InstalledEntry[] {
    return Object.values(this._data);
  }

  async set(entry: InstalledEntry): Promise<void> {
    this._data[entry.id] = entry;
    await this._save();
  }

  async remove(id: string): Promise<void> {
    delete this._data[id];
    await this._save();
  }

  private async _save(): Promise<void> {
    const uri = vscode.Uri.joinPath(this._storageUri, FILE);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(this._data, null, 2)));
  }
}
