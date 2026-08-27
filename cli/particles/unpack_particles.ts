import * as cp from "node:child_process";
import * as path from "node:path";

import { blue } from "chalk";

import { RESOURCES_DIR, RESOURCES_PARTICLES_UNPACKED_DIR, TARGET_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface IUnpackParticlesParameters {
  verbose?: boolean;
  path?: string;
  dest?: string;
  force?: boolean;
}

/**
 * Unpack particles file.
 */
export async function unpackParticles(parameters: IUnpackParticlesParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info("Unpacking particles file:");

  const timeTracker: TimeTracker = new TimeTracker().start();
  const from: string = parameters.path ?? path.resolve(RESOURCES_DIR, "particles.xr");
  const to: string = parameters.dest ?? RESOURCES_PARTICLES_UNPACKED_DIR;

  const command: string = `${XRF_UTILS_PATH} particle unpack -p ${from} -d ${to} ${parameters.force ? "-f" : ""}`;

  log.info("Execute:", blue(command));

  cp.execSync(command, {
    cwd: TARGET_DIR,
    stdio: "inherit",
  });

  log.info("Successfully executed unpack particles command, took:", timeTracker.end().getDuration() / 1000, "sec");
}
