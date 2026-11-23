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

  const args: Array<string> = [
    "translation",
    "build",
    GAME_DATA_TRANSLATIONS_DIR,
    "-d",
    TARGET_GAME_DATA_TRANSLATIONS_DIR,
    parameters.verbose ? "--verbose" : "--silent",
  ];

  log.info("Execute build command:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  cp.execFileSync(XRF_UTILS_PATH, args, { stdio: "inherit" });

  log.info("Built translations");
}
