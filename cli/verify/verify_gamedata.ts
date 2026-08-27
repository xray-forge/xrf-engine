import * as cp from "node:child_process";

import { blue } from "chalk";

import { TARGET_GAME_DATA_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Verification checks supported by the `gamedata verify` CLI utility.
 */
export enum EGamedataCheck {
  ANIMATIONS = "animations",
  LEVELS = "levels",
  LTX = "ltx",
  MESHES = "meshes",
  PARTICLES = "particles",
  PARTICLES_USAGE = "particles-usage",
  SCRIPTS = "scripts",
  SHADERS = "shaders",
  SOUNDS = "sounds",
  SPAWNS = "spawns",
  TEXTURES = "textures",
  WEAPONS = "weapons",
  WEATHERS = "weathers",
}

export interface IVerifyGamedataParameters {
  checks?: Array<EGamedataCheck>;
  report?: string;
  strict?: boolean;
  verbose?: boolean;
}

/**
 * Verify assembled gamedata files integrity.
 * Check textures/sounds/assets/meshes/animations etc.
 * Allows ensuring validity before running game and crashing in runtime.
 */
export async function verifyGamedata(parameters: IVerifyGamedataParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("Verifying gamedata files");

  const timeTracker: TimeTracker = new TimeTracker().start();

  const args: Array<string> = ["gamedata", "verify", TARGET_GAME_DATA_DIR];

  if (parameters.strict) {
    args.push("--strict");
  }

  if (parameters.verbose) {
    args.push("-v");
  }

  if (parameters.report) {
    args.push("--report", parameters.report);
  }

  if (parameters.checks?.length) {
    args.push("--checks", ...parameters.checks);
  }

  log.info("Execute:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  try {
    cp.execFileSync(XRF_UTILS_PATH, args, { stdio: "inherit" });
    log.info("Successfully executed verify command, took:", timeTracker.end().getDuration() / 1000, "sec");
  } catch (error) {
    log.error("Gamedata verification command failed in:", timeTracker.end().getDuration() / 1000, "sec");

    throw error;
  }
}
