const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class EndevorService {
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

  async listElements() {
    const { stdout } = await execAsync(
      `zowe endevor list elements ${this.buildBaseArgs()} --rfj`,
    );
    const result = JSON.parse(stdout);
    return result.data;
  }

  async retrieveElement(name, type, outputPath) {
    await execAsync(
      `zowe endevor retrieve element ${name} ${this.buildBaseArgs()} ` +
      `--type ${type} --to-file ${outputPath}`,
    );
  }

  async addElement(name, type, sourceFile, ccid, comment) {
    await execAsync(
      `zowe endevor add element ${name} ${this.buildBaseArgs()} ` +
      `--type ${type} --from-file ${sourceFile} ` +
      `--ccid "${ccid}" --comment "${comment}"`,
    );
  }
}

module.exports = { EndevorService };
