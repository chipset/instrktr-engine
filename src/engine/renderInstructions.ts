import hljs from 'highlight.js';
import { marked, type MarkedExtension } from 'marked';
import type { Tokens } from 'marked';

function escapeLangClass(lang: string): string {
  return lang.replace(/[^a-zA-Z0-9_-]/g, '') || 'plaintext';
}

function highlightCodeBlock(text: string, langRaw?: string): { value: string; langClass: string } {
  const lang = (langRaw ?? '').trim().split(/\s+/)[0] ?? '';
  if (lang && hljs.getLanguage(lang)) {
    try {
      return { value: hljs.highlight(text, { language: lang }).value, langClass: escapeLangClass(lang) };
    } catch {
      /* fall through */
    }
  }
  const auto = hljs.highlightAuto(text);
  const label = auto.language ? escapeLangClass(auto.language) : 'plaintext';
  return { value: auto.value, langClass: label };
}

const instructionMarkdownExtension: MarkedExtension = {
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      const { value, langClass } = highlightCodeBlock(text, lang);
      return `<pre><code class="hljs language-${langClass}">${value}</code></pre>\n`;
    },
  },
};

let extensionInstalled = false;

function ensureInstructionMarkdownConfigured(): void {
  if (extensionInstalled) {
    return;
  }
  marked.use(instructionMarkdownExtension);
  extensionInstalled = true;
}

/**
 * Render step instruction Markdown to HTML, including syntax-highlighted fenced code.
 */
export async function renderInstructionsMarkdown(markdown: string): Promise<string> {
  ensureInstructionMarkdownConfigured();
  const out = marked.parse(markdown);
  return typeof out === 'string' ? out : await out;
}
