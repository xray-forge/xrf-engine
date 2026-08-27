import * as cp from "node:child_process";

import { blue, yellow } from "chalk";

import { GAME_DATA_TRANSLATIONS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";

const log: NodeLogger = NodeLogger.forFile(__filename);

interface IListProblematicTranslationParameters {
  verbose?: boolean;
  strict?: boolean;
  language?: string;
}

/**
 * Parse provided file path as JSON.
 */
export async function checkTranslations(parameters: IListProblematicTranslationParameters): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("List problematic translations:", yellow(GAME_DATA_TRANSLATIONS_DIR), parameters.language || "all");
  log.debug("Running with parameters:", parameters);

  const command: string = `${XRF_UTILS_PATH} translation verify ${
    parameters.verbose ? "--verbose " : "--silent "
  }-p ${GAME_DATA_TRANSLATIONS_DIR} -l ${parameters.language || "all"} ${parameters.strict ? "--strict" : ""}`;

  log.info("Execute check command:", blue(command));

  cp.execSync(command, {
    stdio: "inherit",
  });

  log.info("Checked translations");
}
