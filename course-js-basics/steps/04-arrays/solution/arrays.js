const elements = [
  { elmName: 'HELLOPGM', type: 'COBOL' },
  { elmName: 'WORLDPGM', type: 'COBOL' },
  { elmName: 'DEPLOY',   type: 'JCL'   },
  { elmName: 'TESTPGM',  type: 'COBOL' },
];

elements.forEach(el => console.log(`Found: ${el.elmName} (${el.type})`));

const cobol = elements.filter(el => el.type === 'COBOL');
console.log(`${cobol.length} COBOL element(s)`);

const names = elements.map(el => el.elmName);
console.log(`Names: ${names.join(', ')}`);

const jcl = elements.find(el => el.type === 'JCL');
console.log(`JCL element: ${jcl.elmName}`);
