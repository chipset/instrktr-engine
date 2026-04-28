module.exports = async function validate(context) {
  if (!await context.files.exists('loadstore.asm')) {
    return context.fail('loadstore.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('loadstore.asm');
  const nonComment = src.split('\n')
    .filter(l => !l.startsWith('*') && !l.trim().startsWith('*'))
    .join('\n');

  if (!nonComment.match(/\bL\s+R\d+,\w+/) && !nonComment.match(/\bL\s+\d+,\w+/)) {
    return context.fail('No L (Load) instruction found. Add: L     R2,VALA to load a fullword from memory.');
  }

  if (!nonComment.match(/\bST\s+R?\d+,\w+/)) {
    return context.fail('No ST (Store) instruction found. Add: ST    R4,RESULT to store a register to memory.');
  }

  if (!nonComment.match(/\bLR\s+R?\d+,R?\d+/)) {
    return context.fail('No LR (Load Register) instruction found. Add: LR    R4,R2 to copy one register to another.');
  }

  if (!nonComment.match(/\bLA\s+R?\d+,/)) {
    return context.fail('No LA (Load Address) instruction found. Add: LA    R5,RESULT to load an address into a register.');
  }

  if (!src.includes('RESULT')) {
    return context.fail('RESULT is not referenced in the code section. Store your computed value into RESULT.');
  }

  return context.pass('L, LR, LA, and ST instructions are all present. Load and store operations complete.');
};
