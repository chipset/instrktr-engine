import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Rewrite relative `<img src="...">` in instruction HTML to `vscode-webview:` URIs
 * so images ship inside the course folder. `http:`, `https:`, `data:`, and existing
 * `vscode-webview:` / `file:` URLs are left unchanged.
 */
export function rewriteInstructionImages(
  instructionsHtml: string,
  courseDirFsPath: string | undefined,
  webview: vscode.Webview,
): string {
  if (!courseDirFsPath) {
    return instructionsHtml;
  }
  const courseRoot = path.resolve(courseDirFsPath);
  return instructionsHtml.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    const srcMatch = /\bsrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    if (!srcMatch) {
      return `<img${attrs}>`;
    }
    const quoteChar = srcMatch[1].startsWith('"') ? '"' : "'";
    const src = (srcMatch[2] ?? srcMatch[3] ?? '').trim();
    if (!src || /^(https?:|data:|vscode-webview:|file:)/i.test(src)) {
      return `<img${attrs}>`;
    }
    const abs = path.resolve(courseRoot, src);
    const rel = path.relative(courseRoot, abs);
    if (rel.startsWith('..')) {
      return `<img${attrs}>`;
    }
    try {
      const uri = webview.asWebviewUri(vscode.Uri.file(abs));
      const newAttrs = attrs.replace(srcMatch[0], `src=${quoteChar}${uri.toString()}${quoteChar}`);
      return `<img${newAttrs}>`;
    } catch {
      return `<img${attrs}>`;
    }
  });
}
