# Arrays and Iteration

Zowe CLI's `list elements` command returns an **array** of element objects. This step teaches the four array methods you'll use to work with that response.

## Creating arrays

```js
const elements = [
  { elmName: 'HELLOPGM', type: 'COBOL' },
  { elmName: 'WORLDPGM', type: 'COBOL' },
  { elmName: 'DEPLOY',   type: 'JCL'   },
  { elmName: 'TESTPGM',  type: 'COBOL' },
];
```

## The four methods you need

### `forEach` — do something for each item (no return value)

```js
elements.forEach(el => console.log(`  ${el.elmName}`));
```

### `map` — transform each item into something else

```js
const names = elements.map(el => el.elmName);
// ['HELLOPGM', 'WORLDPGM', 'DEPLOY', 'TESTPGM']
```

### `filter` — keep only items that pass a test

```js
const cobolElements = elements.filter(el => el.type === 'COBOL');
// [{ elmName: 'HELLOPGM', ... }, { elmName: 'WORLDPGM', ... }, { elmName: 'TESTPGM', ... }]
```

### `find` — return the first matching item (or `undefined`)

```js
const deploy = elements.find(el => el.elmName === 'DEPLOY');
// { elmName: 'DEPLOY', type: 'JCL' }
```

## The exercise

Create [arrays.js](open:arrays.js) using the `elements` array above:

1. Use `forEach` to log `Found: HELLOPGM (COBOL)` for each element
2. Use `filter` to get only COBOL elements, log how many there are
3. Use `map` to extract just the names into a new array, log it
4. Use `find` to locate the JCL element by type, log its name

Expected output:
```
Found: HELLOPGM (COBOL)
Found: WORLDPGM (COBOL)
Found: DEPLOY (JCL)
Found: TESTPGM (COBOL)
3 COBOL element(s)
Names: HELLOPGM, WORLDPGM, DEPLOY, TESTPGM
JCL element: DEPLOY
```

Run it: `node arrays.js`

Click **Check My Work** when done.
