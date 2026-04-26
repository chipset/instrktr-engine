module.exports = async function validate(context) {
  if (!await context.files.exists('async-demo.js')) {
    return context.fail('async-demo.js not found.');
  }

  const src = await context.files.read('async-demo.js');

  if (!src.includes('async ')) {
    return context.fail('Define at least one function with the `async` keyword.');
  }

  if (!src.includes('await ')) {
    return context.fail('Use `await` inside your async function to wait for Promises.');
  }

  if (!src.includes('new Promise') && !src.includes('setTimeout')) {
    return context.fail('The delay() function should return a `new Promise` that uses setTimeout.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node async-demo.js');
  if (exitCode !== 0) {
    return context.fail(`async-demo.js threw an error: ${stderr.split('\n')[0]}`);
  }

  const lines = stdout.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) {
    return context.fail(`Expected at least 3 lines of output (Step 1, Step 2, Done) but got ${lines.length}. Check your console.log calls.`);
  }

  return context.pass('async/await works correctly — steps ran sequentially.');
};
