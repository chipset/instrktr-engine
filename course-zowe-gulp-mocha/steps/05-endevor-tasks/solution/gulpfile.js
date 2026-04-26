const gulp = require('gulp');
const path = require('path');
const fs   = require('fs').promises;
const { EndevorService } = require('./src/endevor');

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

async function hello() {
  console.log('Gulp is running!');
}

async function clean() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  console.log('dist/ cleaned.');
}

async function listElements() {
  const elements = await service.listElements();
  console.log(`Found ${elements.length} element(s):`);
  elements.forEach(el => console.log(`  ${el.elmName}`));
}

async function retrieveElement() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.retrieveElement(ELEMENT_NAME, ELEMENT_TYPE, outFile);
  console.log(`Retrieved ${ELEMENT_NAME} → ${outFile}`);
}

async function addElement() {
  const sourceFile = path.join(OUTPUT_DIR, `${ELEMENT_NAME}.cbl`);
  await service.addElement(ELEMENT_NAME, ELEMENT_TYPE, sourceFile, 'DEVOPS', 'Automated update');
  console.log(`Pushed ${ELEMENT_NAME} to Endevor`);
}

exports.hello           = hello;
exports.clean           = clean;
exports.listElements    = listElements;
exports.retrieveElement = retrieveElement;
exports.addElement      = addElement;
exports.default         = hello;
