module.exports = async function validate(context) {
  if (!await context.files.exists('hello.txt')) {
    return context.fail('hello.txt not found. Create it in the workspace root.');
  }

  const content = (await context.files.read('hello.txt')).trim();
  if (content !== 'Hello, Instrktr!') {
    return context.fail('hello.txt should contain exactly: Hello, Instrktr!');
  }

  return context.pass('Looks good!');
};
