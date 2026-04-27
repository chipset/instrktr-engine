# Objects and Destructuring

In the Zowe course, your `EndevorService` receives a config object in its constructor and destructures it inside `buildBaseArgs()`. This step teaches exactly that pattern.

## Object literals

An object groups related values under named **properties**:

```js
const config = {
  host:        'mainframe.example.com',
  port:        8080,
  instance:    'ENDEVOR',
  environment: 'DEV',
  system:      'MYAPP',
  subsystem:   'MAIN',
  stageNumber: '1',
};
```

Access properties with dot notation (`config.host`) or bracket notation (`config['host']`).

## Destructuring

Instead of writing `config.instance`, `config.environment`, etc. on every line, destructuring extracts them in one statement:

```js
const { instance, environment, system, subsystem, stageNumber } = config;

console.log(`${instance} / ${environment} / ${system} / ${subsystem} / Stage ${stageNumber}`);
// ENDEVOR / DEV / MYAPP / MAIN / Stage 1
```

## Nested objects and spread

Objects can be nested, and you can merge them with the spread operator `...`:

```js
const defaults = { port: 8080, protocol: 'https' };
const override = { port: 8443 };
const merged   = { ...defaults, ...override };
// { port: 8443, protocol: 'https' }
```

## The exercise

Open [objects.js](open:objects.js). A `config` object is already defined. Your job:

1. Destructure `instance`, `environment`, `system`, `subsystem`, and `stageNumber` from `config`
2. Write a function `buildBaseArgs(config)` that destructures the argument and returns the Zowe CLI flag string:
   ```
   --instance ENDEVOR --environment DEV --system MYAPP --subsystem MAIN --stage-number 1
   ```
3. Call `buildBaseArgs(config)` and log the result

Run it: `node objects.js`

Click **Check My Work** when done.
