module.exports = async function validate(context) {
  if (!await context.files.exists('filedef.ezt')) {
    return context.fail('filedef.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('filedef.ezt');

  if (!src.match(/\bFILE\b/)) {
    return context.fail('FILE statement not found. Start the file section with: FILE EMPLOYEE EMPDD');
  }

  const required = ['EMP-ID', 'EMP-NAME', 'EMP-DEPT', 'EMP-SALARY', 'EMP-STATUS'];
  for (const field of required) {
    if (!src.includes(field)) {
      return context.fail(`Field "${field}" not defined. Add it after the FILE statement using the format: ${field}  start  length  type`);
    }
  }

  // EMP-SALARY should have decimal places defined
  const salaryLine = src.split('\n').find(l => l.includes('EMP-SALARY'));
  if (salaryLine && !salaryLine.match(/EMP-SALARY\s+\d+\s+\d+\s+[NP]\s+\d/)) {
    return context.warn('EMP-SALARY should be a numeric field with 2 decimal places. Check the type (N or P) and decimals value.');
  }

  return context.pass('All five field definitions are in place: EMP-ID, EMP-NAME, EMP-DEPT, EMP-SALARY, and EMP-STATUS.');
};
