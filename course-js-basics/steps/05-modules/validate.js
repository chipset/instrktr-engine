module.exports = async function validate(context) {
  if (!await context.files.exists('utils.js')) {
    return context.fail('utils.js not found. Create it and export buildUrl and formatElement.');
  }

  if (!await context.files.exists('app.js')) {
    return context.fail('app.js not found.');
  }

  const utils = await context.files.read('utils.js');
  if (!utils.includes('module.exports')) {
    return context.fail('utils.js must export its functions using module.exports.');
  }

  if (!utils.includes('buildUrl') || !utils.includes('formatElement')) {
    return context.fail('utils.js must export both buildUrl and formatElement.');
  }

  const app = await context.files.read('app.js');
  if (!app.includes("require('./utils')") && !app.includes('require("./utils")')) {
    return context.fail("app.js must import from utils.js using: require('./utils')");
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node app.js');
  if (exitCode !== 0) {
    return context.fail(`app.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('://')) {
    return context.fail('Output should include a URL from buildUrl(). Check that you call it and log the result.');
  }

  if (!stdout.includes('(COBOL)') && !stdout.includes('(cobol)')) {
    return context.fail('Output should include a formatted element like "HELLOPGM (COBOL)" from formatElement().');
  }

  return context.pass('Modules work correctly — utils.js exports, app.js imports and uses both functions.');
};
