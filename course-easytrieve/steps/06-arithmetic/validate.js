module.exports = async function validate(context) {
  if (!await context.files.exists('arithmetic.ezt')) {
    return context.fail('arithmetic.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('arithmetic.ezt');
  const nonComment = src.split('\n')
    .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  if (!src.includes('AVG-SALARY')) {
    return context.fail('AVG-SALARY field not found. Add it to the W section: AVG-SALARY  N  11  2  VALUE 0');
  }

  if (!nonComment.match(/COMPUTE\s+AVG-SALARY\s*=\s*TOTAL-SAL\s*\/\s*EMP-COUNT/)) {
    return context.fail('Average salary calculation not found. Add: COMPUTE AVG-SALARY = TOTAL-SAL / EMP-COUNT in the LABEL EOF block.');
  }

  if (!nonComment.match(/\bLABEL\s+EOF\b/)) {
    return context.fail('LABEL EOF block not found. Add a LABEL EOF section after the main record loop to run end-of-file processing.');
  }

  if (!nonComment.match(/\bPRINT\s+SUMMARY\b/)) {
    return context.fail('PRINT SUMMARY not found. Add a SUMMARY report and print it in the LABEL EOF block.');
  }

  if (!nonComment.match(/\bREPORT\s+SUMMARY\b/)) {
    return context.fail('REPORT SUMMARY not defined. Add a REPORT SUMMARY PRINTER block with a FOOTING showing the totals.');
  }

  return context.pass('Arithmetic, LABEL EOF, and SUMMARY report are all in place. Average salary will be computed and printed at end of run.');
};
