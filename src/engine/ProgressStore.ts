import * as vscode from 'vscode';
import { CourseDef } from './types';
import { MigrationRunner } from './MigrationRunner';

export interface CourseProgress {
  courseId: string;
  version: string;
  currentStep: number;
  completedSteps: number[];
  startedAt: string;
  lastActiveAt: string;
}

type ProgressMap = Record<string, CourseProgress>;

const FILE = 'progress.json';

export class ProgressStore {
  private _data: ProgressMap = {};
  private _migrator = new MigrationRunner();

  constructor(private readonly _storageUri: vscode.Uri) {}

  async load(): Promise<void> {
    try {
      const uri = vscode.Uri.joinPath(this._storageUri, FILE);
      const bytes = await vscode.workspace.fs.readFile(uri);
      this._data = JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch {
      this._data = {};
    }
  }

  get(courseId: string): CourseProgress | undefined {
    return this._data[courseId];
  }

  /** Replace local data with a merged map (used by GistSync after a pull). */
  async applyMerge(merged: ProgressMap): Promise<void> {
    this._data = { ...merged };
    await this._save();
  }

  /** Expose raw data for GistSync to push. */
  all(): ProgressMap {
    return { ...this._data };
  }

  /**
   * Start or resume progress for a course.
   * - Same version → resume as-is.
   * - Different version → attempt migration, then save.
   */
  async start(course: CourseDef): Promise<{ progress: CourseProgress; migrated: boolean }> {
    const existing = this._data[course.id];

    if (!existing) {
      const progress = this._fresh(course);
      this._data[course.id] = progress;
      await this._save();
      return { progress, migrated: false };
    }

    if (existing.version === course.version) {
      existing.lastActiveAt = new Date().toISOString();
      await this._save();
      return { progress: existing, migrated: false };
    }

    // Version mismatch — migrate
    const { progress, migratedSteps } = this._migrator.migrate(existing, course);
    this._data[course.id] = progress;
    await this._save();
    return { progress, migrated: true };
  }

  async markStepComplete(courseId: string, stepIndex: number): Promise<void> {
    const p = this._data[courseId];
    if (!p) { return; }
    if (!p.completedSteps.includes(stepIndex)) {
      p.completedSteps.push(stepIndex);
    }
    p.lastActiveAt = new Date().toISOString();
    await this._save();
  }

  async setCurrentStep(courseId: string, stepIndex: number): Promise<void> {
    const p = this._data[courseId];
    if (!p) { return; }
    p.currentStep = stepIndex;
    p.lastActiveAt = new Date().toISOString();
    await this._save();
  }

  async reset(courseId: string, version: string): Promise<CourseProgress> {
    const p = this._fresh({ id: courseId, version } as Pick<CourseDef, 'id' | 'version'>);
    this._data[courseId] = p;
    await this._save();
    return p;
  }

  private _fresh(course: { id: string; version: string }): CourseProgress {
    return {
      courseId: course.id,
      version: course.version,
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
  }

  private async _save(): Promise<void> {
    const uri = vscode.Uri.joinPath(this._storageUri, FILE);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(this._data, null, 2)));
  }
}
