import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Zowe Gulp Mocha course formatting', () => {
  const root = path.resolve(__dirname, '..', '..');
  const courseDir = path.join(root, 'course-zowe-gulp-mocha', 'steps');

  it('labels every fenced code block for syntax highlighting', () => {
    const instructionFiles = fs.readdirSync(courseDir)
      .map((stepDir) => path.join(courseDir, stepDir, 'instructions.md'))
      .filter((file) => fs.existsSync(file));

    const unlabeledOpenings: string[] = [];
    for (const file of instructionFiles) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      let inFence = false;
      lines.forEach((line, index) => {
        if (!line.startsWith('```')) { return; }
        if (!inFence && line.trim() === '```') {
          unlabeledOpenings.push(`${path.relative(root, file)}:${index + 1}`);
        }
        inFence = !inFence;
      });
    }

    expect(unlabeledOpenings).toEqual([]);
  });

  it('ships lightweight syntax highlighting for rendered course code blocks', () => {
    const mainJs = fs.readFileSync(path.join(root, 'src/webview/ui/main.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'src/webview/ui/styles.css'), 'utf8');

    expect(mainJs).toContain('function highlightCodeBlocks');
    expect(mainJs).toContain('highlightCodeBlocks(instructions)');
    expect(styles).toContain('.tok-keyword');
    expect(styles).toContain('.tok-string');
  });
});
