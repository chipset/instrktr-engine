import * as vscode from 'vscode';
import { renderInstructionsMarkdown } from './renderInstructions';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CourseDef, StepDef, StepState, CheckResult } from './types';
import { FileScaffolder } from './FileScaffolder';
import { FileWatcher, TerminalAPI } from '../context/ValidatorContext';
import { ValidatorRunner } from './ValidatorRunner';
import { CourseLoader } from './CourseLoader';
import { ProgressStore } from './ProgressStore';
import { CourseWorkspaceManager } from './CourseWorkspaceManager';
import {
  AllowAllCommandPermissionService,
  CommandPermissionService,
} from '../security/SecureCommandRunner';

export class StepRunner {
  private _course?: CourseDef;
  private _courseDir?: string;
  private _workspaceRoot: vscode.Uri;
  private _stepIndex = 0;
  private _completedSteps: number[] = [];
  private _navigating = false;
  private _loadGeneration = 0;
  private _scaffolder: FileScaffolder;
  private _fileWatcher = new FileWatcher();
  private _courseWatcher?: vscode.FileSystemWatcher;
  private _onStateChange = new vscode.EventEmitter<StepState>();
  readonly onStateChange = this._onStateChange.event;
  private _onStepPass = new vscode.EventEmitter<void>();
  readonly onStepPass = this._onStepPass.event;
  private _onCheckFailed = new vscode.EventEmitter<CheckResult>();
  readonly onCheckFailed = this._onCheckFailed.event;

  private _terminal!: TerminalAPI;
  private _validatorRunner: ValidatorRunner;
  private _loader = new CourseLoader();

  constructor(
    initialWorkspaceRoot: vscode.Uri,
    private readonly _progress: ProgressStore,
    private readonly _workspaces: CourseWorkspaceManager,
    private readonly _permissions: CommandPermissionService = new AllowAllCommandPermissionService(),
  ) {
    this._workspaceRoot = initialWorkspaceRoot;
    this._scaffolder = new FileScaffolder(initialWorkspaceRoot);
    this._terminal = ValidatorRunner.buildTerminalAPI(initialWorkspaceRoot, _permissions);
    this._validatorRunner = new ValidatorRunner(initialWorkspaceRoot, _permissions);
  }

  setTerminalAPI(api: TerminalAPI) {
    this._terminal = api;
  }

  setWorkspaceRoot(workspaceRoot: vscode.Uri) {
    if (this._workspaceRoot.fsPath === workspaceRoot.fsPath) { return; }
    this._workspaceRoot = workspaceRoot;
    this._scaffolder = new FileScaffolder(workspaceRoot);
    this._terminal = ValidatorRunner.buildTerminalAPI(workspaceRoot, this._permissions);
    this._validatorRunner = new ValidatorRunner(workspaceRoot, this._permissions);
    this._fileWatcher.watch(workspaceRoot);
  }

  fireLoadError(message: string) {
    this._onStateChange.fire({
      loaded: false,
      loadError: message,
      courseTitle: '',
      stepIndex: 0,
      totalSteps: 0,
      completedSteps: [],
    });
  }

