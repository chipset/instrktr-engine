import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspace, Uri } from '../__mocks__/vscode';
import { ProgressStore } from '../engine/ProgressStore';
import { CourseDef } from '../engine/types';

const STORAGE_URI = Uri.file('/storage');

function makeCourse(overrides: Partial<CourseDef> = {}): CourseDef {
  return {
    id: 'test-course',
    title: 'Test',
    version: '1.0.0',
    engineVersion: '>=0.0.0',
    steps: [
      { id: 'step-1', title: 'S1', instructions: 's1.md', hints: [] },
      { id: 'step-2', title: 'S2', instructions: 's2.md', hints: [] },
    ],
    ...overrides,
  };
}

function makeStore(): ProgressStore {
  return new ProgressStore(STORAGE_URI as never);
}

// Encode what vscode.workspace.fs.readFile returns for a given progress map
function encodeData(data: object): Uint8Array {
  return Buffer.from(JSON.stringify(data));
}

describe('ProgressStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspace.fs.writeFile.mockResolvedValue(undefined);
  });

  describe('load()', () => {
    it('starts with empty data when storage file is missing', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      expect(store.get('test-course')).toBeUndefined();
    });

    it('loads existing progress from storage', async () => {
      workspace.fs.readFile.mockResolvedValue(
        encodeData({ 'test-course': { courseId: 'test-course', version: '1.0.0', currentStep: 2, completedSteps: [0, 1], startedAt: '2024-01-01T00:00:00.000Z', lastActiveAt: '2024-06-01T00:00:00.000Z' } }),
      );
      const store = makeStore();
      await store.load();
      expect(store.get('test-course')?.currentStep).toBe(2);
    });
  });

  describe('start()', () => {
    it('creates fresh progress for a new course', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      const { progress, migrated } = await store.start(makeCourse());
      expect(progress.currentStep).toBe(0);
      expect(progress.completedSteps).toEqual([]);
      expect(migrated).toBe(false);
    });

    it('resumes progress when version matches', async () => {
      workspace.fs.readFile.mockResolvedValue(
        encodeData({ 'test-course': { courseId: 'test-course', version: '1.0.0', currentStep: 1, completedSteps: [0], startedAt: '2024-01-01T00:00:00.000Z', lastActiveAt: '2024-01-01T00:00:00.000Z' } }),
      );
      const store = makeStore();
      await store.load();
      const { progress, migrated } = await store.start(makeCourse());
      expect(progress.currentStep).toBe(1);
      expect(migrated).toBe(false);
    });

    it('migrates and sets migrated=true when version changes', async () => {
      workspace.fs.readFile.mockResolvedValue(
        encodeData({ 'test-course': { courseId: 'test-course', version: '0.9.0', currentStep: 1, completedSteps: [0], startedAt: '2024-01-01T00:00:00.000Z', lastActiveAt: '2024-01-01T00:00:00.000Z' } }),
      );
      const store = makeStore();
      await store.load();
      const { migrated } = await store.start(makeCourse({ version: '1.0.0' }));
      expect(migrated).toBe(true);
    });

    it('persists new progress to storage', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      expect(workspace.fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('markStepComplete()', () => {
    it('adds a step to completedSteps', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      await store.markStepComplete('test-course', 0);
      expect(store.get('test-course')?.completedSteps).toContain(0);
    });

    it('does not duplicate a step already in completedSteps', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      await store.markStepComplete('test-course', 0);
      await store.markStepComplete('test-course', 0);
      expect(store.get('test-course')?.completedSteps.filter(s => s === 0)).toHaveLength(1);
    });

    it('is a no-op for an unknown courseId', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await expect(store.markStepComplete('unknown', 0)).resolves.toBeUndefined();
    });
  });

  describe('setCurrentStep()', () => {
    it('updates currentStep', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      await store.setCurrentStep('test-course', 1);
      expect(store.get('test-course')?.currentStep).toBe(1);
    });
  });

  describe('reset()', () => {
    it('resets progress to step 0 with no completed steps', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      await store.markStepComplete('test-course', 0);
      const fresh = await store.reset('test-course', '1.0.0');
      expect(fresh.currentStep).toBe(0);
      expect(fresh.completedSteps).toEqual([]);
    });
  });

  describe('applyMerge()', () => {
    it('replaces all data with the merged map', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.applyMerge({
        'other-course': { courseId: 'other-course', version: '1.0.0', currentStep: 3, completedSteps: [0, 1, 2], startedAt: '2024-01-01T00:00:00.000Z', lastActiveAt: '2024-06-01T00:00:00.000Z' },
      });
      expect(store.get('other-course')?.currentStep).toBe(3);
    });
  });

  describe('all()', () => {
    it('returns a new outer object (new keys on snapshot do not affect the store)', async () => {
      workspace.fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const store = makeStore();
      await store.load();
      await store.start(makeCourse());
      const snapshot = store.all();
      (snapshot as Record<string, unknown>)['injected-course'] = {};
      expect(store.get('injected-course')).toBeUndefined();
    });
  });
});
