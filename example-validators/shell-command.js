// Use runShell when a JavaScript validator intentionally needs shell syntax
// such as ~ expansion, &&, pipes, redirects, or environment variable expansion.
module.exports = async function validate(context) {
  const { stdout, exitCode } = await context.terminal.runShell(
    'test -f ~/.zowe/zowe.config.json && echo "exists"',
  );

  if (exitCode !== 0 || !stdout.includes('exists')) {
    return context.fail(
      '`~/.zowe/zowe.config.json` not found. Run `zowe config init --gc` to create the global config.',
    );
  }

  return context.pass('Global Zowe config exists.');
};
