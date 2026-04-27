# Variables and Data Types

JavaScript has three ways to declare a variable. You will only use two of them in modern code.

| Keyword | Reassignable? | When to use |
|---|---|---|
| `const` | No | Almost always — values that do not change |
| `let` | Yes | When the value will be updated later |
| `var` | Yes | Never — it has surprising scoping rules |

## Primitive types

```js
const host     = 'mainframe.example.com'; // string
const port     = 8080;                    // number
const useHttps = true;                    // boolean
let   attempt  = 0;                       // number (will change)
```

## Template literals

Template literals use **backticks** instead of quotes and let you embed expressions with `${}`:

```js
const protocol = useHttps ? 'https' : 'http';
console.log(`Connecting to ${protocol}://${host}:${port}`);
// Connecting to https://mainframe.example.com:8080
```

The `? :` is a **ternary operator** — a compact if/else for expressions.

## The exercise

Create [intro.js](open:intro.js) in your workspace root with:

1. A `const` string `host` set to any hostname
2. A `const` number `port` set to any port number
3. A `const` boolean `useHttps` set to `true` or `false`
4. A `let` number `retries` set to `0`, then reassigned to `3`
5. A `console.log` using a template literal that prints:
   ```
   Endpoint: https://your-host:your-port (retries: 3)
   ```
   (use `useHttps ? 'https' : 'http'` inside the template)

Run it:
```bash
node intro.js
```

Click **Check My Work** when done.
