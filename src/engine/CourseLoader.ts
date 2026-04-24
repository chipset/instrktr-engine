import * as fs from 'fs/promises';
import * as path from 'path';
import { CourseDef, StepDef } from './types';

const REQUIRED_COURSE_FIELDS: (keyof CourseDef)[] = ['id', 'title', 'version', 'engineVersion', 'steps'];
const REQUIRED_STEP_FIELDS: (keyof StepDef)[] = ['id', 'title', 'instructions'];

export class CourseLoader {
  async load(courseDir: string): Promise<CourseDef> {
    const manifestPath = path.join(courseDir, 'course.json');

    let raw: string;
    try {
      raw = await fs.readFile(manifestPath, 'utf8');
    } catch {
      throw new Error(`No course.json found in ${courseDir}`);
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(raw);
    } catch {
      throw new Error(`course.json is not valid JSON`);
    }

    this._validateCourse(manifest);
    const course = manifest as CourseDef;
    this._checkEngineVersion(course.engineVersion);

    for (let i = 0; i < course.steps.length; i++) {
      this._validateStep(course.steps[i], i);
    }

    return course;
  }

  private _validateCourse(obj: unknown) {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('course.json must be a JSON object');
    }
    for (const field of REQUIRED_COURSE_FIELDS) {
      if (!(field in (obj as object))) {
        throw new Error(`course.json missing required field: "${field}"`);
      }
    }
    if (!Array.isArray((obj as CourseDef).steps) || (obj as CourseDef).steps.length === 0) {
      throw new Error('course.json "steps" must be a non-empty array');
    }
  }

  private _validateStep(step: unknown, index: number) {
    if (typeof step !== 'object' || step === null) {
      throw new Error(`Step ${index} is not a valid object`);
    }
    for (const field of REQUIRED_STEP_FIELDS) {
      if (!(field in (step as object))) {
        throw new Error(`Step ${index} missing required field: "${field}"`);
      }
    }
  }

  private _checkEngineVersion(engineVersion: string) {
    // Simple semver range check — supports ">=X.Y.Z" and "^X.Y.Z"
    const match = engineVersion.match(/[>=^~]*(\d+)\.(\d+)\.(\d+)/);
    if (!match) { return; } // unparseable — allow
    const [, major] = match;
    // Extension is 0.x during development; just warn rather than hard-fail on version
    const extMajor = 0;
    if (parseInt(major) > extMajor + 1) {
      throw new Error(
        `Course requires engine version ${engineVersion}, but this is v0.x. Please update the extension.`,
      );
    }
  }
}
