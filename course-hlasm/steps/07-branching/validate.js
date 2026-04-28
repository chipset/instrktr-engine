module.exports = async function validate(context) {
  if (!await context.files.exists('branch.asm')) {
    return context.fail('branch.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('branch.asm');
  const nonComment = src.split('\n')
    .filter(l => !l.startsWith('*') && !l.trim().startsWith('*'))
    .join('\n');

  // Must have a compare instruction
  if (!nonComment.match(/\bC\s+R?\d+,\w+/) && !nonComment.match(/\bCR\s+R?\d+,R?\d+/)) {
    return context.fail('No C or CR (Compare) instruction found. Compare R2 to LIMIT with: C     R2,LIMIT');
  }

  // Must have at least one branch mnemonic
  if (!nonComment.match(/\b(BE|BL|BH|BNE|BNH|BNL|BZ|BNZ|B)\s+\w+/)) {
    return context.fail('No branch instruction found. Add BNH LOOPTOP to loop back while R2 is ≤ LIMIT.');
  }

  // Must have DS 0H for loop target alignment
  if (!nonComment.match(/DS\s+0H/)) {
    return context.fail('No DS 0H found. Branch targets should be halfword-aligned: LOOPTOP  DS    0H');
  }

  // The DS 0H label should be referenced by a branch
  const ds0hLine = src.split('\n').find(l => /\S.*DS\s+0H/.test(l) && !l.startsWith('*'));
  if (ds0hLine) {
    const labelMatch = ds0hLine.match(/^(\w+)/);
    if (labelMatch) {
      const loopLabel = labelMatch[1];
      if (!nonComment.includes(`B     ${loopLabel}`) &&
          !nonComment.includes(`BNH   ${loopLabel}`) &&
          !nonComment.includes(`BNL   ${loopLabel}`) &&
          !nonComment.includes(`BL    ${loopLabel}`) &&
          !nonComment.includes(`BNE   ${loopLabel}`) &&
          !nonComment.match(new RegExp(`B[A-Z]{0,2}\\s+${loopLabel}`))) {
        return context.warn(`Loop label "${loopLabel}" is defined but not referenced by a branch. Make sure your branch points back to it.`);
      }
    }
  }

  return context.pass('Compare and branch instructions are in place with a halfword-aligned loop label. Branching exercise complete.');
};
