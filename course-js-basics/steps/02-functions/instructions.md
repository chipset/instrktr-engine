# Functions and Arrow Functions

Functions are the building blocks of every JavaScript program. In the Gulp course every task is a function, and every Zowe CLI call is wrapped in one.

## Named functions

```js
function buildUrl(host, port, useHttps) {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

console.log(buildUrl('mainframe.example.com', 8080, true));
// https://mainframe.example.com:8080
```

- Parameters are listed in the `()` — they are local variables inside the function
- `return` sends a value back to the caller
- Without `return`, a function returns `undefined`

## Arrow functions

Arrow functions are a shorter syntax, especially useful for callbacks:

```js
const buildUrl = (host, port, useHttps) => {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
};
```

When the body is a single expression, you can omit the braces and `return`:

```js
const double = n => n * 2;
const add    = (a, b) => a + b;
```

## Default parameters

Parameters can have defaults so callers can omit them:

```js
function buildUrl(host, port = 8080, useHttps = true) {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

console.log(buildUrl('mainframe.example.com')); // https://mainframe.example.com:8080
```

## The exercise

Create [functions.js](open:functions.js) with:

1. A named function `buildUrl(host, port, useHttps)` that returns a URL string using a template literal
2. An arrow function `summarise` that takes an array of strings and returns `"N items: a, b, c"` (hint: use `.join(', ')`)
3. Calls to both functions that log their results

Example output:
```
https://mainframe.example.com:8080
3 items: HELLOPGM, WORLDPGM, TESTPGM
```

Run it: `node functions.js`

Click **Check My Work** when done.
