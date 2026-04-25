import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildContext } from '../context/ValidatorContext';
import { workspace, Uri } from '../__mocks__/vscode';

const ROOT = '/workspace/project';
const workspaceRoot = Uri.file(ROOT);

const terminalStub = {
  lastCommand: async () => '',
  outputContains: async () => false,
  run: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
};

describe('ValidatorContext path traversal protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves safe paths without throwing', async () => {
    workspace.fs.stat.mockResolvedValue({});
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    await expect(ctx.files.exists('src/index.ts')).resolves.toBe(true);
  });

  it('files.read throws for paths that escape workspace root', async () => {
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    await expect(ctx.files.read('../../../etc/passwd')).rejects.toThrow('escapes the workspace root');
  });

  it('files.exists returns false (caught) for paths that escape workspace root', async () => {
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    const result = await ctx.files.exists('../../../etc/passwd');
    expect(result).toBe(false);
  });

  it('files.matches returns false (caught) for paths that escape workspace root', async () => {
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    const result = await ctx.files.matches('../../../etc/passwd', /root/);
    expect(result).toBe(false);
  });

  it('files.list returns [] (caught) for paths that escape workspace root', async () => {
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    const result = await ctx.files.list('../../..');
    expect(result).toEqual([]);
  });

  it('absolute paths outside root are blocked', async () => {
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    await expect(ctx.files.read('/etc/passwd')).rejects.toThrow('escapes the workspace root');
  });
});

describe('ValidatorContext pass/fail/warn helpers', () => {
  const ctx = buildContext(workspaceRoot as never, terminalStub);

  it('pass returns status pass', () => {
    expect(ctx.pass('ok')).toEqual({ status: 'pass', message: 'ok' });
  });

  it('fail returns status fail', () => {
    expect(ctx.fail('nope')).toEqual({ status: 'fail', message: 'nope' });
  });

  it('warn returns status warn', () => {
    expect(ctx.warn('maybe')).toEqual({ status: 'warn', message: 'maybe' });
  });
});

describe('ValidatorContext env.get', () => {
  it('reads from process.env', () => {
    process.env['TEST_VAR_XYZ'] = 'hello';
    const ctx = buildContext(workspaceRoot as never, terminalStub);
    expect(ctx.env.get('TEST_VAR_XYZ')).toBe('hello');
    delete process.env['TEST_VAR_XYZ'];
  });
});
