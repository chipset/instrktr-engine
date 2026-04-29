export interface CourseLaunchState {
  courseDir: string;
  devMode: boolean;
  workspaceFsPath: string;
}

export function shouldSwitchToLearnerWorkspace(
  currentWorkspaceFsPath: string,
  learnerWorkspaceFsPath: string,
  devMode: boolean,
): boolean {
  return !devMode && currentWorkspaceFsPath !== learnerWorkspaceFsPath;
}

export function matchesLaunchWorkspace(
  workspaceFsPath: string,
  launch: CourseLaunchState | undefined,
): boolean {
  return !!launch && launch.workspaceFsPath === workspaceFsPath;
}
