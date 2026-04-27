# CommonJS Modules

Node.js uses the **CommonJS** module system. Every `.js` file is its own module — nothing is shared unless explicitly exported and imported. This is how `require('gulp')` and `require('./src/endevor')` work in the Zowe course.

## Exporting

Use `module.exports` to share values from a file:

```js
// utils.js
function buildUrl(host, port, useHttps) {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

function formatElement(el) {
  return `${el.elmName} (${el.type})`;
}

module.exports = { buildUrl, formatElement };
```

## Importing

Use `require()` to load exports from another file:

```js
// app.js
const { buildUrl, formatElement } = require('./utils');

console.log(buildUrl('mainframe.example.com', 8080, true));
console.log(formatElement({ elmName: 'HELLOPGM', type: 'COBOL' }));
```

- The path starts with `./` for files in the same directory
- Omit the `.js` extension — Node.js adds it automatically
- Third-party packages (like `gulp`) are loaded without a path: `require('gulp')`

## The exercise

**1.** Create [utils.js](open:utils.js) that exports two functions:
- `buildUrl(host, port, useHttps)` — returns a URL string
- `formatElement(el)` — takes `{ elmName, type }` and returns `"HELLOPGM (COBOL)"`

**2.** Open [app.js](open:app.js) — the `require` line is already there. Use both exported functions and log their output.

Expected output from `node app.js`:
```
https://mainframe.example.com:8080
HELLOPGM (COBOL)
```

Run it: `node app.js`

Click **Check My Work** when done.
