module.exports = async function validate(context) {
  if (!await context.files.exists('hello.ezt')) {
    return context.fail('hello.ezt not found. It should live in your workspace root.');
  }

  const raw = await context.files.read('hello.ezt');
  const src = raw.toUpperCase();

  if (!src.includes('DEFINE') || !src.includes('WDUMMY')) {
    return context.fail('Include a DEFINE for WDUMMY (see the sample in the instructions).');
  }

  if (!src.includes('JOB') || !src.includes('INPUT') || !src.includes('NULL')) {
    return context.fail('Add JOB INPUT NULL so the program runs without an input file.');
  }

  if (!src.includes("DISPLAY") || !raw.includes('HELLO WORLD')) {
    return context.fail("Add DISPLAY 'HELLO WORLD' exactly as shown (quotes around HELLO WORLD).");
  }

  if (!src.includes('STOP')) {
    return context.fail('End the program with STOP.');
  }

  return context.pass('hello.ezt contains the Hello World Easytrieve logic.');
};
