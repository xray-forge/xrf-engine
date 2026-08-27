import * as cp from "node:child_process";

import { blue, yellow } from "chalk";

import { GAME_DATA_TRANSLATIONS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface IVerifyTranslationsParameters {
  language?: string;
  strict?: boolean;
  verbose?: boolean;
}

/**
 * Verify game translation dictionaries.
 * List missing or invalid entries for all locales or a single one.
 */
export async function verifyTranslations(parameters: IVerifyTranslationsParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("Verifying translations:", yellow(GAME_DATA_TRANSLATIONS_DIR), parameters.language || "all");

  const timeTracker: TimeTracker = new TimeTracker().start();

  const command: string = `${XRF_UTILS_PATH} translation verify ${
    parameters.verbose ? "--verbose " : "--silent "
  }-p ${GAME_DATA_TRANSLATIONS_DIR} -l ${parameters.language || "all"} ${parameters.strict ? "--strict" : ""}`;

  log.info("Execute:", blue(command));
  cp.execSync(command, { stdio: "inherit" });

  log.info("Successfully executed verify command, took:", timeTracker.end().getDuration() / 1000, "sec");
}
