const config = {
  host:        'mainframe.example.com',
  port:        8080,
  instance:    'ENDEVOR',
  environment: 'DEV',
  system:      'MYAPP',
  subsystem:   'MAIN',
  stageNumber: '1',
};

// TODO: destructure instance, environment, system, subsystem, stageNumber from config
// const { ... } = config;

// TODO: write buildBaseArgs(config) — destructure the argument and return the flag string
function buildBaseArgs(config) {
  // hint: const { instance, environment, system, subsystem, stageNumber } = config;
  // return `--instance ${instance} --environment ${environment} ...`
}

// TODO: call buildBaseArgs(config) and log the result
