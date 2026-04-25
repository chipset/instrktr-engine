import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GistSync } from '../github/GistSync';
import { CourseProgress } from '../engine/ProgressStore';

function makeMemento() {
  const store: Record<string, unknown> = {};
  return {
    get: vi.fn((key: string) => store[key]),
    update: vi.fn(async (key: string, value: unknown) => { store[key] = value; }),
  };
}

function makeProgress(lastActiveAt: string, currentStep = 0): CourseProgress {
  return {
    courseId: 'test',
    version: '1.0.0',
    currentStep,
    completedSteps: [],
    startedAt: '2024-01-01T00:00:00.000Z',
    lastActiveAt,
  };
}

describe('GistSync._merge', () => {
  let sync: GistSync;

  beforeEach(() => {
    sync = new GistSync(makeMemento());
  });

  function merge(
    local: Record<string, CourseProgress>,
    remote: Record<string, CourseProgress>,
  ) {
    return (sync as unknown as { _merge: typeof sync['pull'] })['_merge'](local, remote);
  }

  it('keeps local entry when local is more recent', () => {
    const local = { 'a': makeProgress('2024-06-01T12:00:00.000Z', 2) };
    const remote = { 'a': makeProgress('2024-01-01T00:00:00.000Z', 0) };
    const result = merge(local, remote);
    expect(result['a'].currentStep).toBe(2);
  });

  it('takes remote entry when remote is more recent', () => {
    const local = { 'a': makeProgress('2024-01-01T00:00:00.000Z', 0) };
    const remote = { 'a': makeProgress('2024-06-01T12:00:00.000Z', 3) };
    const result = merge(local, remote);
    expect(result['a'].currentStep).toBe(3);
  });

  it('adds courses that exist only in remote', () => {
    const local = { 'a': makeProgress('2024-01-01T00:00:00.000Z') };
    const remote = { 'b': makeProgress('2024-01-01T00:00:00.000Z') };
    const result = merge(local, remote);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('keeps courses that exist only in local', () => {
    const local = { 'a': makeProgress('2024-01-01T00:00:00.000Z') };
    const remote = {};
    const result = merge(local, remote);
    expect(result['a']).toBeDefined();
  });

  it('does not mutate the local input map', () => {
    const local = { 'a': makeProgress('2024-01-01T00:00:00.000Z', 1) };
    const remote = { 'a': makeProgress('2025-01-01T00:00:00.000Z', 5) };
    merge(local, remote);
    expect(local['a'].currentStep).toBe(1);
  });
});

describe('GistSync.pull with mocked fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const sync = new GistSync(makeMemento());
    const result = await sync.pull('token', {});
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns null when gist list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }));
    const sync = new GistSync(makeMemento());
    const result = await sync.pull('token', {});
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });
});
