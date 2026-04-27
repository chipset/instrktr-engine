module.exports = async function validate(context) {
  if (!await context.files.exists('src/endevor.js')) {
    return context.fail('src/endevor.js not found. Create the file and implement the EndevorService class inside it.');
  }

  const src = await context.files.read('src/endevor.js');

  if (!src.includes('EndevorService')) {
    return context.fail('src/endevor.js must define a class called EndevorService.');
  }

  for (const method of ['listElements', 'retrieveElement', 'addElement']) {
    if (!src.includes(method)) {
      return context.fail(`EndevorService must have a "${method}" method. See the instructions for the expected signature.`);
    }
  }

  if (src.includes("throw new Error('listElements() not implemented yet')")) {
    return context.fail('listElements() still contains the placeholder. Implement it using execAsync and JSON.parse.');
  }

  if (src.includes("throw new Error('retrieveElement() not implemented yet')")) {
    return context.fail('retrieveElement() still contains the placeholder. Implement it using execAsync.');
  }

  if (src.includes("throw new Error('addElement() not implemented yet')")) {
    return context.fail('addElement() still contains the placeholder. Implement it using execAsync.');
  }

  if (!src.includes('module.exports')) {
    return context.fail('src/endevor.js must export the class: module.exports = { EndevorService };');
  }

  return context.pass('EndevorService is implemented with listElements, retrieveElement, and addElement.');
};
