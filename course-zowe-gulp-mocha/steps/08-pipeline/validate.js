module.exports = async function validate(context) {
  if (!await context.files.exists('gulpfile.js')) {
    return context.fail('gulpfile.js not found.');
  }

  const src = await context.files.read('gulpfile.js');

  if (!src.includes('exports.deploy')) {
    return context.fail('gulpfile.js must export a "deploy" task. Add: exports.deploy = deploy;');
  }

  if (!src.includes('gulp.series') && !src.includes('series(')) {
    return context.warn('The deploy task should chain subtasks using gulp.series(). See the instructions for the expected pipeline shape.');
  }

  if (!src.includes('runTests')) {
    return context.fail('The pipeline must include a runTests task that runs Mocha. Add it to the series before addElement.');
  }

  const { exitCode: taskExit, stdout: taskOut, stderr: taskErr } = await context.terminal.run('npx gulp --tasks');
  if (taskExit !== 0) {
    const hint = (taskErr || taskOut).split('\n')[0];
    return context.fail(`\`npx gulp --tasks\` failed: ${hint}`);
  }

  if (!taskOut.includes('deploy')) {
    return context.fail('"deploy" task does not appear in `npx gulp --tasks`. Verify the export.');
  }

  const { exitCode: testExit, stdout: testOut, stderr: testErr } = await context.terminal.run(
    'npx mocha test --recursive --timeout 5000',
  );
  if (testExit !== 0) {
    const output = (testErr || testOut).split('\n').slice(0, 5).join('\n');
    return context.fail(`Mocha tests are failing:\n${output}\n\nFix the tests before completing this step.`);
  }

  const passing = testOut.match(/(\d+) passing/);
  return context.pass(
    `Pipeline complete! deploy task chains clean → listElements → retrieveElement → runTests → addElement. ` +
    `${passing ? passing[0] + ' test(s) pass.' : ''}`,
  );
};
