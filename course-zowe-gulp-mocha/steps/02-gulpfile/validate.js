module.exports = async function validate(context) {
  if (!await context.files.exists('gulpfile.js')) {
    return context.fail('gulpfile.js not found. Create it in your workspace root.');
  }

  const src = await context.files.read('gulpfile.js');

  if (!src.includes("require('gulp')") && !src.includes('require("gulp")')) {
    return context.fail("gulpfile.js must require gulp. Add: const gulp = require('gulp');");
  }

  if (!src.includes('exports.default')) {
    return context.fail('gulpfile.js must export a default task. Add: exports.default = yourTaskFunction;');
  }

  const { exitCode, stderr } = await context.terminal.run('npx gulp --tasks');
  if (exitCode !== 0) {
    const hint = stderr.split('\n')[0];
    return context.fail(`\`npx gulp --tasks\` failed: ${hint}. Check for syntax errors in gulpfile.js.`);
  }

  return context.pass('gulpfile.js is set up correctly and Gulp tasks are registered.');
};
