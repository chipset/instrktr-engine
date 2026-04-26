module.exports = async function validate(context) {
  if (!await context.files.exists('safe-run.js')) {
    return context.fail('safe-run.js not found.');
  }

  const src = await context.files.read('safe-run.js');

  const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
  if (tryCatchCount < 2) {
    return context.fail(`safe-run.js needs try/catch in both parseResponse() and safeListElements(). Found ${tryCatchCount} try block(s).`);
  }

  if (!src.includes('throw new Error')) {
    return context.fail('Each catch block should re-throw with `throw new Error(...)` and a descriptive message.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node safe-run.js');
  if (exitCode !== 0) {
    return context.fail(`safe-run.js crashed: ${stderr.split('\n')[0]}. The bad-input path should be caught, not crash the process.`);
  }

  if (!stdout.includes('Success')) {
    return context.fail('The good-input path should print "Success: ..." — check that parseResponse() returns the data array correctly.');
  }

  if (!stdout.includes('Caught')) {
    return context.fail('The bad-input path should print "Caught: ..." — make sure the error is caught and not swallowed silently.');
  }

  return context.pass('Error handling works correctly — success and failure paths both produce clear output.');
};
