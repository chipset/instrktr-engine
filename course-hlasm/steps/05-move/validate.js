module.exports = async function validate(context) {
  if (!await context.files.exists('move.asm')) {
    return context.fail('move.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('move.asm');
  const nonComment = src.split('\n')
    .filter(l => !l.startsWith('*') && !l.trim().startsWith('*'))
    .join('\n');

  if (!nonComment.includes('MVI')) {
    return context.fail('No MVI instruction found. Add: MVI   BUFFER,C\' \' to set the first byte to a space.');
  }

  if (!nonComment.includes('MVC')) {
    return context.fail('No MVC instruction found. Add MVC instructions to blank-fill and copy the message.');
  }

  // Check for space fill (C' ' or X'40')
  if (!nonComment.match(/MVI\s+\w+,C' '/) && !nonComment.match(/MVI\s+\w+,X'40'/)) {
    return context.fail('MVI should move a space character (C\' \' or X\'40\') to blank-fill the buffer.');
  }

  // Check for the propagation MVC (should reference buffer+1 or similar offset)
  if (!nonComment.match(/MVC\s+\w+\+\d+/)) {
    return context.warn('The blank-fill propagation pattern (MVC BUFFER+1(79),BUFFER) was not detected. Make sure you are using the MVI+MVC idiom to fill the entire buffer.');
  }

  return context.pass('MVI blank-fill and MVC copy are both in place. Character data movement complete.');
};
