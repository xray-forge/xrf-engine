import { game, level } from "xray16";
import { Time } from "xray16/alias";
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

/**
 * Create a game time some seconds after another one.
 *
 * @param time - Game time to count from.
 * @param seconds - Game seconds to add.
 * @returns New game time.
 */
export function getTimeAfter(time: Time, seconds: TDuration): Time {
  const [Y, M, D, h, m, s, ms] = time.get(0, 0, 0, 0, 0, 0, 0);
  const result: Time = game.CTime();

  result.set(Y, M, D, h, m, s + seconds, ms);

  return result;
}
