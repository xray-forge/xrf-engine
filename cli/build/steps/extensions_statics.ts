import * as fsp from "node:fs/promises";

import { blueBright, yellow } from "chalk";

import { IBuildCommandParameters } from "#/build/build";
import { getFolderReplicationDescriptors } from "#/build/utils";
import { GAME_DATA_EXTENSIONS_DIR, TARGET_GAME_DATA_EXTENSIONS_DIR } from "#/globals/paths";
import { createDirForConfigs } from "#/utils/fs/create_dir_for_configs";
import { NodeLogger } from "#/utils/logging";
import { EAssetExtension, TFolderReplicationDescriptor } from "#/utils/types";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Copy the .ltx configs extensions ship beside their scripts, which extensions read with `openExtensionIni`.
 */
export async function buildStaticExtensions(parameters: IBuildCommandParameters): Promise<void> {
  log.info(blueBright("Copy extension configs"));

  const descriptors: Array<TFolderReplicationDescriptor> = await getFolderReplicationDescriptors({
    fromDirectory: GAME_DATA_EXTENSIONS_DIR,
    toDirectory: TARGET_GAME_DATA_EXTENSIONS_DIR,
    fromExtension: EAssetExtension.LTX,
    toExtension: EAssetExtension.LTX,
    filters: parameters.filter,
  });

  if (descriptors.length) {
    createDirForConfigs(descriptors, log);

    await Promise.all(
      descriptors.map(([from, to]) => {
        log.debug("CP:", yellow(to));

        return fsp.copyFile(from, to);
      })
    );

    log.info("Extension configs processed:", descriptors.length);
  } else {
    log.info("No extension configs found", parameters.filter);
  }
}
