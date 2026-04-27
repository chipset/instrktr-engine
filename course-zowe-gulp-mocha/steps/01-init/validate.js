module.exports = async function validate(context) {
  if (!await context.files.exists('package.json')) {
    return context.fail('package.json not found. Run `npm init -y` to create it.');
  }

  let pkg;
  try {
    pkg = JSON.parse(await context.files.read('package.json'));
  } catch {
    return context.fail('package.json is not valid JSON.');
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  for (const required of ['gulp', 'mocha', 'chai', 'sinon']) {
    if (!deps[required]) {
      return context.fail(
        `"${required}" is not installed. Run: npm install --save-dev gulp mocha chai sinon`,
      );
    }
  }

  return context.pass('Project initialized. gulp, mocha, chai, and sinon are installed.');
};
