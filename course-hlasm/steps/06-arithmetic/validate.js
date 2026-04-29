module.exports = async function validate(context) {
  if (!await context.files.exists('arithmetic.asm')) {
    return context.fail('arithmetic.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('arithmetic.asm');
  const nonComment = src.split('\n')
    .filter(l => !l.startsWith('*') && !l.trim().startsWith('*'))
    .join('\n');

  if (!nonComment.match(/\bA\s+R?\d+,\w+/) && !nonComment.match(/\bAR\s+R?\d+,R?\d+/)) {
    return context.fail('No A or AR (Add) instruction found. Add VALA and VALB using: A     R2,VALB');
  }

  if (!nonComment.match(/\bM\s+R?\d+,\w+/) && !nonComment.match(/\bMR\s+R?\d+,R?\d+/)) {
    return context.fail('No M or MR (Multiply) instruction found. Multiply by VALC using: M     R0,VALC');
  }

  if (!nonComment.match(/\bST\s+R?\d+,\w+/)) {
    return context.fail('No ST (Store) instruction found. Store the result into RESULT using: ST    R1,RESULT');
  }

  if (!nonComment.includes('RESULT')) {
    return context.fail('RESULT is not referenced in the code. Store your final product into RESULT.');
  }

  return context.pass('Add, Multiply, and Store instructions are all present. (VALA + VALB) × VALC stored in RESULT.');
};
