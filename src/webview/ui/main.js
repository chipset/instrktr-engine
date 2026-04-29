const vscode = acquireVsCodeApi();

const emptyState = document.getElementById('empty-state');
const emptyError = document.getElementById('empty-error');
const emptyHint = document.getElementById('empty-hint');
const panel = document.getElementById('panel');
const completionScreen = document.getElementById('completion-screen');
const stepProgress = document.getElementById('step-progress');
const courseTitle = document.getElementById('course-title');
const stepTitle = document.getElementById('step-title');
const instructions = document.getElementById('instructions');
const hintsSection = document.getElementById('hints-section');
const hintText = document.getElementById('hint-text');
const hintCounter = document.getElementById('hint-counter');
const nextHintBtn = document.getElementById('next-hint-btn');
const resultEl = document.getElementById('result');
const resultIcon = document.getElementById('result-icon');
const resultMessage = document.getElementById('result-message');
const stepDots = document.getElementById('step-dots');
const authLabel = document.getElementById('auth-label');
const authBtn = document.getElementById('auth-btn');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const hintBtn = document.getElementById('hint-btn');
const compareBtn = document.getElementById('compare-btn');
const completionTitle = document.getElementById('completion-title');
const restartBtn = document.getElementById('restart-btn');

const dismissHintsBtn = document.getElementById('dismiss-hints-btn');

let hints = [];
let currentHint = -1;
let hasSolution = false;
let checkTimeout = null;
let presentationMode = false;
let lastState = null;

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) { el.removeAttribute(attr.name); }
      if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

/** Wrap each fenced-code `<pre>` with a toolbar and Copy control (idempotent). */
function enhanceInstructionCodeBlocks(container) {
  for (const pre of container.querySelectorAll('pre')) {
    if (pre.closest('.instrktr-code-block')) { continue; }
    const wrap = document.createElement('div');
    wrap.className = 'instrktr-code-block';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'instrktr-copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    wrap.insertBefore(btn, pre);
  }
}

function getPrePlainText(pre) {
  const code = pre.querySelector(':scope > code');
  const raw = (code != null ? code.innerText : pre.innerText) || '';
  return raw.replace(/\u00a0/g, ' ');
}

async function copyPreToClipboard(pre) {
  const text = getPrePlainText(pre);
  try {
    if (window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
      await window.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

function applyState(state) {
  lastState = state;
  const loaded = state.loaded ?? false;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // Show completion screen when course is done
  if (state.courseComplete) {
    emptyState.hidden = true;
    panel.hidden = true;
    completionScreen.hidden = false;
    completionTitle.textContent = state.courseTitle;
    return;
  }

  completionScreen.hidden = true;
  emptyState.hidden = loaded;
  panel.hidden = !loaded;
  if (!loaded) {
    if (state.loadError) {
      emptyError.textContent = `Error: ${state.loadError}`;
      emptyError.hidden = false;
      emptyHint.hidden = true;
    } else {
      emptyError.hidden = true;
      emptyHint.hidden = false;
    }
    return;
  }

  stepProgress.textContent = `Step ${state.stepIndex + 1} of ${state.totalSteps}`;
  courseTitle.textContent = state.courseTitle;
  stepTitle.textContent = state.title;
  instructions.innerHTML = sanitizeHtml(state.instructionsHtml);
  enhanceInstructionCodeBlocks(instructions);

  // Render step dots — clickable
  stepDots.innerHTML = '';
  for (let i = 0; i < state.totalSteps; i++) {
    const dot = document.createElement('button');
    const done = (state.completedSteps ?? []).includes(i);
    const current = i === state.stepIndex;
    dot.className = 'step-dot' + (done ? ' done' : current ? ' current' : '');
    dot.title = `Jump to step ${i + 1}`;
    dot.dataset.stepIndex = String(i);
    dot.setAttribute('aria-label', `Step ${i + 1}`);
    stepDots.appendChild(dot);
  }

  hints = presentationMode ? [] : (state.hints ?? []);
  currentHint = -1;
  hintsSection.hidden = true;
  hintBtn.hidden = presentationMode || hints.length === 0;
  hasSolution = !presentationMode && (state.hasSolution ?? false);

  prevBtn.hidden = state.stepIndex === 0;

  // Clear any pending check timeout on navigation
  if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }

  // Clear result on every state change (step navigation)
  resultEl.hidden = true;
  resultEl.className = 'result';
  compareBtn.hidden = true;

  if (presentationMode) {
    checkBtn.hidden = false;
    checkBtn.disabled = false;
    checkBtn.textContent = 'Next';
    nextBtn.hidden = true;
    return;
  }

  if (!state.hasValidator) {
    // No validator — skip the check ceremony, go straight to Next Step
    checkBtn.hidden = true;
    nextBtn.hidden = false;
  } else {
    checkBtn.hidden = false;
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check My Work';
    nextBtn.hidden = true;

    if (state.result) {
      showResult(state.result);
    }
  }
}

function showResult(result) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
  resultEl.className = `result ${result.status}`;
  resultEl.hidden = false;
  resultIcon.textContent = icons[result.status] ?? '';
  resultMessage.textContent = result.message;

  if (result.status === 'pass') {
    checkBtn.hidden = true;
    nextBtn.hidden = false;
    compareBtn.hidden = true;
  } else {
    checkBtn.hidden = false;
    nextBtn.hidden = true;
    compareBtn.hidden = presentationMode || !hasSolution;
  }
}

// Copy buttons and open: links inside rendered instructions
instructions.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.instrktr-copy-btn');
  if (copyBtn) {
    e.preventDefault();
    const block = copyBtn.closest('.instrktr-code-block');
    const pre = block && block.querySelector('pre');
    if (!pre) { return; }
    const prevLabel = copyBtn.getAttribute('aria-label');
    copyPreToClipboard(pre).then((ok) => {
      copyBtn.textContent = ok ? 'Copied' : 'Failed';
      copyBtn.setAttribute('aria-label', ok ? 'Copied to clipboard' : 'Copy failed');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.setAttribute('aria-label', prevLabel || 'Copy code to clipboard');
      }, 2000);
    });
    return;
  }
  const link = e.target.closest('a[href^="open:"]');
  if (!link) { return; }
  e.preventDefault();
  const filePath = link.getAttribute('href').slice('open:'.length);
  vscode.postMessage({ command: 'openFile', path: filePath });
});

