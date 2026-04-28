module.exports = async function validate(context) {
  if (!await context.files.exists('execute.jcl')) {
    return context.fail('execute.jcl not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('execute.jcl');

  // JOB card
  if (!src.match(/^\/\/\w+\s+JOB\b/m)) {
    return context.fail('No JOB card found. Add a JOB card at the top: //EMPVAL   JOB  (ACCT),\'description\',...');
  }

  // EXEC PGM=EZTPA00
  if (!src.match(/EXEC\s+PGM=EZTPA00/)) {
    return context.fail('EXEC PGM=EZTPA00 not found. Add: //STEP1    EXEC PGM=EZTPA00 to run Easytrieve Plus.');
  }

  // SYSPRINT
  if (!src.match(/\/\/SYSPRINT\s+DD\s+SYSOUT=/)) {
    return context.fail('SYSPRINT DD not found. Add: //SYSPRINT DD  SYSOUT=* to capture report output.');
  }

  // Input file DD
  if (!src.match(/\/\/EMPDD\s+DD\b/) && !src.match(/\/\/\w+\s+DD\s+DSN=.*EMPLOYEE/i)) {
    return context.fail('Input file DD not found. Add: //EMPDD    DD  DSN=HR.EMPLOYEE.MASTER,DISP=SHR');
  }

  // SYSIN DD *
  if (!src.match(/\/\/SYSIN\s+DD\s+\*/)) {
    return context.fail('SYSIN DD * not found. Add the SYSIN DD to provide inline Easytrieve source: //SYSIN    DD  *');
  }

  // End of inline stream delimiter
  if (!src.match(/^\/\*\s*$/m)) {
    return context.fail('End-of-stream delimiter /* not found. Add /* on its own line to terminate the inline SYSIN data.');
  }

  // Check that Easytrieve source is inside SYSIN
  const sysinIdx = src.indexOf('//SYSIN');
  const afterSysin = src.slice(sysinIdx);
  if (!afterSysin.match(/\bFILE\b/) || !afterSysin.match(/\bW\b/) || !afterSysin.match(/\bP\b/)) {
    return context.warn('SYSIN appears to be empty or incomplete. Paste your Easytrieve source code (FILE, W, P sections) between //SYSIN DD * and /*');
  }

  return context.pass('JCL is complete: JOB card, EXEC PGM=EZTPA00, SYSPRINT, input file DD, and SYSIN with inline source are all present.');
};
