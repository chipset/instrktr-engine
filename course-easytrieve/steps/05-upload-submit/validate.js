module.exports = async function validate(context) {
  if (!await context.files.exists('upload-flow.md')) {
    return context.fail('upload-flow.md not found in the workspace root.');
  }

  const src = await context.files.read('upload-flow.md');
  const lower = src.toLowerCase();

  if (src.includes('TODO')) {
    return context.fail('Replace every TODO in upload-flow.md with real text.');
  }

  if (!lower.includes('eztdsn')) {
    return context.fail('Document the eztdsn setting (lowercase name as used in VS Code settings).');
  }

  if (!lower.includes('jcldsn')) {
    return context.fail('Document the jcldsn setting.');
  }

  if (!src.includes('Upload EZT to Mainframe')) {
    return context.fail('Name the upload action exactly: Upload EZT to Mainframe');
  }

  if (!lower.includes('submit job')) {
    return context.fail('Mention Submit Job as the action used after upload.');
  }

  if (!lower.includes('zowe explorer')) {
    return context.fail('Describe submitting from Zowe Explorer (see instructions).');
  }

  if (!lower.includes('easytrieve')) {
    return context.fail('Also describe submitting via Easytrieve Language Support on the JCL file (see instructions).');
  }

  return context.pass('upload-flow.md ties eztdsn/jcldsn to upload and submit actions.');
};
