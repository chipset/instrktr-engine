import * as vscode from 'vscode';
import * as path from 'path';
import { PanelProvider } from './webview/PanelProvider';
import { CatalogProvider } from './webview/CatalogProvider';
import { StepRunner } from './engine/StepRunner';
import { TerminalWatcher } from './terminal/TerminalWatcher';
import { RegistryFetcher } from './github/RegistryFetcher';
import { InstalledCourses } from './github/InstalledCourses';
import { CourseDownloader } from './github/CourseDownloader';
import { ProgressStore } from './engine/ProgressStore';
import { AuthManager } from './github/AuthManager';
import { GistSync } from './github/GistSync';
import { RegistryCourse } from './engine/types';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri
    ?? vscode.Uri.file(context.globalStorageUri.fsPath);

  vscode.workspace.fs.createDirectory(context.globalStorageUri);

  const auth = new AuthManager();
  const progressStore = new ProgressStore(context.globalStorageUri);
  const gistSync = new GistSync(context.globalState);
  const runner = new StepRunner(workspaceRoot, progressStore);
  context.subscriptions.push(auth);
  const terminalWatcher = new TerminalWatcher(workspaceRoot);
  const registry = new RegistryFetcher(context.globalStorageUri);
  const installed = new InstalledCourses(context.globalStorageUri);
  const downloader = new CourseDownloader(context.globalStorageUri);
  await Promise.all([installed.load(), progressStore.load(), auth.loadSilent()]);

  // Pull Gist on startup if already signed in
  const initialToken = auth.state.token;
  if (initialToken) {
    gistSync.pull(initialToken, progressStore.all()).then((merged) => {
      if (merged) { progressStore.applyMerge(merged); }
    });
  }

  // Pull Gist whenever the user signs in
  auth.onDidChangeState(async (authState) => {
    if (authState.signedIn && authState.token) {
      const merged = await gistSync.pull(authState.token, progressStore.all());
      if (merged) { await progressStore.applyMerge(merged); }
    }
  });

  context.subscriptions.push({ dispose: () => runner.dispose() }, terminalWatcher);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'instrktr.panel.focus';
  context.subscriptions.push(statusBar);

  runner.onStateChange((state) => {
    statusBar.text = `$(book) ${state.courseTitle} — Step ${state.stepIndex + 1}/${state.totalSteps}`;
    statusBar.tooltip = state.title;
    statusBar.show();
  });

  runner.onStepPass(() => {
    const token = auth.state.token;
    if (token) { gistSync.debouncedPush(token, progressStore.all()); }
  });

  async function startCourse(courseDir: string, devMode = false) {
    try {
      terminalWatcher.start();
      runner.setTerminalAPI(terminalWatcher.buildAPI());
      await runner.loadCourse(courseDir, devMode);
      vscode.commands.executeCommand('instrktr.panel.focus');
      if (devMode) {
        vscode.window.showInformationMessage(
          'Instrktr dev mode: panel reloads automatically when course files change.',
        );
      }
    } catch (err) {
      const msg = String(err);
      vscode.window.showErrorMessage(`Failed to load course: ${msg}`);
      runner.fireLoadError(msg);
      vscode.commands.executeCommand('instrktr.panel.focus');
    }
  }

  async function startInstalledCourse(courseId: string) {
    const entry = installed.get(courseId);
    if (!entry) { return; }

    // Check if an update is available
    try {
      const reg = await registry.fetch();
      const remote = reg.courses.find((c) => c.id === courseId);
      if (remote && remote.latestVersion !== entry.version) {
        const choice = await vscode.window.showInformationMessage(
          `${entry.id}: v${remote.latestVersion} is available (you have v${entry.version}).`,
          'Update & Start',
          'Continue on Current',
        );
        if (choice === 'Update & Start') {
          await installCourse(remote);
          return;
        }
      }
    } catch {
      // Offline — just start the current version
    }

    startCourse(entry.courseDir);
  }

  async function installCourse(course: RegistryCourse) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${course.title}…`,
        cancellable: false,
      },
      async (progress) => {
        try {
          const oldEntry = installed.get(course.id);
          const courseDir = await downloader.download(
            course.repo,
            course.id,
            course.latestVersion,
            progress,
          );

          // Clean up old version from disk after successful download
          if (oldEntry && oldEntry.version !== course.latestVersion) {
            await downloader.uninstall(course.id, oldEntry.version);
          }

          await installed.set({
            id: course.id,
            version: course.latestVersion,
            installedAt: new Date().toISOString(),
            courseDir,
          });

          await catalogProvider.refresh();

          const action = await vscode.window.showInformationMessage(
            `${course.title} v${course.latestVersion} installed!`,
            'Start Course',
          );
          if (action === 'Start Course') { startCourse(courseDir); }
        } catch (err) {
          vscode.window.showErrorMessage(`Install failed: ${String(err)}`);
        }
      },
    );
  }

  async function uninstallCourse(courseId: string) {
    const entry = installed.get(courseId);
    if (!entry) { return; }

    const confirm = await vscode.window.showWarningMessage(
      `Remove ${courseId} v${entry.version}? This deletes the local course files.`,
      { modal: true },
      'Remove',
    );
    if (confirm !== 'Remove') { return; }

    await downloader.uninstall(courseId, entry.version);
    await installed.remove(courseId);
    await catalogProvider.refresh();
    vscode.window.showInformationMessage(`${courseId} has been removed.`);
  }

  const catalogProvider = new CatalogProvider(
    context.extensionUri,
    registry,
    installed,
    installCourse,
    startInstalledCourse,
    uninstallCourse,
  );

  const panelProvider = new PanelProvider(context.extensionUri, runner, auth);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CatalogProvider.viewId, catalogProvider),
    vscode.window.registerWebviewViewProvider(PanelProvider.viewId, panelProvider),
  );

  // Auto-start from settings
  const cfg = vscode.workspace.getConfiguration('instrktr');
  const localPath = cfg.get<string>('localCoursePath', '').trim();
  const startupCourseId = cfg.get<string>('startupCourse', '').trim();
  if (localPath) {
    startCourse(localPath, true);
  } else if (startupCourseId) {
    installed.load().then(async () => {
      const entry = installed.get(startupCourseId);
      if (entry) {
        startCourse(entry.courseDir);
      } else {
        try {
          const reg = await registry.fetch();
          const remote = reg.courses.find((c) => c.id === startupCourseId);
          if (remote) {
            await installCourse(remote);
          } else {
            vscode.window.showWarningMessage(`Instrktr: startup course "${startupCourseId}" not found in registry.`);
          }
        } catch (err) {
          vscode.window.showWarningMessage(`Instrktr: could not fetch registry to start "${startupCourseId}": ${err}`);
        }
      }
    });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('instrktr.startCourse', async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Course Folder',
      });
      if (!uris || uris.length === 0) { return; }
      startCourse(uris[0].fsPath, true);
    }),

    vscode.commands.registerCommand('instrktr.openLocalCourse', async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Course Folder',
      });
      if (!uris || uris.length === 0) { return; }
      startCourse(uris[0].fsPath, true); // dev mode on for local courses
    }),

    vscode.commands.registerCommand('instrktr.browseCourses', () => {
      vscode.commands.executeCommand('instrktr.catalog.focus');
    }),

    vscode.commands.registerCommand('instrktr.refreshRegistry', async () => {
      try {
        await registry.refresh();
        await catalogProvider.refresh();
        vscode.window.showInformationMessage('Course catalog refreshed.');
      } catch (err) {
        vscode.window.showErrorMessage(`${err}`);
      }
    }),

    vscode.commands.registerCommand('instrktr.nextStep', () => runner.nextStep()),
    vscode.commands.registerCommand('instrktr.previousStep', () => runner.previousStep()),

    vscode.commands.registerCommand('instrktr.signIn', () => auth.signIn()),
    vscode.commands.registerCommand('instrktr.signOut', () => auth.signOut()),

    vscode.commands.registerCommand('instrktr.restartCourse', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Restart course from the beginning? Your progress will be reset.',
        { modal: true },
        'Restart',
      );
      if (confirm === 'Restart') { runner.restart(); }
    }),
  );
}

export function deactivate() {}
