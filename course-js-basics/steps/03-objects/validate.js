module.exports = async function validate(context) {
  if (!await context.files.exists('objects.js')) {
    return context.fail('objects.js not found.');
  }

  const src = await context.files.read('objects.js');

  if (!src.includes('const {') && !src.includes('const{')) {
    return context.fail('Use destructuring to extract properties from the config object: `const { instance, environment, ... } = config;`');
  }

  if (!src.includes('--instance') || !src.includes('--environment')) {
    return context.fail('buildBaseArgs() must return a string that includes "--instance" and "--environment" flags.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node objects.js');
  if (exitCode !== 0) {
    return context.fail(`objects.js threw an error: ${stderr.split('\n')[0]}`);
  }

  for (const expected of ['--instance', '--environment', '--system', '--subsystem', '--stage-number']) {
    if (!stdout.includes(expected)) {
      return context.fail(`Output is missing the "${expected}" flag. Check your buildBaseArgs() return value.`);
    }
  }

  return context.pass(`Destructuring and buildBaseArgs() work correctly. Output: ${stdout.trim()}`);
};
