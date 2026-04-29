module.exports = async function validate(context) {
  if (!await context.files.exists('working.ezt')) {
    return context.fail('working.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('working.ezt');

  const required = ['TOTAL-SAL', 'EMP-COUNT', 'DEPT-SAVE', 'ERROR-FLAG'];
  for (const field of required) {
    if (!src.includes(field)) {
      return context.fail(`Working storage field "${field}" not found. Add it in the W section.`);
    }
  }

  // TOTAL-SAL should be numeric with decimals
  const totalSalLine = src.split('\n').find(l => l.includes('TOTAL-SAL'));
  if (totalSalLine && !totalSalLine.match(/TOTAL-SAL\s+[NP]\s+\d+\s+\d/)) {
    return context.warn('TOTAL-SAL should be a numeric field with decimal places, e.g.: TOTAL-SAL  N  11  2');
  }

  // ERROR-FLAG should have a VALUE clause
  const errorFlagLine = src.split('\n').find(l => l.includes('ERROR-FLAG'));
  if (errorFlagLine && !errorFlagLine.includes('VALUE')) {
    return context.warn("ERROR-FLAG should be initialised with VALUE 'N' so its starting state is known.");
  }

  return context.pass('All four working storage fields defined: TOTAL-SAL, EMP-COUNT, DEPT-SAVE, and ERROR-FLAG.');
};
