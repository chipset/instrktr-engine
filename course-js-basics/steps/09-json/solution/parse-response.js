const MOCK_RESPONSE = JSON.stringify({
  data: [
    { elmName: 'HELLOPGM', elmType: 'COBOL', envName: 'DEV' },
    { elmName: 'WORLDPGM', elmType: 'COBOL', envName: 'DEV' },
    { elmName: 'DEPLOY',   elmType: 'JCL',   envName: 'DEV' },
  ],
});

function processResponse(jsonString) {
  const parsed        = JSON.parse(jsonString);
  const data          = parsed.data;
  const cobolElements = data.filter(el => el.elmType === 'COBOL');
  const cobolNames    = cobolElements.map(el => el.elmName);

  return { total: data.length, cobol: cobolElements.length, names: cobolNames };
}

const summary = processResponse(MOCK_RESPONSE);
console.log(JSON.stringify(summary, null, 2));
