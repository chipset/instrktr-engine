module.exports = async function validate(context) {
  if (!await context.files.exists('hello.asm')) {
    return context.fail('hello.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('hello.asm');
  const lines = src.split('\n').map(l => l.trimEnd());
  const nonComment = lines.filter(l => !l.startsWith('*') && l.trim() !== '');

  if (!src.includes('CSECT')) {
    return context.fail('hello.asm is missing a CSECT directive. Add: HELLO    CSECT');
  }

  if (!src.includes('PRINT')) {
    return context.fail('hello.asm is missing PRINT NOGEN. Add it immediately after the CSECT line.');
  }

  const endLines = nonComment.filter(l => /\bEND\b/.test(l));
  if (endLines.length === 0) {
    return context.fail('hello.asm is missing an END directive. Add:          END   HELLO at the bottom.');
  }

  const endHasOperand = endLines.some(l => /\bEND\s+\S/.test(l));
  if (!endHasOperand) {
    return context.warn('The END directive has no operand. Add your CSECT name as the operand: END   HELLO');
  }

  return context.pass('hello.asm has a valid CSECT, PRINT NOGEN, and END. Program structure complete.');
};
