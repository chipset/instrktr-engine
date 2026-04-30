#!/usr/bin/env node
'use strict';

const http = require('http');

const PORT = process.env.PORT || 3737;

// Key: GitHub login or "anon:<ip>" → StudentState
const students = Object.create(null);

// Active SSE response objects
const sseClients = new Set();

function broadcast(eventName, data) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { /* disconnected */ }
  }
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) { return fwd.split(',')[0].trim(); }
  return req.socket.remoteAddress || 'unknown';
}

function handleWebhookEvent(payload, ip) {
  const key = payload.user.login || `anon:${ip}`;

  if (!students[key]) {
    students[key] = {
      displayName: payload.user.login || ip,
      course: null,
      currentStep: null,
      stepSummary: {},
      lastSeen: null,
    };
  }

  const s = students[key];
  s.course = payload.course;
  s.currentStep = payload.step;
  s.lastSeen = payload.timestamp;

  const idx = payload.step.index;
  if (!s.stepSummary[idx]) {
    s.stepSummary[idx] = { passed: false, failCount: 0, solutionViewed: false };
  }
  const stepState = s.stepSummary[idx];

  switch (payload.event) {
    case 'step.pass':
      stepState.passed = true;
      break;
    case 'step.check.failed':
      stepState.failCount++;
      break;
    case 'step.solution.viewed':
      stepState.solutionViewed = true;
      break;
  }

  broadcast('update', { key, student: s });
}

