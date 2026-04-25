import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
import * as path from 'path';
import { CourseDef, StepDef } from './types';

function semverLessThan(a: [number, number, number], b: [number, number, number]): boolean {
  if (a[0] !== b[0]) { return a[0] < b[0]; }
  if (a[1] !== b[1]) { return a[1] < b[1]; }
  return a[2] < b[2];
}

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
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
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
    const reqMatch = engineVersion.match(/[>=^~]*(\d+)\.(\d+)\.(\d+)/);
    if (!reqMatch) { return; } // unparseable — allow

    const [, rMaj, rMin, rPatch] = reqMatch.map(Number);

    // Read the actual extension version from package.json bundled alongside the dist
    let extVersion = '0.0.0';
    try {
      // __dirname points to dist/ at runtime; package.json is one level up
      const pkgPath = path.join(__dirname, '..', 'package.json');
      extVersion = JSON.parse(readFileSync(pkgPath, 'utf8')).version ?? '0.0.0';
    } catch { /* fall back to 0.0.0 — will only fail in tests */ }

    const extMatch = extVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!extMatch) { return; }
    const [, eMaj, eMin, ePatch] = extMatch.map(Number);

    const engineTuple: [number, number, number] = [eMaj, eMin, ePatch];
    const reqTuple:    [number, number, number] = [rMaj, rMin, rPatch];

    const isOlder = semverLessThan(engineTuple, reqTuple);
    if (isOlder) {
      throw new Error(
        `This course requires Instrktr engine ${engineVersion} (you have v${extVersion}). ` +
        `Please update the Instrktr extension.`,
      );
    }
  }
}
