import { CourseDef } from './types';
import { CourseProgress } from './ProgressStore';

export interface MigrationResult {
  progress: CourseProgress;
  migratedSteps: number;
}

export class MigrationRunner {
  /**
   * Migrate progress from an old version into the new course's step space.
   *
   * Migration table (in course.json):
   *   "migration": { "1.0.0": { "old-step-id": "new-step-id", ... } }
   *
   * The Nth key in the table corresponds to old step index N (insertion order).
   * If no table exists for the old version, we fall back to matching by step `id`.
   */
  migrate(old: CourseProgress, newCourse: CourseDef): MigrationResult {
    const remap = this._buildRemapFn(old.version, newCourse);

    const completedSteps = [...new Set(
      old.completedSteps.map(remap).filter((i): i is number => i !== null),
    )];

    const currentStep = remap(old.currentStep)
      ?? Math.min(old.currentStep, newCourse.steps.length - 1);

    return {
      progress: {
        courseId: newCourse.id,
        version: newCourse.version,
        currentStep,
        completedSteps,
        startedAt: old.startedAt,
        lastActiveAt: new Date().toISOString(),
      },
      migratedSteps: completedSteps.length,
    };
  }

  private _buildRemapFn(
    oldVersion: string,
    newCourse: CourseDef,
  ): (oldIndex: number) => number | null {
    const table = newCourse.migration?.[oldVersion];

    if (table && typeof table === 'object') {
      // Positional: entry at index N maps old step N → new step id.
      // Filter to strings only — a malicious course.json could supply other types.
      const entries = Object.values(table).filter((v): v is string => typeof v === 'string');
      return (oldIndex) => {
        const newId = entries[oldIndex];
        if (!newId) { return null; }
        const newIdx = newCourse.steps.findIndex((s) => s.id === newId);
        return newIdx === -1 ? null : newIdx;
      };
    }

    // Fallback: match old step index to new step by id (requires step ids stayed the same)
    // We don't have old step defs, so we use the same index if in range.
    return (oldIndex) =>
      oldIndex < newCourse.steps.length ? oldIndex : null;
  }
}
