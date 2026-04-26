const config = {
  host:        'mainframe.example.com',
  port:        8080,
  instance:    'ENDEVOR',
  environment: 'DEV',
  system:      'MYAPP',
  subsystem:   'MAIN',
  stageNumber: '1',
};

const { instance, environment, system, subsystem, stageNumber } = config;
console.log(`Working with: ${instance} / ${environment} / ${system} / ${subsystem} / Stage ${stageNumber}`);

function buildBaseArgs(config) {
  const { instance, environment, system, subsystem, stageNumber } = config;
  return (
    `--instance ${instance} ` +
    `--environment ${environment} ` +
    `--system ${system} ` +
    `--subsystem ${subsystem} ` +
    `--stage-number ${stageNumber}`
  );
}

console.log(buildBaseArgs(config));
