import { describe, it, expect } from 'vitest';
import { MigrationRunner } from '../engine/MigrationRunner';
import { CourseDef } from '../engine/types';
import { CourseProgress } from '../engine/ProgressStore';

function makeCourse(overrides: Partial<CourseDef> = {}): CourseDef {
  return {
    id: 'test-course',
    title: 'Test',
    version: '2.0.0',
    engineVersion: '>=0.3.0',
    steps: [
      { id: 'step-a', title: 'A', instructions: 'a.md', hints: [] },
      { id: 'step-b', title: 'B', instructions: 'b.md', hints: [] },
      { id: 'step-c', title: 'C', instructions: 'c.md', hints: [] },
    ],
    ...overrides,
  };
}

function makeProgress(overrides: Partial<CourseProgress> = {}): CourseProgress {
  return {
    courseId: 'test-course',
    version: '1.0.0',
    currentStep: 0,
    completedSteps: [],
    startedAt: '2024-01-01T00:00:00.000Z',
    lastActiveAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MigrationRunner', () => {
  const runner = new MigrationRunner();

  describe('without migration table (fallback: same-index)', () => {
    it('preserves completed steps still in range', () => {
      const result = runner.migrate(
        makeProgress({ completedSteps: [0, 1], currentStep: 1 }),
        makeCourse(),
      );
      expect(result.progress.completedSteps).toEqual([0, 1]);
      expect(result.progress.currentStep).toBe(1);
    });

    it('drops completed steps out of range when new course is shorter', () => {
      const shortCourse = makeCourse({
        steps: [{ id: 'step-a', title: 'A', instructions: 'a.md', hints: [] }],
      });
      const result = runner.migrate(
        makeProgress({ completedSteps: [0, 1, 2], currentStep: 2 }),
        shortCourse,
      );
      expect(result.progress.completedSteps).toEqual([0]);
      expect(result.progress.currentStep).toBe(0);
    });

    it('preserves startedAt from old progress', () => {
      const result = runner.migrate(
        makeProgress({ startedAt: '2023-06-01T00:00:00.000Z' }),
        makeCourse(),
      );
      expect(result.progress.startedAt).toBe('2023-06-01T00:00:00.000Z');
    });

    it('updates courseId and version to new course values', () => {
      const result = runner.migrate(
        makeProgress(),
        makeCourse({ id: 'new-id', version: '3.0.0' }),
      );
      expect(result.progress.courseId).toBe('new-id');
      expect(result.progress.version).toBe('3.0.0');
    });

    it('clamps currentStep when new course is shorter', () => {
      const shortCourse = makeCourse({
        steps: [{ id: 'step-a', title: 'A', instructions: 'a.md', hints: [] }],
      });
      const result = runner.migrate(makeProgress({ currentStep: 5 }), shortCourse);
      expect(result.progress.currentStep).toBe(0);
    });
  });

  describe('with migration table', () => {
    const courseWithTable = makeCourse({
      migration: {
        '1.0.0': {
          'old-0': 'step-b', // old index 0 → new step id 'step-b' (index 1)
          'old-1': 'step-c', // old index 1 → new step id 'step-c' (index 2)
        },
      },
    });

    it('remaps completed steps via migration table', () => {
      const result = runner.migrate(
        makeProgress({ completedSteps: [0, 1], currentStep: 1 }),
        courseWithTable,
      );
      expect(result.progress.completedSteps).toEqual([1, 2]);
      expect(result.progress.currentStep).toBe(2);
    });

    it('drops steps whose old index has no migration entry', () => {
      const result = runner.migrate(
        makeProgress({ completedSteps: [0, 5], currentStep: 0 }),
        courseWithTable,
      );
      expect(result.progress.completedSteps).toEqual([1]);
    });

    it('deduplicates when multiple old indices map to the same new step', () => {
      const dedupCourse = makeCourse({
        migration: {
          '1.0.0': { 'a': 'step-b', 'b': 'step-b' },
        },
      });
      const result = runner.migrate(
        makeProgress({ completedSteps: [0, 1], currentStep: 0 }),
        dedupCourse,
      );
      expect(result.progress.completedSteps).toEqual([1]);
    });

    it('falls back to clamped index when currentStep has no migration entry', () => {
      const result = runner.migrate(
        makeProgress({ completedSteps: [], currentStep: 9 }),
        courseWithTable,
      );
      // old index 9 has no entry in table → fallback: clamp to last step index
      expect(result.progress.currentStep).toBe(2);
    });
  });

  it('reports migratedSteps equal to resulting completed count', () => {
    const result = runner.migrate(
      makeProgress({ completedSteps: [0, 1] }),
      makeCourse(),
    );
    expect(result.migratedSteps).toBe(2);
  });
});
