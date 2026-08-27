import * as cp from "node:child_process";

import { blue, blueBright } from "chalk";

import { IBuildCommandParameters } from "#/build/build";
import { GAME_DATA_TRANSLATIONS_DIR, TARGET_GAME_DATA_TRANSLATIONS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Build translation files.
 */
export async function buildTranslations(parameters: IBuildCommandParameters): Promise<void> {
  log.info(blueBright("Build translations"));

  const command: string = `${XRF_UTILS_PATH} translation build ${
    parameters.verbose ? "--verbose " : "--silent "
  }-p ${GAME_DATA_TRANSLATIONS_DIR} -o ${TARGET_GAME_DATA_TRANSLATIONS_DIR}`;

  log.info("Execute build command:", blue(command));

  cp.execSync(command, {
    stdio: "inherit",
  });

  log.info("Built translations");
}