  async loadCourse(
    courseDir: string,
    devMode = false,
    opts: { workspaceRoot?: vscode.Uri } = {},
  ): Promise<void> {
    const loadGeneration = ++this._loadGeneration;
    this._courseWatcher?.dispose();
    this._courseWatcher = undefined;
    this._onStateChange.fire({
      loaded: false,
      courseTitle: '',
      stepIndex: 0,
      totalSteps: 0,
      completedSteps: [],
    });

    const course = await this._loader.load(courseDir);
    if (loadGeneration !== this._loadGeneration) { return; }

    const workspaceRoot = opts.workspaceRoot
      ?? (devMode ? this._workspaceRoot : await this._workspaces.prepare(courseDir));
    if (loadGeneration !== this._loadGeneration) { return; }

    this._course = course;
    this._courseDir = courseDir;
    this._workspaceRoot = workspaceRoot;
    this._scaffolder = new FileScaffolder(this._workspaceRoot);
    this._validatorRunner = new ValidatorRunner(this._workspaceRoot, this._permissions);
    this._terminal = ValidatorRunner.buildTerminalAPI(this._workspaceRoot, this._permissions);
    this._fileWatcher.watch(this._workspaceRoot);

    // Dev mode: watch the course folder itself and re-render on any change
    if (devMode) {
      const pattern = new vscode.RelativePattern(vscode.Uri.file(courseDir), '**/*');
      this._courseWatcher = vscode.workspace.createFileSystemWatcher(pattern);
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const reload = () => {
        if (debounce) { clearTimeout(debounce); }
        debounce = setTimeout(async () => {
          try {
            const reloadedCourse = await this._loader.load(courseDir);
            if (loadGeneration !== this._loadGeneration) { return; }
            this._course = reloadedCourse;
          } catch { /* keep existing course if manifest is temporarily invalid */ }
          await this._enterStep(loadGeneration);
        }, 500);
      };
      this._courseWatcher.onDidChange(reload);
      this._courseWatcher.onDidCreate(reload);
      this._courseWatcher.onDidDelete(reload);
    }

    // Resume saved progress or start fresh (with migration if version changed)
    const { progress: saved, migrated } = await this._progress.start(this._course);
    if (loadGeneration !== this._loadGeneration) { return; }

    const lastStepIndex = this._course.steps.length - 1;
    this._stepIndex = Math.min(Math.max(saved.currentStep, 0), lastStepIndex);
    this._completedSteps = [...new Set(saved.completedSteps)]
      .filter((stepIndex) => stepIndex >= 0 && stepIndex <= lastStepIndex);
    if (this._stepIndex !== saved.currentStep) {
      await this._progress.setCurrentStep(this._course.id, this._stepIndex);
      if (loadGeneration !== this._loadGeneration) { return; }
    }

    if (migrated) {
      vscode.window.showInformationMessage(
        `Course updated to v${this._course.version}. Your progress has been carried over.`,
      );
    }

    await this._enterStep(loadGeneration);
  }

  async check(): Promise<CheckResult> {
    if (!this._course || !this._courseDir) {
      return { status: 'fail', message: 'No course loaded. Run "Instrktr: Start Course" first.' };
    }
    const step = this._currentStep();
    if (!step?.validator) {
      return { status: 'pass', message: 'Step complete!' };
    }
    const validatorPath = this._safeCourseJoin(this._courseDir, step.validator);
    const result = await this._validatorRunner.run(
      validatorPath,
      this._terminal,
      this._stepIndex,
      this._course.id,
      step.id,
    );

    if (result.status === 'pass') {
      await this._markStepComplete(this._stepIndex);
      this._onStepPass.fire();
    } else if (result.status === 'fail') {
      this._onCheckFailed.fire(result);
    }

    return result;
  }

  async nextStep(): Promise<boolean> {
    if (!this._course || this._navigating) { return false; }
    await this._recordImplicitCompletion(this._stepIndex);

    if (this._stepIndex >= this._course.steps.length - 1) {
      if (!this._isCourseComplete()) { return false; }
      // Fire completion state
      this._onStateChange.fire({
        loaded: true,
        courseComplete: true,
        courseTitle: this._course.title,
        stepIndex: this._stepIndex,
        totalSteps: this._course.steps.length,
        completedSteps: [...this._completedSteps],
      });
      return false;
    }
    this._navigating = true;
    try {
      this._stepIndex++;
      await this._progress.setCurrentStep(this._course.id, this._stepIndex);
      await this._enterStep();
    } finally {
      this._navigating = false;
    }
    return true;
  }

  async previousStep(): Promise<boolean> {
    if (!this._course || this._stepIndex === 0 || this._navigating) { return false; }
    this._navigating = true;
    try {
      this._stepIndex--;
      await this._progress.setCurrentStep(this._course.id, this._stepIndex);
      await this._enterStep();
    } finally {
      this._navigating = false;
    }
    return true;
  }

  async jumpToStep(index: number): Promise<boolean> {
    if (!this._course || this._navigating) { return false; }
    if (index < 0 || index >= this._course.steps.length) { return false; }
    this._navigating = true;
    try {
      this._stepIndex = index;
      await this._progress.setCurrentStep(this._course.id, this._stepIndex);
      await this._enterStep();
    } finally {
      this._navigating = false;
    }
    return true;
  }

  async restart(): Promise<void> {
    if (!this._course || !this._courseDir) { return; }
    const fresh = await this._progress.reset(this._course.id, this._course.version);
    this._stepIndex = fresh.currentStep;
    this._completedSteps = [];
    await this._enterStep();
  }

