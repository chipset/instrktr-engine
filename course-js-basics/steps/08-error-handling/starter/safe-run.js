// TODO: wrap JSON.parse in try/catch — throw a descriptive Error on failure
function parseResponse(stdout) {
  const result = JSON.parse(stdout);
  return result.data;
}

// TODO: wrap the parseResponse call in try/catch — throw a descriptive Error on failure
async function safeListElements(stdout) {
  const elements = parseResponse(stdout);
  return elements;
}

// ── test it ──────────────────────────────────────────────────────────────────

const goodResponse = JSON.stringify({ data: [{ elmName: 'HELLOPGM' }, { elmName: 'WORLDPGM' }] });
const badResponse  = 'NOT VALID JSON {{{{';

safeListElements(goodResponse)
  .then(els => console.log(`Success: ${els.length} element(s) found`))
  .catch(err => console.log(`Caught: ${err.message}`));

safeListElements(badResponse)
  .then(els => console.log(`Success: ${els.length} element(s) found`))
  .catch(err => console.log(`Caught: ${err.message}`));
