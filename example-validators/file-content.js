// Check that a file contains specific content.
module.exports = async function validate(context) {
  if (!await context.files.exists('src/index.js')) {
    return context.fail('src/index.js not found. Create it first.');
  }

  const content = await context.files.read('src/index.js');

  if (!content.includes('function')) {
    return context.fail('src/index.js should define at least one function.');
  }

  if (!/export\s+default|module\.exports/.test(content)) {
    return context.warn('Function found, but nothing is exported yet.');
  }

  return context.pass('src/index.js looks great!');
};
