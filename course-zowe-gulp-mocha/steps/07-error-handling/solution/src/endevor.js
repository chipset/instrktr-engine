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
    try {
      const { stdout } = await execAsync(
        `zowe endevor list elements ${this.buildBaseArgs()} --rfj`,
      );
      const result = JSON.parse(stdout);
      return result.data;
    } catch (err) {
      throw new Error(`Failed to list elements: ${err.stderr || err.message}`);
    }
  }

  async retrieveElement(name, type, outputPath) {
    try {
      await execAsync(
        `zowe endevor retrieve element ${name} ${this.buildBaseArgs()} ` +
        `--type ${type} --to-file ${outputPath}`,
      );
    } catch (err) {
      throw new Error(`Failed to retrieve element "${name}": ${err.stderr || err.message}`);
    }
  }

  async addElement(name, type, sourceFile, ccid, comment) {
    try {
      await execAsync(
        `zowe endevor add element ${name} ${this.buildBaseArgs()} ` +
        `--type ${type} --from-file ${sourceFile} ` +
        `--ccid "${ccid}" --comment "${comment}"`,
      );
    } catch (err) {
      throw new Error(`Failed to add element "${name}": ${err.stderr || err.message}`);
    }
  }
}

module.exports = { EndevorService };
