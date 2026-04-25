import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{"version":"0.0.0"}'),
}));

import * as fsp from 'fs/promises';
import { CourseLoader } from '../engine/CourseLoader';

const validManifest = {
  id: 'test',
  title: 'Test Course',
  version: '1.0.0',
  engineVersion: '>=0.0.0',
  steps: [
    { id: 'step-1', title: 'Step 1', instructions: 'step1.md', hints: [] },
  ],
};

function mockReadFile(content: unknown) {
  vi.mocked(fsp.readFile).mockResolvedValue(
    Buffer.from(JSON.stringify(content)) as never,
  );
}

describe('CourseLoader', () => {
  let loader: CourseLoader;

  beforeEach(() => {
    loader = new CourseLoader();
    vi.clearAllMocks();
    vi.mocked(fsp.readFile).mockResolvedValue(
      Buffer.from(JSON.stringify(validManifest)) as never,
    );
  });

  it('loads a valid manifest', async () => {
    const course = await loader.load('/some/course');
    expect(course.id).toBe('test');
    expect(course.steps).toHaveLength(1);
  });

  it('throws when course.json is missing', async () => {
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'));
    await expect(loader.load('/bad/path')).rejects.toThrow('No course.json found');
  });

  it('throws when course.json is invalid JSON', async () => {
    vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from('not json') as never);
    await expect(loader.load('/bad/path')).rejects.toThrow('not valid JSON');
  });

  it('throws when course.json is not an object', async () => {
    mockReadFile([1, 2, 3]);
    await expect(loader.load('/bad')).rejects.toThrow('must be a JSON object');
  });

  it('throws when a required top-level field is missing', async () => {
    const { title: _dropped, ...noTitle } = validManifest;
    mockReadFile(noTitle);
    await expect(loader.load('/bad')).rejects.toThrow('missing required field: "title"');
  });

  it('throws when steps is empty', async () => {
    mockReadFile({ ...validManifest, steps: [] });
    await expect(loader.load('/bad')).rejects.toThrow('"steps" must be a non-empty array');
  });

  it('throws when steps is not an array', async () => {
    mockReadFile({ ...validManifest, steps: 'not-array' });
    await expect(loader.load('/bad')).rejects.toThrow('"steps" must be a non-empty array');
  });

  it('throws when a step is missing a required field', async () => {
    mockReadFile({
      ...validManifest,
      steps: [{ id: 'step-1', title: 'Step 1' }], // missing instructions
    });
    await expect(loader.load('/bad')).rejects.toThrow('Step 0 missing required field: "instructions"');
  });

  it('throws when a step is not an object', async () => {
    mockReadFile({ ...validManifest, steps: ['not-object'] });
    await expect(loader.load('/bad')).rejects.toThrow('Step 0 is not a valid object');
  });
});
