module.exports = async function validate(context) {
  if (!await context.files.exists('intro.js')) {
    return context.fail('intro.js not found. Create it in your workspace root.');
  }

  const src = await context.files.read('intro.js');

  if (!src.includes('const ')) {
    return context.fail('Use `const` to declare at least one variable.');
  }

  if (!src.includes('let ')) {
    return context.fail('Use `let` to declare at least one variable that gets reassigned.');
  }

  if (!src.includes('`')) {
    return context.fail('Use a template literal (backticks) for the console.log output.');
  }

  if (!src.includes('console.log')) {
    return context.fail('Add a console.log() call that prints the endpoint string.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node intro.js');
  if (exitCode !== 0) {
    return context.fail(`intro.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('https://') && !stdout.includes('http://')) {
    return context.fail('The output should include a URL starting with https:// or http://.');
  }

  return context.pass(`intro.js runs correctly. Output: ${stdout.trim()}`);
};
