import * as cp from "node:child_process";
import * as path from "node:path";

import { blue } from "chalk";

import { RESOURCES_DIR, RESOURCES_PARTICLES_UNPACKED_DIR, TARGET_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface IPackParticlesParameters {
  verbose?: boolean;
  path?: string;
  dest?: string;
  force?: boolean;
}

/**
 * Pack particles file.
 */
export async function packParticles(parameters: IPackParticlesParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("Unpacking particles file:");

  const timeTracker: TimeTracker = new TimeTracker().start();
  const from: string = parameters.path ?? RESOURCES_PARTICLES_UNPACKED_DIR;
  const to: string = parameters.dest ?? path.resolve(RESOURCES_DIR, "particles.xr");

  const command: string = `${XRF_UTILS_PATH} particle pack -p ${from} -d ${to} ${parameters.force ? "-f" : ""}`;

  log.info("Execute:", blue(command));

  cp.execSync(command, {
    cwd: TARGET_DIR,
    stdio: "inherit",
  });

  log.info("Successfully executed pack particles command, took:", timeTracker.end().getDuration() / 1000, "sec");
}
