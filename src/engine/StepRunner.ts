import * as vscode from 'vscode';
import { marked } from 'marked';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CourseDef, StepDef, StepState, CheckResult } from './types';
import { FileScaffolder } from './FileScaffolder';
import { FileWatcher, TerminalAPI } from '../context/ValidatorContext';
import { ValidatorRunner } from './ValidatorRunner';
import { CourseLoader } from './CourseLoader';
import { ProgressStore } from './ProgressStore';

export class StepRunner {
  private _course?: CourseDef;
  private _courseDir?: string;
  private _stepIndex = 0;
  private _completedSteps: number[] = [];
  private _scaffolder: FileScaffolder;
  private _fileWatcher = new FileWatcher();
  private _courseWatcher?: vscode.FileSystemWatcher;
  private _onStateChange = new vscode.EventEmitter<StepState>();
  readonly onStateChange = this._onStateChange.event;
  private _onStepPass = new vscode.EventEmitter<void>();
  readonly onStepPass = this._onStepPass.event;

  private _terminal!: TerminalAPI;
  private _validatorRunner: ValidatorRunner;
  private _loader = new CourseLoader();

  constructor(
    private readonly _workspaceRoot: vscode.Uri,
    private readonly _progress: ProgressStore,
  ) {
    this._scaffolder = new FileScaffolder(_workspaceRoot);
    this._terminal = ValidatorRunner.buildTerminalAPI(_workspaceRoot);
    this._validatorRunner = new ValidatorRunner(_workspaceRoot);
  }

  setTerminalAPI(api: TerminalAPI) {
    this._terminal = api;
  }

  async loadCourse(courseDir: string, devMode = false): Promise<void> {
    this._course = await this._loader.load(courseDir);
    this._courseDir = courseDir;
    this._fileWatcher.watch(this._workspaceRoot);

    // Dev mode: watch the course folder itself and re-render on any change
    this._courseWatcher?.dispose();
    if (devMode) {
      const pattern = new vscode.RelativePattern(vscode.Uri.file(courseDir), '**/*');
      this._courseWatcher = vscode.workspace.createFileSystemWatcher(pattern);
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const reload = () => {
        if (debounce) { clearTimeout(debounce); }
        debounce = setTimeout(() => this._enterStep(), 500);
      };
      this._courseWatcher.onDidChange(reload);
      this._courseWatcher.onDidCreate(reload);
      this._courseWatcher.onDidDelete(reload);
    }

    // Resume saved progress or start fresh (with migration if version changed)
    const { progress: saved, migrated } = await this._progress.start(this._course);
    this._stepIndex = saved.currentStep;
    this._completedSteps = [...saved.completedSteps];

    if (migrated) {
      vscode.window.showInformationMessage(
        `Course updated to v${this._course.version}. Your progress has been carried over.`,
      );
    }

    await this._enterStep();
  }

  async check(): Promise<CheckResult> {
    if (!this._course || !this._courseDir) {
      return { status: 'fail', message: 'No course loaded. Run "Instrktr: Start Course" first.' };
    }
    const step = this._currentStep();
    if (!step?.validator) {
      return { status: 'pass', message: 'Step complete!' };
    }
    const validatorPath = path.join(this._courseDir, step.validator);
    const result = await this._validatorRunner.run(validatorPath, this._terminal);

    if (result.status === 'pass') {
      await this._progress.markStepComplete(this._course.id, this._stepIndex);
      if (!this._completedSteps.includes(this._stepIndex)) {
        this._completedSteps.push(this._stepIndex);
      }
      this._onStepPass.fire();
    }

    return result;
  }

  async nextStep(): Promise<boolean> {
    if (!this._course) { return false; }
    if (this._stepIndex >= this._course.steps.length - 1) { return false; }
    this._stepIndex++;
    await this._progress.setCurrentStep(this._course.id, this._stepIndex);
    await this._enterStep();
    return true;
  }

  async previousStep(): Promise<boolean> {
    if (this._stepIndex === 0) { return false; }
    this._stepIndex--;
    await this._progress.setCurrentStep(this._course.id, this._stepIndex);
    await this._enterStep();
    return true;
  }

  async jumpToStep(index: number): Promise<boolean> {
    if (!this._course) { return false; }
    if (index < 0 || index >= this._course.steps.length) { return false; }
    this._stepIndex = index;
    await this._progress.setCurrentStep(this._course.id, this._stepIndex);
    await this._enterStep();
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

  dispose() {
    this._fileWatcher.dispose();
    this._courseWatcher?.dispose();
    this._onStateChange.dispose();
    this._onStepPass.dispose();
  }

  private _currentStep(): StepDef | undefined {
    return this._course?.steps[this._stepIndex];
  }

  private async _enterStep() {
    const step = this._currentStep();
    if (!step || !this._courseDir) { return; }

    if (step.starter) {
      const starterDir = path.join(this._courseDir, step.starter);
      try {
        await this._scaffolder.scaffold(starterDir);
      } catch {
        // starter dir is optional
      }
    }

    const instructionsPath = path.join(this._courseDir, step.instructions);
    let md = '';
    try {
      md = await fs.readFile(instructionsPath, 'utf8');
    } catch {
      md = step.instructions;
    }
    const instructionsHtml = await marked(md);

    this._onStateChange.fire({
      loaded: true,
      courseTitle: this._course!.title,
      stepIndex: this._stepIndex,
      totalSteps: this._course!.steps.length,
      completedSteps: [...this._completedSteps],
      title: step.title,
      instructionsHtml,
      hints: step.hints ?? [],
    });
  }
}
