module.exports = async function validate(context) {
  const { stdout, exitCode } = await context.terminal.run('git log --oneline -1');
  if (exitCode !== 0 || !stdout.trim()) {
    return context.fail('No commits found. Run `git add .` then `git commit -m "Initial commit"`.');
  }
  return context.pass('First commit recorded! Great work.');
};
