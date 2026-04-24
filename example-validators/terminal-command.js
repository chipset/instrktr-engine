// Check that the learner ran a specific terminal command and it succeeded.
module.exports = async function validate(context) {
  // Run the check command ourselves (authoritative — doesn't depend on what
  // the learner typed, only on the actual state of the workspace).
  const { stdout, exitCode } = await context.terminal.run('npm test');

  if (exitCode !== 0) {
    return context.fail(`Tests failed:\n${stdout.slice(0, 300)}`);
  }

  // Optionally also check they used the terminal themselves
  const lastCmd = await context.terminal.lastCommand();
  if (!lastCmd.includes('npm test')) {
    return context.warn('Tests pass! Next time run `npm test` in the terminal yourself.');
  }

  return context.pass('All tests pass!');
};
