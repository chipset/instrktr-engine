module.exports = async function validate(context) {
  if (!await context.files.exists('hello.jcl')) {
    return context.fail('hello.jcl not found in the workspace root.');
  }

  const raw = await context.files.read('hello.jcl');
  const upper = raw.toUpperCase();

  if (raw.includes('TODO')) {
    return context.fail('Remove every TODO placeholder from hello.jcl and substitute dataset names or SYSIN text.');
  }

  if (!upper.includes('EZTPA00')) {
    return context.fail('The EXEC must run PGM=EZTPA00 (this course checks for that program name).');
  }

  const required = ['STEPLIB', 'EZTVFM', 'EZOPTBL', 'SYSPRINT', 'SYSOUT', 'SYSIN'];
  for (const dd of required) {
    if (!upper.includes(dd)) {
      return context.fail(`hello.jcl must include a DD statement for ${dd}.`);
    }
  }

  if (!upper.includes('SYSIN') || !upper.includes('DD *')) {
    return context.warn('Use //SYSIN DD * followed by inline Easytrieve source, then /* to end the stream.');
  }

  if (!upper.includes('DEFINE') || !upper.includes('JOB INPUT NULL') || !raw.includes('HELLO WORLD') || !upper.includes('STOP')) {
    return context.fail('SYSIN must contain the four Easytrieve lines: DEFINE … JOB INPUT NULL … DISPLAY … STOP.');
  }

  const jclLines = raw.split('\n').filter((l) => l.trim().length > 0);
  const badStart = jclLines.find((l) => {
    const t = l.trimStart();
    if (t.startsWith('*')) return false;
    if (/^(DEFINE|JOB|DISPLAY|STOP)\b/i.test(t)) return false;
    if (t === '/*') return false;
    return !t.startsWith('//');
  });
  if (badStart) {
    return context.warn(
      'Most JCL lines should start with // (SYSIN data and /* are exceptions). Review: ' + badStart.trim()
    );
  }

  return context.pass('hello.jcl runs EZTPA00 with the expected DDs and SYSIN source.');
};
