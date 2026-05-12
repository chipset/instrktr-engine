module.exports = async function validate(context) {
  if (!await context.files.exists('hello.ezt')) {
    return context.fail('hello.ezt not found. Complete the Hello World step first.');
  }

  const src = await context.files.read('hello.ezt');
  const lower = src.toLowerCase();

  const stillHasStep2 =
    lower.includes('define') &&
    lower.includes('job input null') &&
    lower.includes('hello world') &&
    lower.includes('stop');

  if (!stillHasStep2) {
    return context.fail('Keep your working DEFINE, JOB INPUT NULL, DISPLAY, and STOP statements in hello.ezt.');
  }

  const lineHas = (pred) => src.split('\n').some((line) => pred(line.toLowerCase()));

  const syntaxLine = lineHas(
    (l) => l.trimStart().startsWith('*') && (l.includes('syntax') || l.includes('diagnostic'))
  );
  const hoverLine = lineHas(
    (l) => l.trimStart().startsWith('*') && (l.includes('hover') || l.includes('autocomplete'))
  );
  const defLine = lineHas(
    (l) => l.trimStart().startsWith('*') && (l.includes('definition') || l.includes('macro'))
  );

  if (!syntaxLine || !hoverLine || !defLine) {
    return context.fail(
      'Add three separate comment lines (starting with *) covering syntax/diagnostics, hover/autocomplete, and definition/macro.'
    );
  }

  return context.pass('hello.ezt documents the three editor assistance features.');
};
