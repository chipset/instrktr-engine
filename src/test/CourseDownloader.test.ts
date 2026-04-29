import { afterEach, describe, expect, it, vi } from 'vitest';
import { Uri } from '../__mocks__/vscode';
import { CourseDownloader } from '../github/CourseDownloader';

describe('CourseDownloader path guards', () => {
  it('builds course directories under the courses storage root', () => {
    const downloader = new CourseDownloader(Uri.file('/storage') as never);
    expect(downloader.courseDir('safe-course', '1.0.0')).toBe('/storage/courses/safe-course@1.0.0');
  });

  it('rejects course ids that escape the courses storage root', () => {
    const downloader = new CourseDownloader(Uri.file('/storage') as never);
    expect(() => downloader.courseDir('../escape', '1.0.0')).toThrow('escapes the courses directory');
  });
});


describe('CourseDownloader download guards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects oversized course archives before buffering the response body', async () => {
    const downloader = new CourseDownloader(Uri.file('/storage') as never);
    const progress = { report: vi.fn() };
    const reader = { read: vi.fn() };
    const oversizedBytes = String(101 * 1024 * 1024);

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: (name: string) => name === 'content-length' ? oversizedBytes : null },
      body: { getReader: () => reader },
    })));

    await expect(
      (downloader as unknown as {
        _fetchZip(url: string, progress: { report: ReturnType<typeof vi.fn> }): Promise<Buffer>;
      })._fetchZip('https://github.com/example/course/archive/refs/tags/v1.0.0.zip', progress),
    ).rejects.toThrow('100 MiB size limit');
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('rejects streamed archives that exceed the size limit without a content-length header', async () => {
    const downloader = new CourseDownloader(Uri.file('/storage') as never);
    const progress = { report: vi.fn() };
    const chunks = [new Uint8Array(100 * 1024 * 1024), new Uint8Array(1)];
    const reader = {
      read: vi.fn(async () => chunks.length
        ? { done: false, value: chunks.shift() }
        : { done: true, value: undefined }),
    };

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => null },
      body: { getReader: () => reader },
    })));

    await expect(
      (downloader as unknown as {
        _fetchZip(url: string, progress: { report: ReturnType<typeof vi.fn> }): Promise<Buffer>;
      })._fetchZip('https://github.com/example/course/archive/refs/tags/v1.0.0.zip', progress),
    ).rejects.toThrow('100 MiB size limit');
  });
});
