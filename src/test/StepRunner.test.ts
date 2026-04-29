import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Uri, workspace } from '../__mocks__/vscode';
import { StepRunner } from '../engine/StepRunner';
import { CourseWorkspaceManager } from '../engine/CourseWorkspaceManager';
import { CourseDef, StepState } from '../engine/types';

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T) => void;
  constructor() {
    this.promise = new Promise<T>((resolve) => { this.resolve = resolve; });
  }
}

function makeCourse(id: string, title: string): CourseDef {
  return {
    id,
    title,
    version: '1.0.0',
    engineVersion: '>=0.0.0',
    steps: [
      { id: 'step-1', title: `${title} Step`, instructions: 'instructions.md', hints: [] },
    ],
  };
}

async function writeCourseDir(title: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `instrktr-${title}-`));
  await fs.writeFile(path.join(dir, 'instructions.md'), `# ${title}`);
  return dir;
}

function makeWorkspaceManager(workspaceRoot = '/workspace'): CourseWorkspaceManager {
  return {
    prepare: vi.fn(async () => Uri.file(workspaceRoot)),
    workspaceDirName: vi.fn(() => 'course-workspace'),
  } as unknown as CourseWorkspaceManager;
}

describe('StepRunner course switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspace.createFileSystemWatcher.mockReturnValue({
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    });
  });

  it('ignores stale course loads that finish after a newer course starts', async () => {
    const oldDir = await writeCourseDir('Old Course');
    const newDir = await writeCourseDir('New Course');
    const oldLoad = new Deferred<CourseDef>();

    const progress = {
      start: vi.fn(async (course: CourseDef) => ({
        migrated: false,
        progress: {
          courseId: course.id,
          version: course.version,
          currentStep: 0,
          completedSteps: [],
          startedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
      })),
      setCurrentStep: vi.fn(),
      markStepComplete: vi.fn(),
      reset: vi.fn(),
    };

    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, makeWorkspaceManager());
    const states: StepState[] = [];
    runner.onStateChange((state) => states.push(state));

    (runner as unknown as { _loader: { load: (dir: string) => Promise<CourseDef> } })._loader = {
      load: (dir: string) => {
        if (dir === oldDir) { return oldLoad.promise; }
        if (dir === newDir) { return Promise.resolve(makeCourse('new-course', 'New Course')); }
        return Promise.reject(new Error(`unexpected dir ${dir}`));
      },
    };

    const oldPromise = runner.loadCourse(oldDir);
    await runner.loadCourse(newDir);
    oldLoad.resolve(makeCourse('old-course', 'Old Course'));
    await oldPromise;

    expect(states.filter((state) => state.loaded).map((state) => state.courseTitle)).toEqual(['New Course']);
    expect(runner.totalSteps).toBe(1);
  });

  it('clamps invalid saved progress instead of leaving a stale completion screen visible', async () => {
    const courseDir = await writeCourseDir('Recovered Course');
    const progress = {
      start: vi.fn(async (course: CourseDef) => ({
        migrated: false,
        progress: {
          courseId: course.id,
          version: course.version,
          currentStep: 99,
          completedSteps: [0, 99, 99],
          startedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
      })),
      setCurrentStep: vi.fn(),
      markStepComplete: vi.fn(),
      reset: vi.fn(),
    };

    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, makeWorkspaceManager());
    const states: StepState[] = [];
    runner.onStateChange((state) => states.push(state));
    (runner as unknown as { _loader: { load: () => Promise<CourseDef> } })._loader = {
      load: () => Promise.resolve(makeCourse('recovered-course', 'Recovered Course')),
    };

    await runner.loadCourse(courseDir);

    const loadedStates = states.filter((state) => state.loaded);
    expect(loadedStates).toHaveLength(1);
    expect(loadedStates[0].courseTitle).toBe('Recovered Course');
    expect(loadedStates[0].stepIndex).toBe(0);
    expect('courseComplete' in loadedStates[0] ? loadedStates[0].courseComplete : false).toBe(false);
    expect(progress.setCurrentStep).toHaveBeenCalledWith('recovered-course', 0);
  });
});
