# Error Handling with try/catch

In the Zowe course, every `EndevorService` method wraps its `execAsync` call in a `try/catch` to turn cryptic Zowe CLI errors into readable messages. This step shows you why and how.

## Synchronous errors

```js
try {
  const data = JSON.parse('not json');  // throws SyntaxError
} catch (err) {
  console.error('Parse failed:', err.message);
}
```

## Async errors — await inside try/catch

When you `await` a rejected Promise, the error is thrown at the `await` line and caught by the surrounding `try/catch`:

```js
async function fetchData() {
  try {
    const result = await somethingThatMightFail();
    return result;
  } catch (err) {
    throw new Error(`fetchData failed: ${err.message}`);
  }
}
```

Rethrowing with context means the caller gets a clear message instead of a raw library error.

## The `Error` object

```js
const e = new Error('something went wrong');
console.log(e.message); // 'something went wrong'
console.log(e.stack);   // full stack trace
```

You can attach extra properties: `e.code = 404;`.

## The exercise

Open [safe-run.js](open:safe-run.js). Two functions need try/catch blocks added:

1. **`parseResponse(stdout)`** — wraps `JSON.parse(stdout)` in try/catch. On failure, throw:
   ```
   new Error('Failed to parse Zowe response: ' + err.message)
   ```

2. **`safeListElements(stdout)`** — calls `parseResponse`, and on failure throws:
   ```
   new Error('listElements failed: ' + err.message)
   ```

The file already calls both functions — once with valid JSON (should succeed) and once with bad input (should be caught and logged, not crash the process).

Run it: `node safe-run.js`

Expected output:
```
Success: 2 element(s) found
Caught: listElements failed: Failed to parse Zowe response: ...
```

Click **Check My Work** when done.
