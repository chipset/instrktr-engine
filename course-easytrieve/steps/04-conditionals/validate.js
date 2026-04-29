module.exports = async function validate(context) {
  if (!await context.files.exists('conditionals.ezt')) {
    return context.fail('conditionals.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('conditionals.ezt');
  const nonComment = src.split('\n')
    .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  if (!nonComment.match(/IF\s+EMP-STATUS\s+EQ\s+'A'/)) {
    return context.fail("Missing status check. Add: IF EMP-STATUS EQ 'A' to process only active employees.");
  }

  if (!nonComment.match(/IF\s+EMP-SALARY\s+NUMERIC/)) {
    return context.fail('Missing numeric check. Add: IF EMP-SALARY NUMERIC to validate the salary field.');
  }

  if (!nonComment.match(/COMPUTE\s+TOTAL-SAL\s*=\s*TOTAL-SAL\s*\+\s*EMP-SALARY/)) {
    return context.fail('Missing salary accumulation. Add: COMPUTE TOTAL-SAL = TOTAL-SAL + EMP-SALARY inside the numeric check.');
  }

  if (!nonComment.match(/COMPUTE\s+EMP-COUNT\s*=\s*EMP-COUNT\s*\+\s*1/)) {
    return context.fail('Missing record counter. Add: COMPUTE EMP-COUNT = EMP-COUNT + 1 to count active employees.');
  }

  if (!nonComment.match(/MOVE\s+'Y'\s+TO\s+ERROR-FLAG/)) {
    return context.fail("Missing error flag. Add: MOVE 'Y' TO ERROR-FLAG in the ELSE branch when salary is not numeric.");
  }

  const endIfCount = (nonComment.match(/\bEND-IF\b/g) || []).length;
  if (endIfCount < 2) {
    return context.warn(`Found ${endIfCount} END-IF statement(s) but expected 2 — one for the NUMERIC check and one for the status check.`);
  }

  return context.pass('Conditional logic is complete: status check, numeric validation, accumulation, and error flag are all in place.');
};
