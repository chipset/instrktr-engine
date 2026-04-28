import { describe, it, expect, vi, beforeEach } from 'vitest';
import { window, workspace } from '../__mocks__/vscode';
import { VSCodeCommandPermissionService } from '../security/CommandPermissionService';

class MemoryMemento {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string, defaultValue: T): T {
    return (this.values.has(key) ? this.values.get(key) : defaultValue) as T;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }
}

describe('VSCodeCommandPermissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(false),
    });
  });

  it('allows a command once without storing it', async () => {
    window.showWarningMessage.mockResolvedValue('Allow Once');
    const state = new MemoryMemento();
    const service = new VSCodeCommandPermissionService(state as never);

    const allowed = await service.requestPermission({
      command: 'npm test',
      cwd: '/workspace/project',
      source: 'terminal.run',
      courseId: 'course-a',
      stepId: 'step-1',
    });

    expect(allowed).toBe(true);
    expect(window.showWarningMessage).toHaveBeenCalledTimes(1);
  });

  it('stores exact always-allow decisions and reuses them', async () => {
    window.showWarningMessage.mockResolvedValue('Always Allow');
    const state = new MemoryMemento();
    const service = new VSCodeCommandPermissionService(state as never);
    const request = {
      command: 'npm test',
      cwd: '/workspace/project',
      source: 'terminal.run' as const,
      courseId: 'course-a',
      stepId: 'step-1',
    };

    await expect(service.requestPermission(request)).resolves.toBe(true);
    window.showWarningMessage.mockClear();
    await expect(service.requestPermission(request)).resolves.toBe(true);

    expect(window.showWarningMessage).not.toHaveBeenCalled();
  });

  it('does not reuse always-allow decisions for a different command', async () => {
    window.showWarningMessage.mockResolvedValueOnce('Always Allow').mockResolvedValueOnce('Deny');
    const state = new MemoryMemento();
    const service = new VSCodeCommandPermissionService(state as never);
    const base = {
      cwd: '/workspace/project',
      source: 'terminal.run' as const,
      courseId: 'course-a',
      stepId: 'step-1',
    };

    await expect(service.requestPermission({ ...base, command: 'npm test' })).resolves.toBe(true);
    await expect(service.requestPermission({ ...base, command: 'npm run lint' })).resolves.toBe(false);

    expect(window.showWarningMessage).toHaveBeenCalledTimes(2);
  });

  it('denies commands when the user denies the prompt', async () => {
    window.showWarningMessage.mockResolvedValue('Deny');
    const service = new VSCodeCommandPermissionService(new MemoryMemento() as never);

    await expect(service.requestPermission({
      command: 'git log --oneline -1',
      cwd: '/workspace/project',
      source: 'terminal.run',
    })).resolves.toBe(false);
  });

  it('allows without prompting when validator command security checks are disabled', async () => {
    workspace.getConfiguration.mockReturnValue({
      get: vi.fn((key: string, defaultValue: unknown) =>
        key === 'disableValidatorCommandSecurityChecks' ? true : defaultValue,
      ),
    });
    const service = new VSCodeCommandPermissionService(new MemoryMemento() as never);

    await expect(service.requestPermission({
      command: 'npm test',
      cwd: '/workspace/project',
      source: 'terminal.run',
    })).resolves.toBe(true);

    expect(window.showWarningMessage).not.toHaveBeenCalled();
  });

  it('explains file-existence test commands', async () => {
    window.showWarningMessage.mockResolvedValue('Deny');
    const service = new VSCodeCommandPermissionService(new MemoryMemento() as never);

    await service.requestPermission({
      command: 'test -f package.json',
      cwd: '/workspace/project',
      source: 'terminal.run',
    });

    expect(window.showWarningMessage).toHaveBeenCalledWith(
      'Instrktr course validator wants to run a command.',
      expect.objectContaining({
        detail: expect.stringContaining('Checks whether the file or path "package.json" exists'),
      }),
      'Allow Once',
      'Always Allow',
      'Deny',
    );
  });
});
