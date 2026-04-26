function parseResponse(stdout) {
  try {
    const result = JSON.parse(stdout);
    return result.data;
  } catch (err) {
    throw new Error(`Failed to parse Zowe response: ${err.message}`);
  }
}

async function safeListElements(stdout) {
  try {
    const elements = parseResponse(stdout);
    return elements;
  } catch (err) {
    throw new Error(`listElements failed: ${err.message}`);
  }
}

const goodResponse = JSON.stringify({ data: [{ elmName: 'HELLOPGM' }, { elmName: 'WORLDPGM' }] });
const badResponse  = 'NOT VALID JSON {{{{';

safeListElements(goodResponse)
  .then(els => console.log(`Success: ${els.length} element(s) found`))
  .catch(err => console.log(`Caught: ${err.message}`));

safeListElements(badResponse)
  .then(els => console.log(`Success: ${els.length} element(s) found`))
  .catch(err => console.log(`Caught: ${err.message}`));
