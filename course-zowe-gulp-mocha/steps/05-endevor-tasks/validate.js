module.exports = async function validate(context) {
  if (!await context.files.exists('gulpfile.js')) {
    return context.fail('gulpfile.js not found.');
  }

  const src = await context.files.read('gulpfile.js');

  if (!src.includes('./src/endevor') && !src.includes('./src/endevor.js')) {
    return context.fail("gulpfile.js must import EndevorService from './src/endevor'. Add: const { EndevorService } = require('./src/endevor');");
  }

  for (const task of ['listElements', 'retrieveElement', 'addElement']) {
    if (!src.includes(`exports.${task}`)) {
      return context.fail(`gulpfile.js must export a "${task}" task. Add: exports.${task} = ${task};`);
    }
  }

  const { exitCode, stderr, stdout } = await context.terminal.run('npx gulp --tasks');
  if (exitCode !== 0) {
    const hint = (stderr || stdout).split('\n')[0];
    return context.fail(`\`npx gulp --tasks\` failed: ${hint}. Check gulpfile.js for syntax or require errors.`);
  }

  for (const task of ['listElements', 'retrieveElement', 'addElement']) {
    if (!stdout.includes(task)) {
      return context.fail(`Task "${task}" does not appear in \`npx gulp --tasks\`. Make sure you exported it.`);
    }
  }

  return context.pass('Endevor tasks are registered: listElements, retrieveElement, and addElement.');
};
