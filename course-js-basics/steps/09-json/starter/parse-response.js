// This is the exact JSON shape Zowe CLI returns from `zowe endevor list elements --rfj`
const MOCK_RESPONSE = JSON.stringify({
  data: [
    { elmName: 'HELLOPGM', elmType: 'COBOL', envName: 'DEV' },
    { elmName: 'WORLDPGM', elmType: 'COBOL', envName: 'DEV' },
    { elmName: 'DEPLOY',   elmType: 'JCL',   envName: 'DEV' },
  ],
});

function processResponse(jsonString) {
  // TODO: parse jsonString with JSON.parse()
  // TODO: extract the data array
  // TODO: filter for elements where elmType === 'COBOL'
  // TODO: map to just the elmName strings
  // TODO: return { total: data.length, cobol: cobolElements.length, names: cobolNames }
}

const summary = processResponse(MOCK_RESPONSE);

// TODO: log summary as a pretty-printed JSON string using JSON.stringify(summary, null, 2)
