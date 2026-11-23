import * as cp from "node:child_process";
import * as path from "node:path";

import { blue, blueBright } from "chalk";

import { GAME_DATA_LTX_CONFIGS_DIR, RESOURCES_DIR, XRF_UTILS_PATH } from "#/globals";
import { ISpritesCommandParameters } from "#/sprites/run";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

/**
 * Assemble DDS sprite files based on many small DDS elements.
 */
export async function packEquipmentSprite(parameters: ISpritesCommandParameters): Promise<void> {
  log.info(blueBright("Pack equipment sprite:"), parameters);

  const timeTracker: TimeTracker = new TimeTracker().start();

  const args: Array<string> = [
    "sprite",
    "pack-equipment",
    path.resolve(RESOURCES_DIR, "textures_unpacked", "ui", "ui_icon_equipment"),
    "--system-ltx",
    path.resolve(GAME_DATA_LTX_CONFIGS_DIR, "system.ltx"),
    "-d",
    path.resolve(RESOURCES_DIR, "textures", "ui", "ui_icon_equipment.dds"),
  ];

  if (parameters.strict) {
    args.push("--strict");
  }

  if (parameters.verbose) {
    args.push("--verbose");
  }

  log.info("Execute:", blue([XRF_UTILS_PATH, ...args].join(" ")));

  cp.execFileSync(XRF_UTILS_PATH, args, { stdio: "inherit" });

  log.info("Successfully executed pack equipment sprite command, took:", timeTracker.end().getDuration() / 1000, "sec");
}
