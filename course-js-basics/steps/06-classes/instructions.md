# Classes and the `this` Keyword

The `EndevorService` in the Zowe course is a **class** — an object that bundles related data and behaviour together. This step builds a simpler version so the pattern is familiar when you get there.

## Class syntax

```js
class PipelineConfig {
  constructor(config) {
    this.config = config;    // store for use in other methods
  }

  buildBaseArgs() {
    const { instance, environment, system, subsystem, stageNumber } = this.config;
    return (
      `--instance ${instance} ` +
      `--environment ${environment} ` +
      `--system ${system} ` +
      `--subsystem ${subsystem} ` +
      `--stage-number ${stageNumber}`
    );
  }

  describe() {
    const { instance, environment } = this.config;
    return `Pipeline: ${instance} / ${environment}`;
  }
}
```

Key rules:
- `constructor` runs when you write `new PipelineConfig(config)`
- `this` inside any method refers to the instance that was created
- Methods are listed directly in the class body — no `function` keyword, no commas between them
- Export with `module.exports = { PipelineConfig }`

## Creating and using an instance

```js
const pipeline = new PipelineConfig({
  instance: 'ENDEVOR', environment: 'DEV',
  system: 'MYAPP', subsystem: 'MAIN', stageNumber: '1',
});

console.log(pipeline.describe());
// Pipeline: ENDEVOR / DEV

console.log(pipeline.buildBaseArgs());
// --instance ENDEVOR --environment DEV --system MYAPP --subsystem MAIN --stage-number 1
```

## The exercise

Open [pipeline-config.js](open:pipeline-config.js). The constructor is provided. Add:

1. `buildBaseArgs()` — returns the full Zowe CLI flag string (same as Step 3)
2. `describe()` — returns `"Pipeline: INSTANCE / ENVIRONMENT / SYSTEM"`
3. `module.exports = { PipelineConfig }` at the bottom

Then create an instance with any config values and log both method results.

Run it: `node pipeline-config.js`

Click **Check My Work** when done.
