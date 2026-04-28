import { describe, it, expect, vi, beforeEach } from 'vitest';
import { window, workspace } from '../__mocks__/vscode';
import { disposeLogger, logValidatorCommandDebug } from '../logger';

describe('validator command debug logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeLogger();
  });

  it('does not create the output channel when disabled', () => {
    workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(false),
    });

    logValidatorCommandDebug('request command="npm test"');

    expect(window.createOutputChannel).not.toHaveBeenCalled();
  });

  it('writes to the Instrktr output channel when enabled', () => {
    const appendLine = vi.fn();
    workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockReturnValue(true),
    });
    window.createOutputChannel.mockReturnValue({
      appendLine,
      dispose: vi.fn(),
    });

    logValidatorCommandDebug('request command="npm test"');

    expect(window.createOutputChannel).toHaveBeenCalledWith('Instrktr');
    expect(appendLine).toHaveBeenCalledWith(expect.stringContaining('DEBUG validator-command request command="npm test"'));
  });
});
