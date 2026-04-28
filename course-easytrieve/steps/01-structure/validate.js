module.exports = async function validate(context) {
  if (!await context.files.exists('employee.ezt')) {
    return context.fail('employee.ezt not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('employee.ezt');
  const lines = src.split('\n').map(l => l.trim()).filter(l => l !== '' && !l.startsWith('*') && !l.startsWith('/*'));

  if (!lines.some(l => /^FILE\b/.test(l))) {
    return context.fail('FILE section keyword not found. Add a line containing just: FILE (or FILE followed by a file name).');
  }

  if (!lines.some(l => /^W$/.test(l))) {
    return context.fail('W section keyword not found. Add a line containing just the letter: W');
  }

  if (!lines.some(l => /^P$/.test(l))) {
    return context.fail('P section keyword not found. Add a line containing just the letter: P');
  }

  // Check order: FILE before W before P
  const fileIdx = lines.findIndex(l => /^FILE\b/.test(l));
  const wIdx    = lines.findIndex(l => /^W$/.test(l));
  const pIdx    = lines.findIndex(l => /^P$/.test(l));

  if (fileIdx > wIdx || wIdx > pIdx) {
    return context.fail('Section order is wrong. Sections must appear in order: FILE, then W, then P.');
  }

  return context.pass('Program skeleton is correct. FILE, W, and P sections are present in the right order.');
};
