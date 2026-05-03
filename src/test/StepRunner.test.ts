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
  it('ignores stale workspace preparation from an older course load', async () => {
    const oldDir = await writeCourseDir('Old Workspace');
    const newDir = await writeCourseDir('New Workspace');
    const oldWorkspace = new Deferred<ReturnType<typeof Uri.file>>();

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

    const workspaces = {
      prepare: vi.fn((dir: string) => {
        if (dir === oldDir) { return oldWorkspace.promise; }
        if (dir === newDir) { return Promise.resolve(Uri.file('/workspace-new')); }
        return Promise.reject(new Error(`unexpected dir ${dir}`));
      }),
      workspaceDirName: vi.fn(() => 'course-workspace'),
    } as unknown as CourseWorkspaceManager;

    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, workspaces);
    const states: StepState[] = [];
    runner.onStateChange((state) => states.push(state));
    (runner as unknown as { _loader: { load: (dir: string) => Promise<CourseDef> } })._loader = {
      load: (dir: string) => Promise.resolve(
        dir === oldDir
          ? makeCourse('old-course', 'Old Workspace')
          : makeCourse('new-course', 'New Workspace'),
      ),
    };

    const oldPromise = runner.loadCourse(oldDir);
    await Promise.resolve();
    await runner.loadCourse(newDir);
    oldWorkspace.resolve(Uri.file('/workspace-old'));
    await oldPromise;

    expect(states.filter((state) => state.loaded).map((state) => state.courseTitle)).toEqual(['New Workspace']);
    expect(runner.workspaceRoot.fsPath).toBe('/workspace-new');
  });

  it('keeps the current workspace in dev mode instead of preparing a learner workspace', async () => {
    const courseDir = await writeCourseDir('Dev Course');
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
    const workspaces = makeWorkspaceManager('/hidden-learner-workspace');
    const runner = new StepRunner(Uri.file('/source-workspace') as never, progress as never, workspaces);
    (runner as unknown as { _loader: { load: () => Promise<CourseDef> } })._loader = {
      load: () => Promise.resolve(makeCourse('dev-course', 'Dev Course')),
    };

    await runner.loadCourse(courseDir, true);

    expect(workspaces.prepare).not.toHaveBeenCalled();
    expect(runner.workspaceRoot.fsPath).toBe('/source-workspace');
  });

});

describe('StepRunner.nextStep()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeProgress() {
    return {
      start: vi.fn(),
      setCurrentStep: vi.fn(),
      markStepComplete: vi.fn(),
      reset: vi.fn(),
    };
  }

  function makeTwoStepCourse(): CourseDef {
    return {
      id: 'test-course',
      title: 'Test Course',
      version: '1.0.0',
      engineVersion: '>=0.0.0',
      steps: [
        { id: 'step-1', title: 'Step 1', instructions: 'step-1.md', hints: [], validator: 'validate-1.js' },
        { id: 'step-2', title: 'Step 2', instructions: 'step-2.md', hints: [], validator: 'validate-2.js' },
      ],
    };
  }

  it('does not mark the course complete when required validator steps are incomplete', async () => {
    const progress = makeProgress();
    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, makeWorkspaceManager());
    const states: StepState[] = [];
    runner.onStateChange((state) => states.push(state));

    const internal = runner as unknown as {
      _course: CourseDef;
      _stepIndex: number;
      _completedSteps: number[];
    };
    internal._course = makeTwoStepCourse();
    internal._stepIndex = 1;
    internal._completedSteps = [0];

    const advanced = await runner.nextStep();

    expect(advanced).toBe(false);
    expect(states).toHaveLength(0);
  });

  it('marks the course complete on the last step after required validator steps are complete', async () => {
    const progress = makeProgress();
    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, makeWorkspaceManager());
    const states: StepState[] = [];
    runner.onStateChange((state) => states.push(state));

    const internal = runner as unknown as {
      _course: CourseDef;
      _stepIndex: number;
      _completedSteps: number[];
    };
    internal._course = makeTwoStepCourse();
    internal._stepIndex = 1;
    internal._completedSteps = [0, 1];

    const advanced = await runner.nextStep();

    expect(advanced).toBe(false);
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({
      loaded: true,
      courseComplete: true,
      courseTitle: 'Test Course',
      stepIndex: 1,
      totalSteps: 2,
      completedSteps: [0, 1],
    });
  });

  it('records validator-free steps as complete when advancing past them', async () => {
    const progress = makeProgress();
    const runner = new StepRunner(Uri.file('/workspace') as never, progress as never, makeWorkspaceManager());
    const internal = runner as unknown as {
      _course: CourseDef;
      _stepIndex: number;
      _completedSteps: number[];
      _enterStep: () => Promise<void>;
    };
    internal._course = {
      ...makeTwoStepCourse(),
      steps: [
        { id: 'step-1', title: 'Step 1', instructions: 'step-1.md', hints: [] },
        { id: 'step-2', title: 'Step 2', instructions: 'step-2.md', hints: [], validator: 'validate-2.js' },
      ],
    };
    internal._stepIndex = 0;
    internal._completedSteps = [];
    internal._enterStep = vi.fn().mockResolvedValue(undefined);

    const advanced = await runner.nextStep();

    expect(advanced).toBe(true);
    expect(progress.markStepComplete).toHaveBeenCalledWith('test-course', 0);
    expect(progress.setCurrentStep).toHaveBeenCalledWith('test-course', 1);
    expect(internal._completedSteps).toEqual([0]);
  });
});
