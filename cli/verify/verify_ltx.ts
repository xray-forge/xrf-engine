import * as cp from "node:child_process";

import { blue } from "chalk";

import { GAME_DATA_LTX_CONFIGS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface IVerifyLtxParameters {
  verbose?: boolean;
}

/**
 * Verify game ltx config files.
 * Check scheme definitions, inheritance and include checks.
 */
export async function verifyLtx(parameters: IVerifyLtxParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("Verifying ltx files");

  const timeTracker: TimeTracker = new TimeTracker().start();

  const command: string = `${XRF_UTILS_PATH} ltx verify -p ${GAME_DATA_LTX_CONFIGS_DIR} ${
    parameters.verbose ? "-v " : ""
  }`;

  log.info("Execute:", blue(command));
  cp.execSync(command, { stdio: "inherit" });

  log.info("Successfully executed verify command, took:", timeTracker.end().getDuration() / 1000, "sec");
}
