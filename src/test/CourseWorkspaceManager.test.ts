import { describe, expect, it } from 'vitest';
import { Uri, workspace } from '../__mocks__/vscode';
import { CourseWorkspaceManager } from '../engine/CourseWorkspaceManager';

describe('CourseWorkspaceManager', () => {
  it('creates a stable workspace directory from the course source path', async () => {
    const manager = new CourseWorkspaceManager(Uri.file('/storage') as never);
    const dirNameA = manager.workspaceDirName('/Users/alice/course-repo');
    const dirNameB = manager.workspaceDirName('/Users/alice/course-repo');

    expect(dirNameA).toBe(dirNameB);
    expect(dirNameA).toMatch(/^course-repo-[0-9a-f]{12}$/);

    await manager.prepare('/Users/alice/course-repo');
    expect(workspace.fs.createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: `/storage/workspaces/${dirNameA}` }),
    );
  });

  it('sanitizes unusual directory names before using them in storage paths', () => {
    const manager = new CourseWorkspaceManager(Uri.file('/storage') as never);
    const dirName = manager.workspaceDirName('/tmp/course repo (draft)');
    expect(dirName).toMatch(/^course-repo-draft-[0-9a-f]{12}$/);
  });
});
