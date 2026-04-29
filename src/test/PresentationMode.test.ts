import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('presentation mode contribution', () => {
  const root = path.resolve(__dirname, '..', '..');

  it('contributes the instrktr.presentationMode setting', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ) as {
      contributes?: {
        configuration?: {
          properties?: Record<string, { type?: string; default?: unknown }>;
        };
      };
    };

    const setting = manifest.contributes?.configuration?.properties?.['instrktr.presentationMode'];
    expect(setting).toBeDefined();
    expect(setting?.type).toBe('boolean');
    expect(setting?.default).toBe(false);
  });

  it('wires presentation mode into the webview UI', () => {
    const mainJs = fs.readFileSync(path.join(root, 'src/webview/ui/main.js'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'src/webview/ui/styles.css'), 'utf8');

    expect(mainJs).toContain("case 'setPresentationMode'");
    expect(mainJs).toContain("checkBtn.textContent = 'Next'");
    expect(mainJs).toContain("vscode.postMessage({ command: 'nextStep' })");
    expect(mainJs).toContain('presentationMode || !hasSolution');
    expect(styles).toContain('body.presentation-mode .auth-bar');
  });

  it('bypasses validator execution in presentation mode command paths', () => {
    const panelProvider = fs.readFileSync(path.join(root, 'src/webview/PanelProvider.ts'), 'utf8');
    const extension = fs.readFileSync(path.join(root, 'src/extension.ts'), 'utf8');

    expect(panelProvider).toContain('if (this._presentationMode)');
    expect(panelProvider).toContain('await this._runner.nextStep();');
    expect(extension).toContain('if (isPresentationMode())');
    expect(extension).toContain('await runner.nextStep();');
  });
});
