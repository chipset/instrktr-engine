module.exports = async function validate(context) {
  const testFiles = await context.files.list('test');

  const testFile = testFiles.find(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));
  if (!testFile) {
    return context.fail('No test file found in test/. Create test/endevor.test.js.');
  }

  const src = await context.files.read(`test/${testFile}`);

  if (!src.includes('sinon')) {
    return context.fail(`${testFile} does not use sinon. Stub child_process.exec with sinon.stub() so tests run without a live mainframe.`);
  }

  if (!src.includes('describe') || !src.includes("it(")) {
    return context.fail(`${testFile} must contain describe() and it() blocks.`);
  }

  const { exitCode, stdout, stderr } = await context.terminal.run(
    'npx mocha test --recursive --timeout 5000',
  );

  if (exitCode !== 0) {
    const output = (stderr || stdout).split('\n').slice(0, 5).join('\n');
    return context.fail(`Tests are failing:\n${output}\n\nFix the failing tests and try again.`);
  }

  const passing = stdout.match(/(\d+) passing/);
  return context.pass(`All tests pass. ${passing ? passing[0] : ''}`);
};
