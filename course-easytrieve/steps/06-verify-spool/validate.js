module.exports = async function validate(context) {
  if (!await context.files.exists('spool-review.md')) {
    return context.fail('spool-review.md not found in the workspace root.');
  }

  const src = await context.files.read('spool-review.md');
  const lower = src.toLowerCase();

  if (src.includes('TODO')) {
    return context.fail('Replace every TODO in spool-review.md.');
  }

  if (!lower.includes('job')) {
    return context.fail('Explain where you find the job after submit (Jobs area / job id).');
  }

  if (!lower.includes('sysprint') && !lower.includes('spool') && !lower.includes('dd')) {
    return context.warn('Mention opening a DD such as SYSPRINT or spool output.');
  }

  if (!src.includes('0000')) {
    return context.fail('Include the literal completion code 0000 as the success example from the material.');
  }

  return context.pass('spool-review.md describes locating the job, reading DD output, and 0000 completion.');
};
