import { level } from "xray16";
import { TDuration } from "xray16/lib";
import { $filename } from "xray16/macros";

import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import { LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Jump game time forward at once, letting weather and surges catch up with the time skipped.
 *
 * @param hours - Game hours to skip.
 * @param minutes - Game minutes to skip.
 */
export function forwardGameTime(hours: TDuration, minutes: TDuration = 0): void {
  logger.info("Forward game time: %s:%s", hours, minutes);

  level.change_game_time(0, hours, minutes);

  EventsManager.emitEvent(EGameEvent.GAME_TIME_FORWARDED);
}
