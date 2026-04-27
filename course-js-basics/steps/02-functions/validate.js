module.exports = async function validate(context) {
  if (!await context.files.exists('functions.js')) {
    return context.fail('functions.js not found. Create it in your workspace root.');
  }

  const src = await context.files.read('functions.js');

  if (!src.includes('function ') && !src.includes('=>')) {
    return context.fail('functions.js must define at least one function (named or arrow).');
  }

  if (!src.includes('return ')) {
    return context.fail('At least one function must use a `return` statement to produce a value.');
  }

  if (!src.includes('=>')) {
    return context.fail('Define at least one arrow function using the `=>` syntax.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node functions.js');
  if (exitCode !== 0) {
    return context.fail(`functions.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('://')) {
    return context.fail('The output should include a URL (containing "://"). Check your buildUrl function.');
  }

  return context.pass(`functions.js runs correctly. Output:\n${stdout.trim()}`);
};
