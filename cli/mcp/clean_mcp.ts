import * as fs from "node:fs";

import { blueBright, yellow } from "chalk";

import { TARGET_GAME_DATA_CHECKS_MCP_DIR, TARGET_GAME_DATA_MCP_EXTENSION_DIR } from "#/globals/paths";
import { NodeLogger } from "#/utils/logging";

const log: NodeLogger = NodeLogger.forFile(__filename);

export interface ICleanMcpParameters {
  verbose?: boolean;
}

/**
 * Remove the game MCP endpoint and its extension from gamedata, leaving flows in place.
 */
export async function cleanMcp(parameters: ICleanMcpParameters = {}): Promise<void> {
  NodeLogger.IS_VERBOSE = Boolean(parameters.verbose);

  log.info(blueBright("Clean game MCP endpoint"));

  for (const directory of [TARGET_GAME_DATA_MCP_EXTENSION_DIR, TARGET_GAME_DATA_CHECKS_MCP_DIR]) {
    if (fs.existsSync(directory)) {
      fs.rmSync(directory, { recursive: true, force: true });
      log.info("Removed:", yellow(directory));
    } else {
      log.info("Nothing to remove in", yellow(directory));
    }
  }
}
