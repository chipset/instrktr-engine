module.exports = async function validate(context) {
  if (!await context.files.exists('src/endevor.js')) {
    return context.fail('src/endevor.js not found.');
  }

  const svc = await context.files.read('src/endevor.js');

  const hasTryCatch = (svc.match(/try\s*\{/g) || []).length >= 3;
  const hasCatch = (svc.match(/\}\s*catch/g) || []).length >= 3;
  if (!hasTryCatch || !hasCatch) {
    return context.fail(
      'src/endevor.js needs try/catch blocks in all three methods (listElements, retrieveElement, addElement). ' +
      'See the instructions for the pattern.',
    );
  }

  if (!svc.includes('Failed to list elements') &&
      !svc.includes('Failed to retrieve') &&
      !svc.includes('Failed to add')) {
    return context.warn(
      'Consider adding descriptive error messages like "Failed to list elements: ..." so pipeline failures are easy to diagnose.',
    );
  }

  const testFiles = await context.files.list('test');
  const testFile = testFiles.find(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));
  if (!testFile) {
    return context.fail('No test file found in test/. Add error-path tests to test/endevor.test.js.');
  }

  const tests = await context.files.read(`test/${testFile}`);
  if (!tests.includes('caughtError') && !tests.includes('rejectedWith') && !tests.includes('rejects')) {
    return context.fail(
      'No error-path test found. Add a test that stubs exec to yield an error and asserts the thrown message.',
    );
  }

  const { exitCode, stdout, stderr } = await context.terminal.run(
    'npx mocha test --recursive --timeout 5000',
  );
  if (exitCode !== 0) {
    const output = (stderr || stdout).split('\n').slice(0, 5).join('\n');
    return context.fail(`Tests are failing:\n${output}`);
  }

  const passing = stdout.match(/(\d+) passing/);
  return context.pass(`Error handling added and all tests pass. ${passing ? passing[0] : ''}`);
};
