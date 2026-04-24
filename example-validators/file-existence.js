// Check that one or more files exist in the workspace.
module.exports = async function validate(context) {
  const required = ['src/index.js', 'package.json', 'README.md'];
  const missing = [];

  for (const file of required) {
    if (!await context.files.exists(file)) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    return context.fail(`Missing files: ${missing.join(', ')}`);
  }

  return context.pass('All required files are present!');
};
