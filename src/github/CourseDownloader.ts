import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yauzl from 'yauzl';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class CourseDownloader {
  private readonly _coursesDir: string;

  constructor(storageUri: vscode.Uri) {
    this._coursesDir = path.join(storageUri.fsPath, 'courses');
  }

  courseDir(courseId: string, version: string): string {
    return path.join(this._coursesDir, `${courseId}@${version}`);
  }

  isDownloaded(courseId: string, version: string): boolean {
    try {
      fsSync.accessSync(this.courseDir(courseId, version));
      return true;
    } catch {
      return false;
    }
  }

  async download(
    repo: string,
    courseId: string,
    version: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
  ): Promise<string> {
    const dest = this.courseDir(courseId, version);

    if (this.isDownloaded(courseId, version)) {
      return dest;
    }

    await fs.mkdir(this._coursesDir, { recursive: true });

    progress.report({ message: 'Downloading…', increment: 0 });

    const gitAvailable = await this._isGitAvailable();
    if (gitAvailable) {
      await this._cloneRepo(repo, version, dest);
    } else {
      const url = `https://github.com/${repo}/archive/refs/tags/v${version}.zip`;
      const zipBuffer = await this._fetchZip(url, progress); // reports 0–70

      progress.report({ message: 'Extracting…', increment: 0 });

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instrktr-'));
      try {
        await this._extractZip(zipBuffer, tmpDir);

        // Detect the actual top-level dir GitHub puts in the zip
        const entries = await fs.readdir(tmpDir, { withFileTypes: true });
        const topLevelDir = entries.find((e) => e.isDirectory());
        if (!topLevelDir) {
          throw new Error('Downloaded zip contained no top-level directory');
        }
        const topLevel = path.join(tmpDir, topLevelDir.name);

        await fs.rm(dest, { recursive: true, force: true });
        await fs.rename(topLevel, dest);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    }

    progress.report({ message: 'Done', increment: 100 });
    return dest;
  }

  async uninstall(courseId: string, version: string): Promise<void> {
    const dir = this.courseDir(courseId, version);
    await fs.rm(dir, { recursive: true, force: true });
  }

  private async _isGitAvailable(): Promise<boolean> {
    try {
      await execFileAsync('git', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  private async _cloneRepo(repo: string, version: string, dest: string): Promise<void> {
    // repo is already validated as "org/repo" by RegistryFetcher
    const url = `https://github.com/${repo}.git`;
    await fs.rm(dest, { recursive: true, force: true });
    await execFileAsync('git', [
      'clone', '--depth', '1', '--branch', `v${version}`, url, dest,
    ]);
    // Remove .git dir: prevents hook execution, hides credentials, saves disk
    await fs.rm(path.join(dest, '.git'), { recursive: true, force: true });
  }

  private async _fetchZip(
    url: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
  ): Promise<Buffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} downloading ${url}`);
    }

    const total = Number(response.headers.get('content-length') ?? 0);
    const chunks: Uint8Array[] = [];

    const reader = response.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) { break; }
      chunks.push(value);
      if (total > 0) {
        // Download phase gets 70% of the progress bar
        progress.report({ increment: Math.round((value.length / total) * 70) });
      }
    }

    return Buffer.concat(chunks);
  }

  private _extractZip(buffer: Buffer, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) { return reject(err ?? new Error('Failed to open zip')); }

        zipfile.readEntry();

        zipfile.on('entry', async (entry: yauzl.Entry) => {
          try {
            const safeBase = path.resolve(destDir);
            const entryPath = path.resolve(destDir, entry.fileName);
            if (!entryPath.startsWith(safeBase + path.sep) && entryPath !== safeBase) {
              zipfile.readEntry(); // skip zip-slip entries
              return;
            }

            if (/\/$/.test(entry.fileName)) {
              await fs.mkdir(entryPath, { recursive: true });
              zipfile.readEntry();
              return;
            }

            await fs.mkdir(path.dirname(entryPath), { recursive: true });

            zipfile.openReadStream(entry, (streamErr, readStream) => {
              if (streamErr || !readStream) {
                return reject(streamErr ?? new Error('Failed to open entry stream'));
              }
              const writeStream = fsSync.createWriteStream(entryPath);
              readStream.pipe(writeStream);
              writeStream.on('finish', () => zipfile.readEntry());
              writeStream.on('error', reject);
            });
          } catch (err) {
            reject(err);
          }
        });

        zipfile.on('end', resolve);
        zipfile.on('error', reject);
      });
    });
  }
}
