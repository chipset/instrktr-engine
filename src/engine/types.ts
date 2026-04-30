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
  setup?: string;       // path to setup.js or setup.sh — runs before the step becomes active
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

export interface ExecError {
  stdout?: string;
  stderr?: string;
  code?: number;
}

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  status: CheckStatus;
  message: string;
}

interface StepStateBase {
  courseTitle: string;
  stepIndex: number;
  totalSteps: number;
  completedSteps: number[];
}

export type StepState =
  | (StepStateBase & { loaded: false; loadError?: string })
  | (StepStateBase & { loaded: true; courseComplete: true })
  | (StepStateBase & { loaded: true; courseComplete?: false; title: string; instructionsHtml: string; hints: string[]; hasSolution: boolean; hasValidator: boolean; result?: CheckResult });
