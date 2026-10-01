import { level } from "xray16";
import { GameObject } from "xray16/alias";
import { extern } from "xray16/lib";
import { $filename } from "xray16/macros";

import { forwardGameTime } from "@/engine/core/utils/game";
import { LuaLogger } from "@/engine/core/utils/logging";

export const logger: LuaLogger = new LuaLogger($filename);

/**
 * Advance the in-game clock to the provided hours and minutes.
 *
 * @param actor - Actor game object initiating the effect.
 * @param object - Game object owning the logics scheme.
 * @param hoursString - Target hour of day to set the game time to.
 * @param minutesString - Target minute of the hour to set the game time to.
 */
extern(
  "xr_effects.set_game_time",
  (_: GameObject, __: GameObject, [hoursString, minutesString]: [string, string]): void => {
    logger.info("Set game time: %s %s", hoursString, minutesString);

    const realHours = level.get_time_hours();
    const realMinutes = level.get_time_minutes();

    const hours: number = tonumber(hoursString)!;
    const minutes: number = tonumber(minutesString) ?? 0;

    let hoursToChange: number = hours - realHours;

    if (hoursToChange <= 0) {
      hoursToChange = hoursToChange + 24;
    }

    let minutesToChange = minutes - realMinutes;

    if (minutesToChange <= 0) {
      minutesToChange = minutesToChange + 60;
      hoursToChange = hoursToChange - 1;
    } else if (hours === realHours) {
      hoursToChange = hoursToChange - 24;
    }

    forwardGameTime(hoursToChange, minutesToChange);
  }
);
