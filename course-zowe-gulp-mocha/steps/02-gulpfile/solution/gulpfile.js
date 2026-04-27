const gulp = require('gulp');
const fs   = require('fs').promises;

async function hello() {
  console.log('Gulp is running!');
}

async function clean() {
  await fs.rm('dist', { recursive: true, force: true });
  console.log('dist/ cleaned.');
}

exports.hello   = hello;
exports.clean   = clean;
exports.default = hello;
