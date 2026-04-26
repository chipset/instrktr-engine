module.exports = async function validate(context) {
  if (!await context.files.exists('parse-response.js')) {
    return context.fail('parse-response.js not found.');
  }

  const src = await context.files.read('parse-response.js');

  if (!src.includes('JSON.parse')) {
    return context.fail('Use JSON.parse() to convert the JSON string into a JavaScript object.');
  }

  if (!src.includes('JSON.stringify')) {
    return context.fail('Use JSON.stringify(summary, null, 2) to log the result as pretty-printed JSON.');
  }

  if (!src.includes('.filter(') && !src.includes('.filter (')) {
    return context.fail('Use .filter() to select only COBOL elements.');
  }

  if (!src.includes('.map(') && !src.includes('.map (')) {
    return context.fail('Use .map() to extract the element names into an array.');
  }

  const { exitCode, stdout, stderr } = await context.terminal.run('node parse-response.js');
  if (exitCode !== 0) {
    return context.fail(`parse-response.js threw an error: ${stderr.split('\n')[0]}`);
  }

  if (!stdout.includes('"total"') || !stdout.includes('"cobol"') || !stdout.includes('"names"')) {
    return context.fail('Output must be a JSON object with "total", "cobol", and "names" keys.');
  }

  if (!stdout.includes('HELLOPGM') || !stdout.includes('WORLDPGM')) {
    return context.fail('The "names" array should contain the COBOL element names: HELLOPGM and WORLDPGM.');
  }

  if (stdout.includes('DEPLOY')) {
    return context.fail('"DEPLOY" is a JCL element and should not appear in the COBOL names list. Check your .filter() condition.');
  }

  return context.pass('JSON parsing, filtering, and stringifying all work correctly. Pre-course complete!');
};
