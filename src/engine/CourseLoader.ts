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

/** Reserved ID for the trust-and-sandbox step injected at load time. */
export const TRUST_STEP_ID = '__instrktr_trust_ack__';

const TRUST_STEP_INSTRUCTIONS = `# Before You Begin: Verify and Sandbox

Instrktr courses can run code on your machine. Before continuing, please understand
what you're agreeing to and consider how to run this safely.

## What this course can do

When you advance through steps, the course can:

- **Run scripts.** Validators (\`validate.js\` or \`validate.sh\`) execute as your user.
- **Read and write files** in your VS Code workspace folder.
- **Run commands** through \`context.terminal.run\` and shell commands through
  \`context.terminal.runShell\`.
- **Read certain environment variables** (Instrktr blocks names that look like
  credentials, but the filter is best-effort).

The Instrktr extension restricts the most dangerous Node.js modules and scrubs
credential-style env variables, but a course validator is **not** fully sandboxed.

## Only run courses from trusted sources

Before continuing, please:

1. **Confirm the registry source.** You should know and trust who publishes this
   registry — the URL is set in your Instrktr settings.
2. **Review the course manifest.** Open \`course.json\` and inspect the steps,
   validators, and starter files.
3. **Check the version and author.** Match them against what you expected.

If anything looks unfamiliar, **do not proceed**. Uninstall the course and report
it to your administrator or the registry maintainer.

## The safest way: a sandboxed environment

For real isolation, run interactive courses in an environment dedicated to training
so any unintended action is contained:

- **GitHub Codespaces** — a disposable cloud dev environment per course.
- **VS Code Dev Containers** — an isolated Docker container scoped to the course.
- **A virtual machine** (UTM, VirtualBox, multipass, or a cloud VM you can destroy).
- **A dedicated OS user** on your machine, with no access to your real files,
  SSH keys, or stored credentials.

In any of these, the worst a course can do is destroy the sandbox itself.

## Acknowledge

When you have reviewed the course and chosen an appropriate environment, click
**Check Work** to acknowledge and continue to step 1.
`;

const TRUST_STEP: StepDef = {
  id: TRUST_STEP_ID,
  title: 'Before You Begin: Verify and Sandbox',
  instructions: TRUST_STEP_INSTRUCTIONS,
  hints: [
    'Open course.json and any validate.js scripts in a separate VS Code window to inspect them before continuing.',
    'GitHub Codespaces or a Dev Container give you an isolated environment with one click — use it whenever you don\'t fully trust the source.',
  ],
};

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

    // Always prepend the trust-and-sandbox acknowledgment step. It can't be
    // suppressed by a course author — every learner must opt in to running
    // course code before any other step is shown.
    if (course.steps[0]?.id !== TRUST_STEP_ID) {
      course.steps = [TRUST_STEP, ...course.steps];
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
