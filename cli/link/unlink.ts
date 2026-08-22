import * as fsp from "node:fs/promises";

import { red, yellow, yellowBright } from "chalk";

import { PLUS_SIGN, SKIP_SIGN, WARNING_SIGN } from "#/globals";
import { TARGET_GAME_LINK_DIR, TARGET_LOGS_LINK_DIR } from "#/globals/paths";
import { getGamePaths } from "#/utils/fs/get_game_paths";
import { NodeLogger } from "#/utils/logging";
import { AnyObject, Nullable } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Unlink gamedata/engine/logs folders.
 */
export async function unlinkFolders(): Promise<void> {
  log.info("Unlinking engine development folders");

  try {
    const { gamedata: gameGamedataFolderPath } = await getGamePaths();

    await unlink(gameGamedataFolderPath);
    await unlink(TARGET_LOGS_LINK_DIR);
    await unlink(TARGET_GAME_LINK_DIR);
  } catch (error) {
    log.error("Links removal failed:", red((error as AnyObject)?.message));
  }
}

/**
 * Link target gamedata folder for faster / easier development.
 */
async function unlink(target: string): Promise<void> {
  log.info("Unlinking:", yellowBright(target));

  const stat: Nullable<string> = await fsp.readlink(target).catch(() => null);

  if (!stat) {
    return log.info(SKIP_SIGN, "Skip operation, target does not exist");
  }

  try {
    await fsp.unlink(target);
    log.info(PLUS_SIGN, "Unlinked:", yellow(target));
  } catch (error) {
    log.error(WARNING_SIGN, "Failed to unlink:", yellow(target));
    log.error("Check this folder, probably it was created manually or contains your own gamedata from another mod");

    throw error;
  }
}
