import * as cp from "node:child_process";
import * as path from "node:path";

import { blue } from "chalk";

import { GAME_DATA_DECLARATIONS_DIR, XRF_UTILS_PATH } from "#/globals";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

const EXTERN_MANIFEST_PATH: string = path.resolve(GAME_DATA_DECLARATIONS_DIR, "extern.json");

/**
 * Verify that the tracked extern manifest matches the declaration sources.
 */
export async function verifyExternManifest(): Promise<void> {
  log.info("Verifying extern manifest");

  const timeTracker: TimeTracker = new TimeTracker().start();
  const args: Array<string> = ["externs", "export", GAME_DATA_DECLARATIONS_DIR, "--check", EXTERN_MANIFEST_PATH];

  log.info("Execute:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  try {
    cp.execFileSync(XRF_UTILS_PATH, args, { stdio: "inherit" });

    log.info("Successfully verified extern manifest, took:", timeTracker.end().getDuration() / 1000, "sec");
  } catch (error) {
    log.error("Extern manifest verification failed in:", timeTracker.end().getDuration() / 1000, "sec");

    throw error;
  }
}
