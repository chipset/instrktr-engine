const vscode = acquireVsCodeApi();

const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const courseList = document.getElementById('course-list');

refreshBtn.addEventListener('click', () => {
  showLoading();
  vscode.postMessage({ command: 'refresh' });
});

retryBtn.addEventListener('click', () => {
  showLoading();
  vscode.postMessage({ command: 'refresh' });
});

// Single delegated listener — never re-added on re-render
courseList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) { return; }
  vscode.postMessage({ command: btn.dataset.action, courseId: btn.dataset.id });
});

function showLoading() {
  loadingState.hidden = false;
  errorState.hidden = true;
  courseList.hidden = true;
}

function renderCatalog(courses) {
  loadingState.hidden = true;
  errorState.hidden = true;
  courseList.hidden = false;
  courseList.innerHTML = '';

  if (courses.length === 0) {
    courseList.innerHTML = '<div class="loading-state">No courses found. Check your registry URL in settings.</div>';
    return;
  }

  for (const course of courses) {
    const card = document.createElement('div');
    card.className = 'course-card';

    let badgeHtml = '';
    if (course.badge === 'installed') {
      badgeHtml = `<span class="badge badge-installed">Installed</span>`;
    } else if (course.badge === 'update') {
      badgeHtml = `<span class="badge badge-update">Update v${course.latestVersion}</span>`;
    }

    const tagsHtml = (course.tags ?? [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join('');

    let actionsHtml = '';
    if (course.badge === 'none') {
      actionsHtml = `<button class="btn btn-primary btn-sm" data-action="install" data-id="${esc(course.id)}">Install</button>`;
    } else if (course.badge === 'update') {
      actionsHtml = `
        <button class="btn btn-primary btn-sm" data-action="install" data-id="${esc(course.id)}">Update</button>
        <button class="btn btn-ghost btn-sm" data-action="start" data-id="${esc(course.id)}">Start</button>
        <button class="btn btn-ghost btn-sm btn-danger" data-action="uninstall" data-id="${esc(course.id)}">Remove</button>`;
    } else {
      actionsHtml = `
        <button class="btn btn-ghost btn-sm" data-action="start" data-id="${esc(course.id)}">Start</button>
        <button class="btn btn-ghost btn-sm btn-danger" data-action="uninstall" data-id="${esc(course.id)}">Remove</button>`;
    }

    card.innerHTML = `
      <div class="course-card-title">${esc(course.title)} ${badgeHtml}</div>
      <div class="course-card-desc">${esc(course.description)}</div>
      <div class="course-card-tags">${tagsHtml}</div>
      <div class="course-card-actions">${actionsHtml}</div>`;

    courseList.appendChild(card);
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.command) {
    case 'setCatalog':
      renderCatalog(msg.courses);
      break;
    case 'setError':
      loadingState.hidden = true;
      courseList.hidden = true;
      errorState.hidden = false;
      errorMessage.textContent = msg.message;
      break;
  }
});
