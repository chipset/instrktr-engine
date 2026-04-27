const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class EndevorService {
  /**
   * @param {object} config
   * @param {string} config.instance     - Endevor instance name (e.g. 'ENDEVOR')
   * @param {string} config.environment  - Environment (e.g. 'DEV')
   * @param {string} config.system       - System (e.g. 'MYAPP')
   * @param {string} config.subsystem    - Subsystem (e.g. 'MAIN')
   * @param {string} config.stageNumber  - Stage number ('1' or '2')
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Returns the common Zowe CLI flags shared by every Endevor command.
   */
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

  /**
   * Lists all elements at the configured Endevor location.
   * @returns {Promise<object[]>} array of element objects from Zowe CLI JSON output
   */
  async listElements() {
    // TODO: run `zowe endevor list elements ${this.buildBaseArgs()} --rfj`
    //       parse the JSON stdout and return result.data
    throw new Error('listElements() not implemented yet');
  }

  /**
   * Retrieves a source element from Endevor and writes it to a local file.
   * @param {string} name        - Element name (e.g. 'HELLOPGM')
   * @param {string} type        - Element type (e.g. 'COBOL')
   * @param {string} outputPath  - Local path to write the retrieved source
   */
  async retrieveElement(name, type, outputPath) {
    // TODO: run `zowe endevor retrieve element ${name} ${this.buildBaseArgs()}
    //            --type ${type} --to-file ${outputPath}`
    throw new Error('retrieveElement() not implemented yet');
  }

  /**
   * Adds or updates an element in Endevor from a local source file.
   * @param {string} name        - Element name
   * @param {string} type        - Element type
   * @param {string} sourceFile  - Path to the local source file
   * @param {string} ccid        - Change control ID (max 12 chars)
   * @param {string} comment     - Change comment (max 40 chars)
   */
  async addElement(name, type, sourceFile, ccid, comment) {
    // TODO: run `zowe endevor add element ${name} ${this.buildBaseArgs()}
    //            --type ${type} --from-file ${sourceFile}
    //            --ccid "${ccid}" --comment "${comment}"`
    throw new Error('addElement() not implemented yet');
  }
}

module.exports = { EndevorService };
