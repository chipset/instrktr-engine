import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { rewriteInstructionImages } from '../webview/rewriteInstructionImages';

describe('rewriteInstructionImages', () => {
  const webview = {
    asWebviewUri(uri: vscode.Uri) {
      return vscode.Uri.parse(`vscode-webview://test/${encodeURIComponent(uri.fsPath)}`);
    },
  } as vscode.Webview;

  const courseRoot = path.join(os.tmpdir(), 'instrktr-rewrite-course');

  it('leaves https and data URIs unchanged', () => {
    const html = '<p><img src="https://ex.example/x.png"><img src="data:image/png;base64,xx"></p>';
    const out = rewriteInstructionImages(html, courseRoot, webview);
    expect(out).toBe(html);
  });

  it('rewrites relative src under the course directory', () => {
    const html = '<img alt="d" src="steps/01/diagram.png">';
    const out = rewriteInstructionImages(html, courseRoot, webview);
    expect(out).toContain('vscode-webview://test/');
    expect(out).not.toContain('src="steps/01/diagram.png"');
  });

  it('does not rewrite paths that escape the course root', () => {
    const html = '<img src="../../etc/passwd">';
    const out = rewriteInstructionImages(html, courseRoot, webview);
    expect(out).toBe(html);
  });
});
