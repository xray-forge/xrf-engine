import { GameObject } from "xray16/alias";
import { extern } from "xray16/lib";
import { $filename } from "xray16/macros";

import { forwardGameTime } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";

export const logger: LuaLogger = new LuaLogger($filename);

/**
 * Forward the in-game clock by the provided hours and minutes.
 *
 * @param actor - Actor game object initiating the effect.
 * @param object - Game object owning the logics scheme.
 * @param hoursString - Number of hours to advance the game time by.
 * @param minutesString - Number of minutes to advance the game time by.
 */
extern(
  "xr_effects.forward_game_time",
  (_: GameObject, __: GameObject, [hoursString, minutesString]: [string, string]): void => {
    logger.info("Forward game time");

    const hours: number = tonumber(hoursString)!;
    const minutes: number = tonumber(minutesString) ?? 0;

    forwardGameTime(hours, minutes);
  }
);
