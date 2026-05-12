module.exports = async function validate(context) {
  if (!await context.files.exists('prereqs.md')) {
    return context.fail('prereqs.md not found. Create it from the starter content in your workspace root.');
  }

  const src = await context.files.read('prereqs.md');
  const lower = src.toLowerCase();

  if (src.includes('TODO')) {
    return context.fail('Replace every TODO in prereqs.md with your own sentences.');
  }

  if (!lower.includes('zowe')) {
    return context.fail('prereqs.md should mention Zowe in the profile section.');
  }

  const hasEasytrieveExt = lower.includes('easytrieve') && lower.includes('support');
  const hasJclExt = lower.includes('jcl') && lower.includes('support');
  const hasZoweExplorer = lower.includes('zowe') && lower.includes('explorer');

  if (!hasEasytrieveExt || !hasJclExt || !hasZoweExplorer) {
    return context.fail(
      'List all three extensions by name: Easytrieve Language Support, JCL Language Support, and Zowe Explorer.'
    );
  }

  if (!lower.includes('jcl') || (!lower.includes('syntax') && !lower.includes('error') && !lower.includes('dd'))) {
    return context.warn(
      'Explain JCL validation in your own words — mention catching syntax or DD issues before submit.'
    );
  }

  return context.pass('prereqs.md captures your Zowe setup and the three Code4z extensions.');
};
