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
      this._data = JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch {
      this._data = {};
    }
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
