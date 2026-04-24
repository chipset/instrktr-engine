module.exports = async function validate(context) {
  const hasGit = await context.files.exists('.git');
  if (!hasGit) {
    return context.fail('No .git folder found. Did you run `git init`?');
  }
  return context.pass('Repository initialized successfully!');
};
