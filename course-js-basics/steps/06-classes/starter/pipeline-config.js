class PipelineConfig {
  constructor(config) {
    this.config = config;
  }

  // TODO: add buildBaseArgs() — use this.config to build the flag string
  // e.g. "--instance ENDEVOR --environment DEV --system MYAPP --subsystem MAIN --stage-number 1"

  // TODO: add describe() — return "Pipeline: INSTANCE / ENVIRONMENT / SYSTEM"
}

// TODO: module.exports = { PipelineConfig };

// TODO: create an instance and log both methods
// const pipeline = new PipelineConfig({ instance: 'ENDEVOR', environment: 'DEV', system: 'MYAPP', subsystem: 'MAIN', stageNumber: '1' });
// console.log(pipeline.describe());
// console.log(pipeline.buildBaseArgs());
