function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSteps() {
  console.log('Step 1: listing elements…');
  await delay(200);
  console.log('Step 2: retrieving element…');
  await delay(200);
  console.log('Done.');
}

runSteps();
