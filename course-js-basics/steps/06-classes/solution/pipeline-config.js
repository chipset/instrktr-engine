class PipelineConfig {
  constructor(config) {
    this.config = config;
  }

  buildBaseArgs() {
    const { instance, environment, system, subsystem, stageNumber } = this.config;
    return (
      `--instance ${instance} ` +
      `--environment ${environment} ` +
      `--system ${system} ` +
      `--subsystem ${subsystem} ` +
      `--stage-number ${stageNumber}`
    );
  }

  describe() {
    const { instance, environment, system } = this.config;
    return `Pipeline: ${instance} / ${environment} / ${system}`;
  }
}

module.exports = { PipelineConfig };

const pipeline = new PipelineConfig({
  instance: 'ENDEVOR', environment: 'DEV',
  system: 'MYAPP', subsystem: 'MAIN', stageNumber: '1',
});

console.log(pipeline.describe());
console.log(pipeline.buildBaseArgs());
