export interface RegistryCourse {
  id: string;
  title: string;
  description: string;
  repo: string;          // "org/repo"
  latestVersion: string;
  tags: string[];
}

export interface Registry {
  courses: RegistryCourse[];
}

export interface CachedRegistry {
  fetchedAt: number;     // Date.now()
  registry: Registry;
}

export interface StepDef {
  id: string;
  title: string;
  instructions: string; // markdown text
  hints: string[];
  validator?: string;   // path to validate.js
  starter?: string;     // path to starter folder
  solution?: string;    // path to solution folder (hidden from learner, shown on fail/warn)
}

export interface CourseDef {
  id: string;
  title: string;
  version: string;
  engineVersion: string;
  steps: StepDef[];
  /**
   * Optional migration table. Keys are old version strings; values map
   * old step IDs to new step IDs for that version upgrade.
   * e.g. { "1.0.0": { "init-repo": "repo-init" } }
   */
  migration?: Record<string, Record<string, string>>;
}

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  status: CheckStatus;
  message: string;
}

export interface StepState {
  loaded: boolean;
  courseComplete?: boolean;
  loadError?: string;
  courseTitle: string;
  stepIndex: number;
  totalSteps: number;
  completedSteps: number[];
  title: string;
  instructionsHtml: string;
  hints: string[];
  hasSolution: boolean;
  result?: CheckResult;
}
