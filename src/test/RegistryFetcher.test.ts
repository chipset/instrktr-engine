import { describe, expect, it } from 'vitest';
import { Uri } from '../__mocks__/vscode';
import { RegistryFetcher } from '../github/RegistryFetcher';

describe('RegistryFetcher validation', () => {
  const fetcher = new RegistryFetcher(Uri.file('/storage') as never);
  const validate = (data: unknown) =>
    (fetcher as unknown as { _validate(data: unknown): unknown })._validate(data);

  it('rejects course ids with path separators or traversal', () => {
    expect(() => validate({
      courses: [{
        id: '../escape',
        title: 'Bad',
        description: 'Bad',
        repo: 'owner/repo',
        latestVersion: '1.0.0',
        tags: [],
      }],
    })).toThrow('invalid id');
  });

  it('rejects versions with path separators or traversal', () => {
    expect(() => validate({
      courses: [{
        id: 'safe-course',
        title: 'Bad',
        description: 'Bad',
        repo: 'owner/repo',
        latestVersion: '../../1.0.0',
        tags: [],
      }],
    })).toThrow('invalid latestVersion');
  });

  it('accepts safe course ids and versions', () => {
    expect(() => validate({
      courses: [{
        id: 'safe-course',
        title: 'Good',
        description: 'Good',
        repo: 'owner/repo',
        latestVersion: '1.0.0-beta.1',
        tags: [],
      }],
    })).not.toThrow();
  });
});
