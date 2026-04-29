import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface WorkspaceFolderLike {
  name?: string;
  uri: { fsPath: string };
}

export interface CoursePathOptions {
  workspaceFolders?: readonly WorkspaceFolderLike[];
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

const DEFAULT_BUNDLED_COURSE_DIR = 'course-js-basics';

export function expandCoursePath(rawPath: string, options: CoursePathOptions = {}): string {
  const workspaceFolders = options.workspaceFolders ?? [];
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? os.homedir();
  let expanded = rawPath.trim();

  expanded = expanded.replace(/\$\{workspaceFolder(?::([^}]+))?\}/g, (match, folderName: string | undefined) => {
    if (folderName) {
      return workspaceFolders.find((folder) => folder.name === folderName)?.uri.fsPath ?? match;
    }
    return workspaceFolders[0]?.uri.fsPath ?? match;
  });

  expanded = expanded.replace(/\$\{env:([^}]+)\}/g, (match, name: string) => env[name] ?? match);

  if (expanded === '~' || expanded.startsWith(`~${path.sep}`)) {
    expanded = path.join(homeDir, expanded.slice(2));
  }

  return path.resolve(expanded);
}

export async function resolveCourseDirectory(rawPath: string, options: CoursePathOptions = {}): Promise<string> {
  const requestedDir = expandCoursePath(rawPath, options);
  if (await hasCourseManifest(requestedDir)) {
    return requestedDir;
  }

  const childCourseDirs = await findChildCourseDirs(requestedDir);
  if (childCourseDirs.length === 1) {
    return childCourseDirs[0];
  }

  const defaultChild = childCourseDirs.find((dir) => path.basename(dir) === DEFAULT_BUNDLED_COURSE_DIR);
  if (defaultChild) {
    return defaultChild;
  }

  if (childCourseDirs.length > 1) {
    const names = childCourseDirs.map((dir) => path.basename(dir)).sort().join(', ');
    throw new Error(
      `No course.json found in ${requestedDir}. Found multiple course folders instead: ${names}. ` +
      'Open one of those course folders directly.',
    );
  }

  return requestedDir;
}

export async function resolveBundledDefaultCourse(extensionRoot: string): Promise<string | undefined> {
  const bundledDefault = path.join(extensionRoot, DEFAULT_BUNDLED_COURSE_DIR);
  return await hasCourseManifest(bundledDefault) ? bundledDefault : undefined;
}

async function hasCourseManifest(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(dir, 'course.json'));
    return stat.isFile();
  } catch {
    return false;
  }
}

async function findChildCourseDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const dirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name));

    const checks = await Promise.all(dirs.map(async (childDir) => ({
      childDir,
      hasManifest: await hasCourseManifest(childDir),
    })));
    return checks.filter((check) => check.hasManifest).map((check) => check.childDir);
  } catch {
    return [];
  }
}
