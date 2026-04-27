import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authentication } from '../__mocks__/vscode';
import { AuthManager } from '../github/AuthManager';

describe('AuthManager state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authentication.onDidChangeSessions = vi.fn(() => ({ dispose: vi.fn() }));
  });

  it('does not expose the access token through state', async () => {
    vi.mocked(authentication.getSession).mockResolvedValue({
      account: { label: 'octocat' },
      accessToken: 'secret-token',
    } as never);

    const auth = new AuthManager();
    await auth.signIn();

    expect(auth.state).toEqual({
      signedIn: true,
      username: 'octocat',
    });
    expect('token' in auth.state).toBe(false);
    expect(auth.accessToken).toBe('secret-token');
  });
});
