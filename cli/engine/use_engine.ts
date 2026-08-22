import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { blue, green, yellow, yellowBright } from "chalk";

import { getEnginesList, isValidEngine } from "#/engine/list_engines";
import { OPEN_XRAY_ENGINES_DIR } from "#/globals";
import { exists } from "#/utils/fs/exists";
import { getGamePaths } from "#/utils/fs/get_game_paths";
import { isSymlink } from "#/utils/fs/is_symlink";
import { NodeLogger } from "#/utils/logging";
import { Nullable } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Switch current game engine to provided one.
 */
export async function useEngine(target: string): Promise<void> {
  const desiredVersion: string = String(target).trim();

  if (isValidEngine(desiredVersion)) {
    const { bin, binJson, binXrfBackup } = await getGamePaths();
    const engineBinDir: string = path.resolve(OPEN_XRAY_ENGINES_DIR, desiredVersion, "bin");
    const possibleBinDescriptor: string = binJson;
    const isBinFolderExist: boolean = await exists(bin);
    const isLinkedEngine: boolean = await exists(possibleBinDescriptor);
    const isUnresolvedLink: boolean = !isLinkedEngine && isBinFolderExist && (await isSymlink(bin));
    const oldEngine: Nullable<string> = isLinkedEngine ? (await import(possibleBinDescriptor)).type : null;

    log.info("Switching engine:", blue(oldEngine || "original"), "->", blue(desiredVersion));

    if (isLinkedEngine || isUnresolvedLink) {
      log.info("Removing old link");
      await fsp.unlink(bin);
    } else if (isBinFolderExist) {
      log.info("Unlinked engine detected");
      await fsp.rename(bin, binXrfBackup);
      log.info("Created backup at:", yellow(binXrfBackup));
    }

    log.info("Linking:", yellow(engineBinDir), "->", yellow(bin));
    await fsp.symlink(engineBinDir, bin, "junction");

    log.info("Link result:", green("OK"), "\n");
  } else {
    log.error("Supplied unknown engine variant:", yellow(desiredVersion));
    log.error("Only following are available:");

    getEnginesList().forEach((it) => log.error("->", yellowBright(it)));
  }
}
