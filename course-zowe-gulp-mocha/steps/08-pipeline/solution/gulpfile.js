const gulp = require('gulp');
const path = require('path');
const fs   = require('fs').promises;
const { exec }      = require('child_process');
const { promisify } = require('util');
const { EndevorService } = require('./src/endevor');

const execAsync  = promisify(exec);
const OUTPUT_DIR = 'dist';

const service = new EndevorService({
  instance:    process.env.ENDEVOR_INSTANCE    || 'ENDEVOR',
  environment: process.env.ENDEVOR_ENV         || 'DEV',
  system:      process.env.ENDEVOR_SYSTEM      || 'MYAPP',
  subsystem:   process.env.ENDEVOR_SUBSYSTEM   || 'MAIN',
  stageNumber: process.env.ENDEVOR_STAGE       || '1',
});

const ELEMENT_NAME = process.env.ELEMENT_NAME || 'HELLOPGM';
const ELEMENT_TYPE = process.env.ELEMENT_TYPE || 'COBOL';

async function clean() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log('dist/ cleaned.');
}

async function listElements() {
  const elements = await service.listElements();
  console.log(`Found ${elements.length} element(s):`);
  elements.forEach(el => console.log(`  ${el.elmName}`));
}

async function retrieveElement() {
  const outFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.retrieveElement(ELEMENT_NAME, ELEMENT_TYPE, outFile);
  console.log(`Retrieved ${ELEMENT_NAME} → ${outFile}`);
}

async function runTests() {
  const { stdout } = await execAsync('npx mocha test --recursive --timeout 5000');
  console.log(stdout);
}

async function addElement() {
  const sourceFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.addElement(ELEMENT_NAME, ELEMENT_TYPE, sourceFile, 'DEVOPS', 'Automated deployment');
  console.log(`Pushed ${ELEMENT_NAME} to Endevor`);
}

const deploy = gulp.series(clean, listElements, retrieveElement, runTests, addElement);

exports.clean           = clean;
exports.listElements    = listElements;
exports.retrieveElement = retrieveElement;
exports.runTests        = runTests;
exports.addElement      = addElement;
exports.deploy          = deploy;
exports.default         = deploy;
