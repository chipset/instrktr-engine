import { describe, expect, it } from 'vitest';
import {
  matchesLaunchWorkspace,
  shouldSwitchToLearnerWorkspace,
} from '../engine/WorkspaceLaunchResolver';

describe('WorkspaceLaunchResolver', () => {
  it('switches into the learner workspace for installed courses', () => {
    expect(
      shouldSwitchToLearnerWorkspace('/repo/source', '/storage/workspaces/course-123', false),
    ).toBe(true);
  });

  it('does not switch workspaces in dev mode', () => {
    expect(
      shouldSwitchToLearnerWorkspace('/repo/source', '/storage/workspaces/course-123', true),
    ).toBe(false);
  });

  it('matches pending launches for the reopened learner workspace', () => {
    expect(matchesLaunchWorkspace('/storage/workspaces/course-123', {
      courseDir: '/repo/source',
      devMode: false,
      workspaceFsPath: '/storage/workspaces/course-123',
    })).toBe(true);
  });
});
