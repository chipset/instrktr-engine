import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { CatalogMessage, CatalogProvider } from '../webview/CatalogProvider';

describe('CatalogProvider', () => {
  const extensionUri = vscode.Uri.file('/extension');
  const registry = {
    fetch: vi.fn(),
    refresh: vi.fn(),
  };
  const installed = {
    get: vi.fn(),
  };
  const onInstall = vi.fn();
  const onStart = vi.fn();
  const onUninstall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    registry.fetch.mockResolvedValue({
      courses: [
        {
          id: 'js-basics',
          title: 'JS Basics',
          description: 'Learn JS',
          repo: 'instrktr/js-basics',
          latestVersion: '1.0.0',
        },
      ],
    });
    registry.refresh.mockImplementation(registry.fetch);
    installed.get.mockReturnValue(undefined);
  });

  function resolveProvider() {
    let receiveMessage: ((msg: CatalogMessage) => Promise<void>) | undefined;
    const postMessage = vi.fn();
    const view = {
      visible: true,
      webview: {
        cspSource: 'vscode-webview://test',
        options: {},
        html: '',
        asWebviewUri: vi.fn((uri) => uri),
        postMessage,
        onDidReceiveMessage: vi.fn((listener: (msg: CatalogMessage) => Promise<void>) => {
          receiveMessage = listener;
          return { dispose: vi.fn() };
        }),
      },
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
    };

    const provider = new CatalogProvider(
      extensionUri,
      registry as never,
      installed as never,
      onInstall,
      onStart,
      onUninstall,
    );

    provider.resolveWebviewView(view as never);

    return { postMessage, receiveMessage: () => receiveMessage };
  }

  it('waits for the webview ready message before sending the initial catalog', async () => {
    const { postMessage, receiveMessage } = resolveProvider();
    await Promise.resolve();

    expect(registry.fetch).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(receiveMessage()).toBeTypeOf('function');

    await receiveMessage()?.({ command: 'ready' });

    expect(registry.fetch).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      command: 'setCatalog',
      courses: [
        {
          id: 'js-basics',
          title: 'JS Basics',
          description: 'Learn JS',
          repo: 'instrktr/js-basics',
          latestVersion: '1.0.0',
          installedVersion: null,
          badge: 'none',
        },
      ],
    });
  });

  it('uses the forced refresh path when the webview requests a refresh', async () => {
    const { postMessage, receiveMessage } = resolveProvider();

    await receiveMessage()?.({ command: 'ready' });
    vi.clearAllMocks();
    await receiveMessage()?.({ command: 'refresh' });

    expect(registry.fetch).toHaveBeenCalledTimes(1);
    expect(registry.refresh).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it('posts settings guidance when the registry URL is not configured', async () => {
    registry.fetch.mockRejectedValue(new Error('No registry URL configured'));
    const { postMessage, receiveMessage } = resolveProvider();

    await receiveMessage()?.({ command: 'ready' });

    expect(postMessage).toHaveBeenCalledWith({
      command: 'setError',
      message: 'No registry configured. Set "instrktr.registryUrl" in VS Code Settings to browse courses.',
    });
  });
});
