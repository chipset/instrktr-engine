import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export class FileScaffolder {
  constructor(private readonly _workspaceRoot: vscode.Uri) {}

  async scaffold(starterDir: string): Promise<void> {
    const entries = await this._readDirRecursive(starterDir);
    const skipped: string[] = [];

    for (const entry of entries) {
      const relative = path.relative(starterDir, entry);
      const dest = vscode.Uri.joinPath(this._workspaceRoot, relative);

      // Don't overwrite files the learner has already modified
      try {
        await vscode.workspace.fs.stat(dest);
        skipped.push(relative);
        continue;
      } catch {
        // File doesn't exist — safe to create
      }

      const content = await fs.readFile(entry);
      await vscode.workspace.fs.writeFile(dest, content);
    }

    if (skipped.length > 0) {
      vscode.window.showInformationMessage(
        `Instrktr: Skipped ${skipped.length} existing file(s) — your changes are preserved. ` +
        `(${skipped.join(', ')})`,
      );
    }
  }

  private async _readDirRecursive(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this._readDirRecursive(full)));
      } else {
        results.push(full);
      }
    }
    return results;
  }
}
