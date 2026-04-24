const vscode = acquireVsCodeApi();

const emptyState = document.getElementById('empty-state');
const panel = document.getElementById('panel');
const stepProgress = document.getElementById('step-progress');
const courseTitle = document.getElementById('course-title');
const stepTitle = document.getElementById('step-title');
const instructions = document.getElementById('instructions');
const hintsSection = document.getElementById('hints-section');
const hintText = document.getElementById('hint-text');
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

let hints = [];
let currentHint = -1;

function applyState(state) {
  const loaded = state.loaded ?? false;
  emptyState.hidden = loaded;
  panel.hidden = !loaded;
  if (!loaded) { return; }

  stepProgress.textContent = `Step ${state.stepIndex + 1} of ${state.totalSteps}`;
  courseTitle.textContent = state.courseTitle;
  stepTitle.textContent = state.title;
  instructions.innerHTML = state.instructionsHtml;

  // Render step dots
  stepDots.innerHTML = '';
  for (let i = 0; i < state.totalSteps; i++) {
    const dot = document.createElement('div');
    const done = (state.completedSteps ?? []).includes(i);
    const current = i === state.stepIndex;
    dot.className = 'step-dot' + (done ? ' done' : current ? ' current' : '');
    dot.title = `Step ${i + 1}`;
    stepDots.appendChild(dot);
  }

  hints = state.hints ?? [];
  currentHint = -1;
  hintsSection.hidden = true;
  hintBtn.hidden = hints.length === 0;

  prevBtn.hidden = state.stepIndex === 0;
  resultEl.hidden = true;
  checkBtn.hidden = false;
  nextBtn.hidden = true;

  if (state.result) {
    showResult(state.result);
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
  } else {
    checkBtn.hidden = false;
    nextBtn.hidden = true;
  }
}

// Intercept open: links inside rendered instructions
instructions.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="open:"]');
  if (!link) { return; }
  e.preventDefault();
  const filePath = link.getAttribute('href').slice('open:'.length);
  vscode.postMessage({ command: 'openFile', path: filePath });
});

checkBtn.addEventListener('click', () => {
  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking…';
  vscode.postMessage({ command: 'checkWork' });
});

nextBtn.addEventListener('click', () => {
  resultEl.hidden = true;
  nextBtn.hidden = true;
  checkBtn.hidden = false;
  vscode.postMessage({ command: 'nextStep' });
});

prevBtn.addEventListener('click', () => {
  resultEl.hidden = true;
  nextBtn.hidden = true;
  checkBtn.hidden = false;
  vscode.postMessage({ command: 'previousStep' });
});

hintBtn.addEventListener('click', () => {
  currentHint = 0;
  hintText.textContent = hints[currentHint];
  hintsSection.hidden = false;
  nextHintBtn.hidden = currentHint >= hints.length - 1;
  hintBtn.hidden = true;
});

nextHintBtn.addEventListener('click', () => {
  currentHint = Math.min(currentHint + 1, hints.length - 1);
  hintText.textContent = hints[currentHint];
  nextHintBtn.hidden = currentHint >= hints.length - 1;
});

window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.command) {
    case 'setState':
      applyState(msg.state);
      break;
    case 'setAuth':
      applyAuth(msg.auth);
      break;
    case 'checkResult':
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check My Work';
      showResult(msg.result);
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
  } else {
    authLabel.textContent = 'Sign in to sync progress';
    authBtn.textContent = 'Sign in';
    authBtn.dataset.action = 'signIn';
  }
}

vscode.postMessage({ command: 'ready' });
