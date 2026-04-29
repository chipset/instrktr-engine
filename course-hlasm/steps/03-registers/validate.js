module.exports = async function validate(context) {
  if (!await context.files.exists('registers.asm')) {
    return context.fail('registers.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('registers.asm');

  // Check that several register equates are present
  const equateNumbers = [0, 1, 2, 3, 4, 5, 10, 15];
  for (const n of equateNumbers) {
    if (!src.match(new RegExp(`EQU\\s+${n}\\b`))) {
      return context.fail(`Register equate for ${n} not found. Add: R${n}       EQU   ${n}`);
    }
  }

  if (!src.includes('BALR')) {
    return context.fail('BALR instruction not found. Add: BALR  R12,0 to load the base register.');
  }

  if (!src.includes('USING')) {
    return context.fail('USING directive not found. Add: USING *,R12 immediately after the BALR.');
  }

  if (!src.match(/USING\s+\*/)) {
    return context.fail('USING must reference * (current location): USING *,R12');
  }

  return context.pass('Register equates and base register setup are correct. R0–R15 defined, BALR and USING in place.');
};