// Step dot click-to-jump
stepDots.addEventListener('click', (e) => {
  const dot = e.target.closest('.step-dot[data-step-index]');
  if (!dot) { return; }
  vscode.postMessage({ command: 'jumpToStep', index: parseInt(dot.dataset.stepIndex, 10) });
});

checkBtn.addEventListener('click', () => {
  if (presentationMode) {
    vscode.postMessage({ command: 'nextStep' });
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking…';
  vscode.postMessage({ command: 'checkWork' });
  checkTimeout = setTimeout(() => {
    checkTimeout = null;
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check My Work';
    showResult({ status: 'fail', message: 'Validator timed out. Try again or reload the panel.' });
  }, 35_000);
});

nextBtn.addEventListener('click', () => {
  vscode.postMessage({ command: 'nextStep' });
});

prevBtn.addEventListener('click', () => {
  vscode.postMessage({ command: 'previousStep' });
});

hintBtn.addEventListener('click', () => {
  currentHint = 0;
  hintText.textContent = hints[currentHint];
  hintsSection.hidden = false;
  nextHintBtn.hidden = currentHint >= hints.length - 1;
  hintCounter.textContent = `${currentHint + 1} / ${hints.length}`;
  hintBtn.hidden = true;
});

dismissHintsBtn.addEventListener('click', () => {
  hintsSection.hidden = true;
  hintBtn.hidden = hints.length === 0;
});

nextHintBtn.addEventListener('click', () => {
  currentHint = Math.min(currentHint + 1, hints.length - 1);
  hintText.textContent = hints[currentHint];
  nextHintBtn.hidden = currentHint >= hints.length - 1;
  hintCounter.textContent = `${currentHint + 1} / ${hints.length}`;
});

compareBtn.addEventListener('click', () => {
  vscode.postMessage({ command: 'openSolution' });
});

restartBtn.addEventListener('click', () => {
  vscode.postMessage({ command: 'restartCourse' });
});

function applyPresentationMode(enabled) {
  presentationMode = !!enabled;
  document.body.classList.toggle('presentation-mode', presentationMode);
  if (presentationMode) {
    hintsSection.hidden = true;
    hintBtn.hidden = true;
    compareBtn.hidden = true;
  }
  if (lastState) {
    applyState(lastState);
  }
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.command) {
    case 'setState':
      applyState(msg.state);
      break;
    case 'setPresentationMode':
      applyPresentationMode(msg.presentationMode);
      break;
    case 'setAuth':
      applyAuth(msg.auth);
      break;
    case 'checkResult':
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      checkBtn.disabled = false;
      checkBtn.textContent = presentationMode ? 'Next' : 'Check My Work';
      if (!presentationMode) { showResult(msg.result); }
      break;
  }
});

authBtn.addEventListener('click', () => {
  vscode.postMessage({ command: authBtn.dataset.action });
});

function applyAuth(auth) {
  if (auth.signedIn) {
    authLabel.textContent = `Signed in as ${auth.username}`;
    authBtn.textContent = 'Sign out';
    authBtn.dataset.action = 'signOut';
    authBtn.title = '';
  } else {
    authLabel.textContent = 'Sign in to sync progress';
    authBtn.textContent = 'Sign in';
    authBtn.dataset.action = 'signIn';
    if (auth.error) {
      authLabel.textContent = `Sign-in failed: ${auth.error}`;
    }
  }
}

vscode.postMessage({ command: 'ready' });
