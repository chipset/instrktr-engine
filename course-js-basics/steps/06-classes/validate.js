module.exports = async function validate(context) {
  if (!await context.files.exists('pipeline-config.js')) {
    return context.fail('pipeline-config.js not found.');
  }

  const src = await context.files.read('pipeline-config.js');

  if (!src.includes('class PipelineConfig')) {
    return context.fail('pipeline-config.js must define a class named PipelineConfig.');
  }

  if (!src.includes('constructor')) {
    return context.fail('PipelineConfig must have a constructor that accepts a config argument.');
  }

  if (!src.includes('buildBaseArgs')) {
    return context.fail('PipelineConfig must have a buildBaseArgs() method.');
  }

  if (!src.includes('describe')) {
    return context.fail('PipelineConfig must have a describe() method.');
  }

  if (!src.includes('module.exports')) {
    return context.fail('Export the class at the bottom: module.exports = { PipelineConfig };');
  }

  if (!src.includes('this.config')) {
    return context.fail('Methods should access the config via `this.config`. Make sure you stored it in the constructor: `this.config = config;`');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node pipeline-config.js');
  if (exitCode !== 0) {
    return context.fail(`pipeline-config.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('--instance') || !stdout.includes('--environment')) {
    return context.fail('Output should include the Zowe CLI flags from buildBaseArgs(). Make sure you call and log it.');
  }

  return context.pass('PipelineConfig class works correctly with buildBaseArgs() and describe().');
};
