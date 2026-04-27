const { buildUrl, formatElement } = require('./utils');

console.log(buildUrl('mainframe.example.com', 8080, true));
console.log(formatElement({ elmName: 'HELLOPGM', type: 'COBOL' }));
