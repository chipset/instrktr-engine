import { describe, expect, it } from 'vitest';
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
