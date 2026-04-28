module.exports = async function validate(context) {
  if (!await context.files.exists('report.ezt')) {
    return context.fail('report.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('report.ezt');
  const nonComment = src.split('\n')
    .filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');

  if (!nonComment.match(/\bREPORT\s+\w+\s+PRINTER\b/)) {
    return context.fail('No REPORT statement found. Add: REPORT EMPRPT  PRINTER in the P section.');
  }

  if (!nonComment.match(/\bTITLE\s+'/)) {
    return context.fail("No TITLE found inside the REPORT block. Add: TITLE 'Employee Salary Report'");
  }

  if (!nonComment.match(/\bHEADING\b/)) {
    return context.fail('No HEADING found inside the REPORT block. Add column headings for ID, Name, Dept, and Salary.');
  }

  if (!nonComment.match(/\bLINE\b.*EMP-/)) {
    return context.fail('No LINE statement found inside the REPORT block. Add: LINE  EMP-ID  EMP-NAME  EMP-DEPT  EMP-SALARY');
  }

  if (!nonComment.match(/\bPRINT\s+\w+/)) {
    return context.fail('No PRINT statement found in the procedure. Add: PRINT EMPRPT inside the active-status check.');
  }

  return context.pass('Report definition and PRINT logic are in place. EMPRPT will print one line per active employee.');
};
