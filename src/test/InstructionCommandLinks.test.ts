import { describe, expect, it } from 'vitest';
import { extractCommandUrisFromInstructions } from '../webview/PanelProvider';

describe('instruction command links', () => {
  it('enables command links referenced by rendered instructions', () => {
    const html = '<p>Open the <a href="command:e4e.endevorPackages.focus">Endevor Packages View</a>.</p>';

    expect(extractCommandUrisFromInstructions(html)).toEqual(['e4e.endevorPackages.focus']);
  });

  it('deduplicates command links and ignores arguments', () => {
    const html = [
      '<a href="command:workbench.action.files.openFile">Open</a>',
      '<a href="command:workbench.action.files.openFile?%5B%5D">Open again</a>',
    ].join('');

    expect(extractCommandUrisFromInstructions(html)).toEqual(['workbench.action.files.openFile']);
  });

  it('does not enable malformed command links', () => {
    const html = '<a href="command:bad command">Bad</a><a href="open:README.md">Readme</a>';

    expect(extractCommandUrisFromInstructions(html)).toEqual([]);
  });
});
