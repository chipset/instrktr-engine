module.exports = async function validate(context) {
  if (!await context.files.exists('data.asm')) {
    return context.fail('data.asm not found. The file should be in your workspace root.');
  }

  const src = await context.files.read('data.asm');

  if (!src.includes('DC')) {
    return context.fail('No DC (Define Constant) directive found. Add a character constant: MSG      DC    C\'Hello, HLASM\'');
  }

  if (!src.includes('DS')) {
    return context.fail('No DS (Define Storage) directive found. Add storage areas for COUNTER and BUFFER.');
  }

  if (!src.match(/DC\s+C'/)) {
    return context.fail('No character constant found. Define MSG with: MSG      DC    C\'Hello, HLASM\'');
  }

  if (!src.match(/DS\s+F\b/) && !src.match(/DS\s+CL/)) {
    return context.fail('No storage definition found. Add COUNTER DS F and BUFFER DS CL80.');
  }

  if (!src.includes('EQU')) {
    return context.fail('No EQU found. Compute the message length with: MSGLEN   EQU   *-MSG');
  }

  if (!src.match(/DS\s+CL\d+/)) {
    return context.fail('No character buffer found. Add: BUFFER   DS    CL80');
  }

  return context.pass('DC and DS definitions complete. MSG, MSGLEN, COUNTER, and BUFFER are all defined.');
};
