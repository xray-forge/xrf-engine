import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { blue, blueBright } from "chalk";

import { IBuildCommandParameters } from "#/build/build";
import { getFolderReplicationDescriptors } from "#/build/utils";
import { GAME_DATA_LTX_CONFIGS_DIR, TARGET_GAME_DATA_CONFIGS_DIR } from "#/globals/paths";
import { createDirForConfigs } from "#/utils/fs/create_dir_for_configs";
import { NodeLogger } from "#/utils/logging";
import { ILtxConfigDescriptor, renderJsonToLtx } from "#/utils/ltx";
import { EAssetExtension, Nullable, TFolderReplicationDescriptor } from "#/utils/types";
import { renderJsxToXmlText } from "#/utils/xml";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Transform typescript config files to LTX/XML configs.
 *
 * @param parameters - Build command run parameters.
 */
export async function buildDynamicConfigs(parameters: IBuildCommandParameters): Promise<void> {
  log.info(blueBright("Build dynamic configs:", parameters.filter));

  const [ltxConfigsReplication, xmlConfigsReplication] = await Promise.all([
    await getFolderReplicationDescriptors({
      fromDirectory: GAME_DATA_LTX_CONFIGS_DIR,
      toDirectory: TARGET_GAME_DATA_CONFIGS_DIR,
      fromExtension: EAssetExtension.TS,
      toExtension: EAssetExtension.LTX,
      filters: parameters.filter,
    }),
    await getFolderReplicationDescriptors({
      fromDirectory: GAME_DATA_LTX_CONFIGS_DIR,
      toDirectory: TARGET_GAME_DATA_CONFIGS_DIR,
      fromExtension: EAssetExtension.TSX,
      toExtension: EAssetExtension.XML,
      filters: parameters.filter,
    }),
  ]);

  await buildDynamicLtx(ltxConfigsReplication);
  await buildDynamicXml(xmlConfigsReplication);
}

/**
 * @param descriptors - List of replication descriptors.
 */
async function buildDynamicLtx(descriptors: Array<TFolderReplicationDescriptor>): Promise<void> {
  if (descriptors.length) {
    log.info("Found dynamic LTX configs:", descriptors.length);

    let processedLtxConfigs: number = 0;
    let skippedLtxConfigs: number = 0;

    createDirForConfigs(descriptors, log);

    await Promise.all(
      descriptors.map(async ([from, to]) => {
        const ltxSource = await import(from);
        const ltxContent: Nullable<ILtxConfigDescriptor> =
          (ltxSource?.create || ltxSource?.config) &&
          (typeof ltxSource?.create === "function" ? ltxSource?.create() : ltxSource?.config);

        if (ltxContent) {
          log.debug("TRANSFORM LTX:", blue(to));

          const filename: string = path.parse(to).base;

          await fsp.writeFile(to, renderJsonToLtx(filename, ltxContent));
          processedLtxConfigs += 1;
        } else {
          log.debug("SKIP, not valid LTX source:", blue(from));
          skippedLtxConfigs += 1;
        }
      })
    );

    log.info("Dynamic LTX files processed:", processedLtxConfigs);
    log.info("Dynamic LTX files skipped:", skippedLtxConfigs);
  } else {
    log.info("No dynamic LTX configs found");
  }
}

/**
 * @param descriptors - List of replication descriptors.
 */
async function buildDynamicXml(descriptors: Array<TFolderReplicationDescriptor>): Promise<void> {
  if (descriptors.length) {
    log.info("Found dynamic XML configs:", descriptors.length);

    let processedXmlConfigs: number = 0;
    let skippedXmlConfigs: number = 0;

    createDirForConfigs(descriptors, log);

    await Promise.all(
      descriptors.map(async ([from, to]) => {
        const xmlSource = await import(from);
        const xmlContent = typeof xmlSource?.create === "function" && xmlSource.create();
        const xmlComment = typeof xmlSource?.comment === "string" ? xmlSource.comment : undefined;

        if (xmlContent) {
          log.debug("TRANSFORM XML:", blue(to));
          await fsp.writeFile(to, renderJsxToXmlText(xmlContent, xmlComment));
          processedXmlConfigs += 1;
        } else {
          log.debug("SKIP, not valid XML source:", blue(from));
          skippedXmlConfigs += 1;
        }
      })
    );

    log.info("Dynamic XML files processed:", processedXmlConfigs);
    log.info("Dynamic XML files skipped:", skippedXmlConfigs);
  } else {
    log.info("No dynamic LTX configs found");
  }
}
