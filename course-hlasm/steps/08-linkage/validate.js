module.exports = async function validate(context) {
  if (!await context.files.exists('linkage.asm')) {
    return context.fail('linkage.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('linkage.asm');
  const nonComment = src.split('\n')
    .filter(l => !l.startsWith('*') && !l.trim().startsWith('*'))
    .join('\n');

  // STM to save registers on entry
  if (!nonComment.match(/\bSTM\s+R?14,R?12,12\(R?13\)/) &&
      !nonComment.match(/\bSTM\s+14,12,12\(13\)/)) {
    return context.fail('Entry register save not found. Add: STM   R14,R12,12(R13) as the very first instruction.');
  }

  // 18-word save area
  if (!nonComment.match(/DS\s+18F/)) {
    return context.fail('Save area not found. Add: SAVEAREA DS    18F to reserve the 18-word save area.');
  }

  // LM to restore registers on exit
  if (!nonComment.match(/\bLM\s+R?14,R?12,12\(R?13\)/) &&
      !nonComment.match(/\bLM\s+14,12,12\(13\)/)) {
    return context.fail('Exit register restore not found. Add: LM    R14,R12,12(R13) before returning.');
  }

  // BR R14 to return
  if (!nonComment.match(/\bBR\s+R?14\b/) && !nonComment.match(/\bBR\s+14\b/)) {
    return context.fail('Return instruction not found. Add: BR    R14 to return to the caller.');
  }

  // SR R15,R15 to zero the return code
  if (!nonComment.match(/\bSR\s+R?15,R?15\b/) && !nonComment.match(/\bSR\s+15,15\b/)) {
    return context.fail('Return code not set. Add: SR    R15,R15 to set the return code to 0 before BR R14.');
  }

  return context.pass('Standard OS linkage convention implemented correctly. STM, save area chain, LM, SR R15,R15, and BR R14 are all in place.');
};