// ---------------------------------------------------------------------------
// Dashboard HTML (served at GET /)
// ---------------------------------------------------------------------------

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instrktr Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1e1e1e; color: #d4d4d4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; line-height: 1.5;
    }
    header {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 24px; border-bottom: 1px solid #333;
      background: #252526;
    }
    header h1 { font-size: 15px; font-weight: 600; color: #e8e8e8; flex: 1; }
    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #3c3c3c; transition: background 0.3s;
    }
    .live-dot.connected { background: #4ec9b0; }
    .conn-label { font-size: 12px; color: #666; }
    .conn-label.connected { color: #4ec9b0; }
    .conn-label.error { color: #f44747; }
    .student-count { font-size: 12px; color: #888; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; padding: 8px 16px;
      color: #888; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
      border-bottom: 1px solid #333; background: #252526;
      position: sticky; top: 0;
    }
    tbody tr { border-bottom: 1px solid #2a2a2a; }
    tbody tr:hover td { background: #2a2a2a; }
    td { padding: 10px 16px; vertical-align: middle; }
    .name { font-weight: 500; color: #9cdcfe; }
    .course-name { color: #c8c8c8; font-size: 12px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .step-label { color: #ce9178; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .step-num { font-weight: 600; color: #d4d4d4; }
    .dots { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
    .dot {
      width: 11px; height: 11px; border-radius: 50%;
      background: #3c3c3c; flex-shrink: 0;
      transition: background 0.2s;
    }
    .dot.pass { background: #4ec9b0; }
    .dot.active { background: #569cd6; }
    .dot.fail { background: #f44747; }
    .dot.solution { background: #dcdcaa; }
    .badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      padding: 1px 7px; border-radius: 3px; white-space: nowrap;
    }
    .badge-fail { background: #5a1d1d; color: #f48771; }
    .badge-solution { background: #353000; color: #dcdcaa; }
    .badge-none { color: #555; }
    .time { color: #666; font-size: 12px; white-space: nowrap; }
    .empty {
      text-align: center; padding: 80px 24px; color: #555;
    }
    .empty h2 { font-size: 16px; font-weight: 400; margin-bottom: 8px; color: #666; }
    .empty p { font-size: 13px; }
    .empty code {
      background: #2d2d2d; padding: 2px 6px; border-radius: 3px;
      color: #9cdcfe; font-family: 'Cascadia Code', 'Fira Code', monospace;
    }
  </style>
</head>
<body>
<header>
  <div class="live-dot" id="live-dot"></div>
  <h1>Instrktr Live Dashboard</h1>
  <span class="student-count" id="student-count"></span>
  <span class="conn-label" id="conn-label">connecting…</span>
</header>

<div id="empty-state" class="empty">
  <h2>Waiting for learners…</h2>
  <p>Have learners set <code>instrktr.webhookUrl</code> to <code>http://&lt;your-ip&gt;:${PORT}/webhook</code></p>
</div>

<table id="table" hidden>
  <thead>
    <tr>
      <th>Student</th>
      <th>Course</th>
      <th>Current Step</th>
      <th>Progress</th>
      <th>Failed Checks</th>
      <th>Solution</th>
      <th>Last Seen</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>

<script>
  const students = {};

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function relTime(iso) {
    if (!iso) { return '—'; }
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 5000)   { return 'just now'; }
    if (ms < 60000)  { return Math.floor(ms / 1000) + 's ago'; }
    if (ms < 3600000){ return Math.floor(ms / 60000) + 'm ago'; }
    return Math.floor(ms / 3600000) + 'h ago';
  }

  function buildDots(s) {
    const total = s.currentStep?.total || 0;
    if (!total) { return ''; }
    let html = '<div class="dots">';
    for (let i = 0; i < total; i++) {
      const sum = s.stepSummary[i] || {};
      const isCurrent = i === s.currentStep?.index;
      let cls = 'dot';
      if (sum.passed) {
        cls += ' pass';
      } else if (isCurrent) {
        cls += sum.failCount > 0 ? ' fail' : ' active';
      }
      if (!sum.passed && sum.solutionViewed) { cls += ' solution'; }
      html += \`<span class="\${cls}" title="Step \${i + 1}"></span>\`;
    }
    return html + '</div>';
  }

  function buildRow(key, s) {
    const step = s.currentStep;
    const sum = step ? (s.stepSummary[step.index] || {}) : {};
    const stepNum = step ? \`\${step.index + 1} / \${step.total}\` : '—';
    const stepTitle = step?.title || '';
    const failBadge = sum.failCount > 0
      ? \`<span class="badge badge-fail">\${sum.failCount}✗</span>\`
      : '<span class="badge-none">—</span>';
    const solBadge = sum.solutionViewed
      ? '<span class="badge badge-solution">viewed</span>'
      : '<span class="badge-none">—</span>';
    return \`<tr data-key="\${esc(key)}">
      <td><span class="name">\${esc(s.displayName)}</span></td>
      <td><span class="course-name" title="\${esc(s.course?.title)}">\${esc(s.course?.title || '—')}</span></td>
      <td>
        <span class="step-num">\${esc(stepNum)}</span>
        \${stepTitle ? \`<br><span class="step-label" title="\${esc(stepTitle)}">\${esc(stepTitle)}</span>\` : ''}
      </td>
      <td>\${buildDots(s)}</td>
      <td>\${failBadge}</td>
      <td>\${solBadge}</td>
      <td class="time">\${relTime(s.lastSeen)}</td>
    </tr>\`;
  }

  function render() {
    const keys = Object.keys(students);
    const empty = document.getElementById('empty-state');
    const table = document.getElementById('table');
    const tbody = document.getElementById('tbody');
    const count = document.getElementById('student-count');

    count.textContent = keys.length > 0 ? keys.length + ' learner' + (keys.length > 1 ? 's' : '') : '';

    if (keys.length === 0) {
      empty.hidden = false;
      table.hidden = true;
      return;
    }
    empty.hidden = true;
    table.hidden = false;

    const sorted = keys.slice().sort((a, b) =>
      new Date(students[b].lastSeen || 0) - new Date(students[a].lastSeen || 0)
    );
    tbody.innerHTML = sorted.map(k => buildRow(k, students[k])).join('');
  }

  const es = new EventSource('/events');

  es.onopen = () => {
    document.getElementById('live-dot').className = 'live-dot connected';
    document.getElementById('conn-label').textContent = 'live';
    document.getElementById('conn-label').className = 'conn-label connected';
  };
  es.onerror = () => {
    document.getElementById('live-dot').className = 'live-dot';
    document.getElementById('conn-label').textContent = 'reconnecting…';
    document.getElementById('conn-label').className = 'conn-label error';
  };

  es.addEventListener('snapshot', (e) => {
    const data = JSON.parse(e.data);
    Object.keys(data).forEach(k => { students[k] = data[k]; });
    render();
  });

  es.addEventListener('update', (e) => {
    const { key, student } = JSON.parse(e.data);
    students[key] = student;
    render();
  });

  // Refresh relative timestamps every 30s without a full re-render
  setInterval(() => {
    document.querySelectorAll('.time').forEach((el, i) => {
      const key = Object.keys(students).sort((a, b) =>
        new Date(students[b].lastSeen || 0) - new Date(students[a].lastSeen || 0)
      )[i];
      if (key) { el.textContent = relTime(students[key].lastSeen); }
    });
  }, 30000);
</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const ip = getClientIp(req);

  // Dashboard UI
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD_HTML);
    return;
  }

  // SSE stream for live updates
  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });
    // Initial flush so the browser marks the connection open
    res.write(': ping\n\n');
    // Send full current state to this new client
    res.write(`event: snapshot\ndata: ${JSON.stringify(students)}\n\n`);

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Webhook receiver
  if (req.method === 'POST' && req.url === '/webhook') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) { body = ''; req.socket.destroy(); }
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (
          typeof payload.event !== 'string' ||
          typeof payload.course?.id !== 'string' ||
          typeof payload.step?.index !== 'number'
        ) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request');
          return;
        }
        handleWebhookEvent(payload, ip);
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
      }
    });
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  const ifaces = require('os').networkInterfaces();
  const lan = Object.values(ifaces).flat().find(i => i.family === 'IPv4' && !i.internal)?.address;
  console.log(`\nInstrktr Dashboard`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (lan) { console.log(`  Network: http://${lan}:${PORT}`); }
  console.log(`\nReceiving webhooks at POST /webhook`);
  console.log(`Set instrktr.webhookUrl to http://<this-machine-ip>:${PORT}/webhook in each learner's VS Code settings.\n`);
});
