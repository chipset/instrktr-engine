import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  expandCoursePath,
  resolveBundledDefaultCourse,
  resolveCourseDirectory,
} from '../engine/CoursePathResolver';

async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'instrktr-course-path-'));
}

async function writeCourse(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'course.json'), '{"id":"test"}');
}

describe('CoursePathResolver', () => {
  it('expands ${workspaceFolder} for portable local course settings', () => {
    const resolved = expandCoursePath('${workspaceFolder}/course-js-basics', {
      workspaceFolders: [{ name: 'repo', uri: { fsPath: '/repo/root' } }],
    });

    expect(resolved).toBe(path.resolve('/repo/root/course-js-basics'));
  });

  it('expands named workspace folders', () => {
    const resolved = expandCoursePath('${workspaceFolder:courses}/intro', {
      workspaceFolders: [
        { name: 'app', uri: { fsPath: '/repo/app' } },
        { name: 'courses', uri: { fsPath: '/repo/courses' } },
      ],
    });

    expect(resolved).toBe(path.resolve('/repo/courses/intro'));
  });

  it('returns the selected folder when it contains course.json', async () => {
    const root = await tempDir();
    await writeCourse(root);

    await expect(resolveCourseDirectory(root)).resolves.toBe(root);
  });

  it('accepts a parent folder when it contains exactly one course folder', async () => {
    const root = await tempDir();
    const course = path.join(root, 'course-local');
    await writeCourse(course);

    await expect(resolveCourseDirectory(root)).resolves.toBe(course);
  });

  it('uses the bundled JavaScript course as the default when present among multiple local courses', async () => {
    const root = await tempDir();
    const defaultCourse = path.join(root, 'course-js-basics');
    await writeCourse(defaultCourse);
    await writeCourse(path.join(root, 'course-zowe-gulp-mocha'));

    await expect(resolveCourseDirectory(root)).resolves.toBe(defaultCourse);
  });

  it('returns the bundled default course directory when packaged with the extension', async () => {
    const root = await tempDir();
    const defaultCourse = path.join(root, 'course-js-basics');
    await writeCourse(defaultCourse);

    await expect(resolveBundledDefaultCourse(root)).resolves.toBe(defaultCourse);
  });
});
