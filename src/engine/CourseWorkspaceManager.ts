import * as crypto from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';

const WORKSPACES_DIR = 'workspaces';

export class CourseWorkspaceManager {
  constructor(private readonly _storageUri: vscode.Uri) {}

  async prepare(sourceCourseDir: string): Promise<vscode.Uri> {
    const dirName = this.workspaceDirName(sourceCourseDir);
    const workspaceUri = vscode.Uri.joinPath(this._storageUri, WORKSPACES_DIR, dirName);
    await vscode.workspace.fs.createDirectory(workspaceUri);
    return workspaceUri;
  }

  workspaceDirName(sourceCourseDir: string): string {
    const resolved = path.resolve(sourceCourseDir);
    const base = path.basename(resolved).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
    const hash = crypto.createHash('sha256').update(resolved).digest('hex').slice(0, 12);
    return `${base}-${hash}`;
  }
}