  get stepIndex(): number { return this._stepIndex; }
  get totalSteps(): number { return this._course?.steps.length ?? 0; }
  get fileWatcher(): FileWatcher { return this._fileWatcher; }
  get workspaceRoot(): vscode.Uri { return this._workspaceRoot; }

  /** Absolute filesystem path to the loaded course directory, if a course is active. */
  getCourseDirectory(): string | undefined {
    return this._courseDir;
  }

  currentStepSolutionDir(): string | undefined {
    const step = this._currentStep();
    if (!step?.solution || !this._courseDir) { return undefined; }
    try {
      return this._safeCourseJoin(this._courseDir, step.solution);
    } catch { return undefined; }
  }

  private _safeCourseJoin(courseDir: string, subpath: string): string {
    const resolved = path.resolve(courseDir, subpath);
    if (resolved !== courseDir && !resolved.startsWith(courseDir + path.sep)) {
      throw new Error(`Course path "${subpath}" escapes the course directory.`);
    }
    return resolved;
  }

  getEventContext(): {
    course: { id: string; title: string; version: string };
    step: { id: string; title: string; index: number; total: number };
  } | null {
    if (!this._course) { return null; }
    const step = this._currentStep();
    if (!step) { return null; }
    return {
      course: { id: this._course.id, title: this._course.title, version: this._course.version },
      step: { id: step.id, title: step.title, index: this._stepIndex, total: this._course.steps.length },
    };
  }

  dispose() {
    this._fileWatcher.dispose();
    this._courseWatcher?.dispose();
    this._onStateChange.dispose();
    this._onStepPass.dispose();
    this._onCheckFailed.dispose();
  }

  private _currentStep(): StepDef | undefined {
    return this._course?.steps[this._stepIndex];
  }

  private async _markStepComplete(stepIndex: number): Promise<void> {
    if (!this._course) { return; }
    await this._progress.markStepComplete(this._course.id, stepIndex);
    if (!this._completedSteps.includes(stepIndex)) {
      this._completedSteps.push(stepIndex);
    }
  }

  private async _recordImplicitCompletion(stepIndex: number): Promise<void> {
    const step = this._course?.steps[stepIndex];
    if (!step || step.validator) { return; }
    await this._markStepComplete(stepIndex);
  }

  private _isCourseComplete(): boolean {
    if (!this._course) { return false; }
    return this._course.steps.every((step, index) => (
      !step.validator || this._completedSteps.includes(index)
    ));
  }

  private async _enterStep(loadGeneration = this._loadGeneration) {
    const step = this._currentStep();
    if (!step || !this._courseDir) { return; }

    if (step.starter) {
      try {
        const starterDir = this._safeCourseJoin(this._courseDir, step.starter);
        await this._scaffolder.scaffold(starterDir);
      } catch {
        // starter dir is optional or path traversal attempt — skip silently
      }
    }

    if (step.setup) {
      try {
        const setupPath = this._safeCourseJoin(this._courseDir, step.setup);
        await this._validatorRunner.runSetup(setupPath, this._terminal, this._stepIndex, this._course?.id, step.id);
      } catch (err) {
        vscode.window.showWarningMessage(`Instrktr: Step setup failed — ${err}`);
      }
    }

    let md = step.instructions;
    try {
      const instructionsPath = this._safeCourseJoin(this._courseDir, step.instructions);
      md = await fs.readFile(instructionsPath, 'utf8');
    } catch {
      // file not found or path traversal — fall back to literal value
    }
    const instructionsHtml = await renderInstructionsMarkdown(md);

    let hasSolution = false;
    if (step.solution) {
      try {
        await fs.access(this._safeCourseJoin(this._courseDir, step.solution));
        hasSolution = true;
      } catch { /* solution dir is optional or path traversal attempt */ }
    }

    if (loadGeneration !== this._loadGeneration) { return; }

    this._onStateChange.fire({
      loaded: true,
      courseTitle: this._course!.title,
      stepIndex: this._stepIndex,
      totalSteps: this._course!.steps.length,
      completedSteps: [...this._completedSteps],
      title: step.title,
      instructionsHtml,
      hints: step.hints ?? [],
      hasSolution,
      hasValidator: !!step.validator,
    });
  }
}
