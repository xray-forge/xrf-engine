import * as cp from "node:child_process";
import * as path from "node:path";

import { blue, blueBright } from "chalk";

import { GAME_DATA_UI_DIR, RESOURCES_DIR, XRF_UTILS_PATH } from "#/globals";
import { ISpritesCommandParameters } from "#/sprites/run";
import { NodeLogger } from "#/utils/logging";
import { TimeTracker } from "#/utils/timing";

const log: NodeLogger = NodeLogger.forFile(__filename);

export function packDescriptionSprites(parameters: ISpritesCommandParameters): void {
  log.info(blueBright("Pack description sprites"), parameters);

  const timeTracker: TimeTracker = new TimeTracker().start();

  const command: string = `${XRF_UTILS_PATH} sprite pack-description --description ${path.resolve(
    GAME_DATA_UI_DIR,
    "textures_descr",
    parameters.description ?? ""
  )} --base ${path.resolve(RESOURCES_DIR, "textures_unpacked")} --output ${path.resolve(
    RESOURCES_DIR,
    "textures"
  )} ${parameters.strict ? " --strict" : ""}${parameters.verbose ? " --verbose" : ""}`;

  log.info("Execute:", blue(command));

  cp.execSync(command, {
    stdio: "inherit",
  });

  log.info(
    "Successfully executed pack description sprites command, took:",
    timeTracker.end().getDuration() / 1000,
    "sec"
  );
}
