module.exports = async function validate(context) {
  if (!await context.files.exists('validate.ezt')) {
    return context.fail('validate.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('validate.ezt');
  const nonComment = src.split('\n')
    .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  if (!nonComment.match(/\bREPORT\s+\w+\s+PRINTER\b/)) {
    return context.fail('No REPORT statement found. Define an ERRLIST report to output validation errors.');
  }

  if (!nonComment.match(/\bIF\s+EMP-ID\s+EQ\s+SPACES\b/)) {
    return context.fail('Missing blank ID check. Add: IF EMP-ID EQ SPACES');
  }

  if (!nonComment.match(/\bIF\s+NOT\s+EMP-SALARY\s+NUMERIC\b/)) {
    return context.fail('Missing numeric check. Add: IF NOT EMP-SALARY NUMERIC');
  }

  if (!nonComment.match(/\bIF\s+EMP-STATUS\s+NE\s+'[AT]'/)) {
    return context.fail("Missing status code check. Add: IF EMP-STATUS NE 'A' AND EMP-STATUS NE 'T'");
  }

  if (!nonComment.match(/COMPUTE\s+ERROR-COUNT\s*=\s*ERROR-COUNT\s*\+\s*1/)) {
    return context.fail('Error counter not incremented. Add: COMPUTE ERROR-COUNT = ERROR-COUNT + 1 for each detected error.');
  }

  if (!nonComment.match(/\bLABEL\s+EOF\b/)) {
    return context.fail('LABEL EOF block not found. Add end-of-file processing to print the validation summary.');
  }

  if (!nonComment.match(/MOVE\s+'VALIDATION (PASSED|FAILED)'\s+TO\s+RESULT-MSG/)) {
    return context.fail("Result message not set. Add MOVE 'VALIDATION PASSED' and MOVE 'VALIDATION FAILED' logic in the LABEL EOF block.");
  }

  if (!nonComment.match(/\bPRINT\s+SUMMARY\b/)) {
    return context.fail('PRINT SUMMARY not found in LABEL EOF block. Add it to output the validation result.');
  }

  return context.pass('Validation program is complete. All six checks, error counting, LABEL EOF, and summary report are in place.');
};
