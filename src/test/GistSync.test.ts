import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { GistSync } from '../github/GistSync';
import { CourseProgress } from '../engine/ProgressStore';

function makeMemento() {
  const store: Record<string, unknown> = {};
  return {
    get: vi.fn((key: string) => store[key]),
    update: vi.fn(async (key: string, value: unknown) => { store[key] = value; }),
    keys: vi.fn(() => Object.keys(store)),
  } as unknown as vscode.Memento & {
    get: ReturnType<typeof vi.fn<(key: string) => unknown>>;
    update: ReturnType<typeof vi.fn<(key: string, value: unknown) => Promise<void>>>;
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
    return (sync as unknown as {
      _merge(
        local: Record<string, CourseProgress>,
        remote: Record<string, CourseProgress>,
      ): Record<string, CourseProgress>;
    })['_merge'](local, remote);
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(handler: (url: string) => { ok: boolean; status: number; json: () => Promise<unknown> }) {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(handler(url))));
  }

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await new GistSync(makeMemento()).pull('token', {});
    expect(result).toBeNull();
  });

  it('returns null when gist list is empty', async () => {
    stubFetch(() => ({ ok: true, status: 200, json: async () => [] }));
    const result = await new GistSync(makeMemento()).pull('token', {});
    expect(result).toBeNull();
  });

  it('paginates: finds gist on second page when first page is full', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
      id: `other-${i}`,
      files: { 'something-else.json': {} },
    }));
    const secondPage = [{ id: 'target-gist-id', files: { 'instrktr-progress.json': {} } }];
    const gistContent = JSON.stringify({ 'course-a': makeProgress('2024-01-01T00:00:00.000Z') });

    let call = 0;
    stubFetch((_url) => {
      call++;
      if (call === 1) { return { ok: true, status: 200, json: async () => firstPage }; }
      if (call === 2) { return { ok: true, status: 200, json: async () => secondPage }; }
      // call 3: fetch the gist content
      return { ok: true, status: 200, json: async () => ({ files: { 'instrktr-progress.json': { content: gistContent } } }) };
    });

    const result = await new GistSync(makeMemento()).pull('token', {});
    expect(result).not.toBeNull();
    expect(result!['course-a']).toBeDefined();
  });

  it('stops paginating when a page has fewer than 100 items', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await new GistSync(makeMemento()).pull('token', {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a 404 response as a deleted gist (clears cached ID)', async () => {
    const memento = makeMemento();
    memento.get.mockReturnValue('cached-gist-id');

    stubFetch(() => ({ ok: false, status: 404, json: async () => null }));

    const sync = new GistSync(memento);
    await sync.pull('token', {});
    expect(memento.update).toHaveBeenCalledWith('gistSyncId', undefined);
  });
});
