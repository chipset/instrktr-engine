import * as vscode from 'vscode';
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
import { disposeLogger } from './logger';
import { CourseWorkspaceManager } from './engine/CourseWorkspaceManager';
import {
  CourseLaunchState,
  matchesLaunchWorkspace,
  shouldSwitchToLearnerWorkspace,
} from './engine/WorkspaceLaunchResolver';
import { resolveBundledDefaultCourse, resolveCourseDirectory } from './engine/CoursePathResolver';
import { VSCodeCommandPermissionService } from './security/CommandPermissionService';

const PENDING_LAUNCH_KEY = 'pendingCourseLaunch';
const WORKSPACE_BINDINGS_KEY = 'courseWorkspaceBindings';

export async function activate(context: vscode.ExtensionContext) {
  let workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri
    ?? context.extensionUri;

  vscode.workspace.fs.createDirectory(context.globalStorageUri);

  const auth = new AuthManager();
  const progressStore = new ProgressStore(context.globalStorageUri);
  const gistSync = new GistSync(context.globalState);
  const workspaces = new CourseWorkspaceManager(context.globalStorageUri);
  const commandPermissions = new VSCodeCommandPermissionService(context.globalState);
  const runner = new StepRunner(workspaceRoot, progressStore, workspaces, commandPermissions);
  context.subscriptions.push(auth);
  const terminalWatcher = new TerminalWatcher(workspaceRoot, commandPermissions);
  const registry = new RegistryFetcher(context.globalStorageUri);
  const installed = new InstalledCourses(context.globalStorageUri);
  const downloader = new CourseDownloader(context.globalStorageUri);
  await Promise.all([installed.load(), progressStore.load(), auth.loadSilent()]);

  const workspaceBindings = context.globalState.get<Record<string, CourseLaunchState>>(
    WORKSPACE_BINDINGS_KEY,
    {},
  );

  async function bindWorkspaceToCourse(workspaceFsPath: string, courseDir: string, devMode: boolean) {
    const bindings = context.globalState.get<Record<string, CourseLaunchState>>(
      WORKSPACE_BINDINGS_KEY,
      {},
    );
    bindings[workspaceFsPath] = { courseDir, devMode, workspaceFsPath };
    await context.globalState.update(WORKSPACE_BINDINGS_KEY, bindings);
  }

  // Pull Gist on startup if already signed in
  const initialToken = auth.accessToken;
  if (initialToken) {
    gistSync.pull(initialToken, progressStore.all()).then((merged) => {
      if (merged) { progressStore.applyMerge(merged); }
    });
  }

  // Pull Gist whenever the user signs in
  auth.onDidChangeState(async (authState) => {
    const token = auth.accessToken;
    if (authState.signedIn && token) {
      const merged = await gistSync.pull(token, progressStore.all());
      if (merged) { await progressStore.applyMerge(merged); }
    }
  });

  context.subscriptions.push({ dispose: () => runner.dispose() }, terminalWatcher);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'instrktr.panel.focus';
  context.subscriptions.push(statusBar);

  runner.onStateChange((state) => {
    const active = state.loaded && !state.courseComplete;
    vscode.commands.executeCommand('setContext', 'instrktr.courseLoaded', active);
    if (active) {
      vscode.commands.executeCommand('setContext', 'instrktr.catalogVisible', false);
    }
    if (!state.loaded) { return; }
    statusBar.text = `$(book) ${state.courseTitle} — Step ${state.stepIndex + 1}/${state.totalSteps}`;
    statusBar.tooltip = state.courseComplete ? state.courseTitle : state.title;
    statusBar.show();
  });

  runner.onStepPass(() => {
    const token = auth.accessToken;
    if (token) { gistSync.debouncedPush(token, progressStore.all()); }
  });

  async function ensureWorkspaceRoot(): Promise<vscode.Uri> {
    const openWorkspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (openWorkspaceRoot) {
      workspaceRoot = openWorkspaceRoot;
    }

    runner.setWorkspaceRoot(workspaceRoot);
    terminalWatcher.setWorkspaceRoot(workspaceRoot);
    return workspaceRoot;
  }

  async function startCourse(
    coursePath: string,
    devMode = false,
    opts: { skipWorkspaceSwitch?: boolean } = {},
  ) {
    try {
      const courseDir = await resolveCourseDirectory(coursePath, {
        workspaceFolders: vscode.workspace.workspaceFolders,
      });
      await ensureWorkspaceRoot();

      const learnerWorkspace = devMode ? workspaceRoot : await workspaces.prepare(courseDir);
      if (!opts.skipWorkspaceSwitch && shouldSwitchToLearnerWorkspace(
        workspaceRoot.fsPath,
        learnerWorkspace.fsPath,
        devMode,
      )) {
        await context.globalState.update(PENDING_LAUNCH_KEY, {
          courseDir,
          devMode,
          workspaceFsPath: learnerWorkspace.fsPath,
        } satisfies CourseLaunchState);
        try {
          await vscode.commands.executeCommand('vscode.openFolder', learnerWorkspace, {
            forceNewWindow: false,
            noRecentEntry: true,
          });
        } catch (err) {
          await context.globalState.update(PENDING_LAUNCH_KEY, undefined);
          throw err;
        }
        return;
      }

      await runner.loadCourse(courseDir, devMode, { workspaceRoot: learnerWorkspace });
      terminalWatcher.setWorkspaceRoot(runner.workspaceRoot);
      terminalWatcher.start();
      runner.setTerminalAPI(terminalWatcher.buildAPI());
      await bindWorkspaceToCourse(runner.workspaceRoot.fsPath, courseDir, devMode);
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

    await startCourse(entry.courseDir);
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
          if (action === 'Start Course') { await startCourse(courseDir); }
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
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('instrktr.presentationMode')) {
        panelProvider.refreshPresentationMode();
      }
    }),
  );

  // Auto-start from settings
  const cfg = vscode.workspace.getConfiguration('instrktr');
  const localPath = cfg.get<string>('localCoursePath', '').trim();
  const startupCourseId = cfg.get<string>('startupCourse', '').trim();
  const pendingLaunch = context.globalState.get<CourseLaunchState | undefined>(PENDING_LAUNCH_KEY);
  if (matchesLaunchWorkspace(workspaceRoot.fsPath, pendingLaunch)) {
    await context.globalState.update(PENDING_LAUNCH_KEY, undefined);
    await startCourse(pendingLaunch!.courseDir, pendingLaunch!.devMode, { skipWorkspaceSwitch: true });
  } else if (workspaceBindings[workspaceRoot.fsPath]) {
    const launch = workspaceBindings[workspaceRoot.fsPath];
    await startCourse(launch.courseDir, launch.devMode, { skipWorkspaceSwitch: true });
  } else if (localPath) {
    await startCourse(localPath, true);
  } else if (startupCourseId) {
    installed.load().then(async () => {
      const entry = installed.get(startupCourseId);
      if (entry) {
        await startCourse(entry.courseDir);
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
  } else {
    const bundledDefaultCourse = await resolveBundledDefaultCourse(context.extensionUri.fsPath);
    if (bundledDefaultCourse) {
      await startCourse(bundledDefaultCourse);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('instrktr.startCourse', async () => {
      const installedCourses = installed.all().sort((a, b) => a.id.localeCompare(b.id));
      const items: Array<
        | { label: string; description: string; action: 'browse' | 'local' }
        | { label: string; description: string; action: 'installed'; courseId: string }
      > = [
        {
          label: 'Browse Course Catalog',
          description: 'Install or start a course from the configured registry',
          action: 'browse',
        },
        {
          label: 'Open Local Course Folder',
          description: 'Author or run a course from a local folder',
          action: 'local',
        },
        ...installedCourses.map((entry) => ({
          label: entry.id,
          description: `Installed course v${entry.version}`,
          action: 'installed' as const,
          courseId: entry.id,
        })),
      ];

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Start a course…',
      });
      if (!pick) { return; }

      if (pick.action === 'browse') {
        vscode.commands.executeCommand('instrktr.catalog.focus');
        return;
      }

      if (pick.action === 'local') {
        vscode.commands.executeCommand('instrktr.openLocalCourse');
        return;
      }

      if (pick.action === 'installed') {
        await startInstalledCourse(pick.courseId);
      }
    }),

    vscode.commands.registerCommand('instrktr.openLocalCourse', async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Course Folder',
      });
      if (!uris || uris.length === 0) { return; }
      await startCourse(uris[0].fsPath, true);
    }),

    vscode.commands.registerCommand('instrktr.checkWork', async () => {
      try {
        const result = await runner.check();
        // The panel handles its own checkResult display via postMessage in PanelProvider.
        // This command path posts directly so keyboard shortcut invocations show the result.
        vscode.commands.executeCommand('instrktr.panel.focus');
        if (result.status === 'fail') {
          vscode.window.showErrorMessage(`Check failed: ${result.message}`);
        } else if (result.status === 'warn') {
          vscode.window.showWarningMessage(`Check warning: ${result.message}`);
        } else {
          vscode.window.showInformationMessage(`✓ ${result.message}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Check error: ${err}`);
      }
    }),

    vscode.commands.registerCommand('instrktr.browseCourses', () => {
      vscode.commands.executeCommand('setContext', 'instrktr.catalogVisible', true);
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

    vscode.commands.registerCommand('instrktr.jumpToStep', async () => {
      const total = runner.totalSteps;
      if (total === 0) {
        vscode.window.showWarningMessage('No course is currently loaded.');
        return;
      }
      const items = Array.from({ length: total }, (_, i) => ({
        label: `Step ${i + 1}`,
        index: i,
      }));
      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Jump to step…',
      });
      if (pick) { runner.jumpToStep(pick.index); }
    }),

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

export function deactivate() { disposeLogger(); }
