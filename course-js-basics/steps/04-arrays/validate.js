module.exports = async function validate(context) {
  if (!await context.files.exists('arrays.js')) {
    return context.fail('arrays.js not found. Create it in your workspace root.');
  }

  const src = await context.files.read('arrays.js');

  for (const method of ['forEach', 'filter', 'map', 'find']) {
    if (!src.includes(`.${method}(`)) {
      return context.fail(`arrays.js must use the .${method}() array method.`);
    }
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node arrays.js');
  if (exitCode !== 0) {
    return context.fail(`arrays.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('HELLOPGM') || !stdout.includes('DEPLOY')) {
    return context.fail('Output should include element names like HELLOPGM and DEPLOY.');
  }

  if (!stdout.includes('COBOL')) {
    return context.fail('Output should include the element type "COBOL" — check your forEach and filter calls.');
  }

  return context.pass('All four array methods work correctly.');
};
