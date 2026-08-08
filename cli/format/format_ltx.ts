import * as cp from "node:child_process";

import { blue } from "chalk";

import { GAME_DATA_LTX_CONFIGS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface IFormatLtxParameters {
  check?: boolean;
  /**
   * Files or folders to format.
   *
   * Note the difference between the two empty-ish values:
   * - `undefined` means "no scope provided", so the whole configs folder is formatted.
   * - `[]` means "an explicit, empty scope", so nothing is formatted at all.
   */
  paths?: Array<string>;
  verbose?: boolean;
}

/**
 * Format game ltx config files.
 */
export async function formatLtx(parameters: IFormatLtxParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  if (parameters.paths && !parameters.paths.length) {
    log.info("No ltx files to format, skipping");

    return;
  }

  log.info("Formatting ltx files");

  const timeTracker: TimeTracker = new TimeTracker().start();
  const args: Array<string> = ["format-ltx", "-p", ...(parameters.paths ?? [GAME_DATA_LTX_CONFIGS_DIR])];

  if (parameters.check) {
    args.push("-c");
  }

  if (parameters.verbose) {
    args.push("-v");
  }

  log.info("Execute:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  try {
    cp.execFileSync(XRF_UTILS_PATH, args, { stdio: "inherit" });

    log.info("Successfully executed format command, took:", timeTracker.end().getDuration() / 1000, "sec");
  } catch (error) {
    log.error("Ltx format command failed in:", timeTracker.end().getDuration() / 1000, "sec");

    throw error;
  }
}
