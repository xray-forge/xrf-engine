import { get_console, level } from "xray16";
import { executeConsoleCommand, TCount, TDuration, TLabel } from "xray16/lib";
import { $filename } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { EDebugToggleType, IDebugConsoleToggle } from "@/engine/core/managers/debug/debug_types";
import { inspectActorLocation } from "@/engine/core/managers/debug/utils/debug_inspect";
import { SurgeManager } from "@/engine/core/managers/surge";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import { WeatherManager } from "@/engine/core/managers/weather";
import { forwardGameTime } from "@/engine/core/utils/game/game_time";
import { LuaLogger } from "@/engine/core/utils/logging";
import { restoreObjectCondition } from "@/engine/core/utils/object";
import { giveMoneyToActor } from "@/engine/core/utils/reward";

const logger: LuaLogger = new LuaLogger($filename);

/**
 * Give the actor money, or take it with a negative amount.
 *
 * @param amount - Money to give.
 * @returns Result message.
 */
export function giveDebugMoney(amount: TCount): TLabel {
  if (amount > 0) {
    giveMoneyToActor(amount);
  } else {
    registry.actor.give_money(amount);
  }

  return string.format("money %+d, now %d", amount, registry.actor.money());
}

/**
 * @returns Result message.
 */
export function healDebugActor(): TLabel {
  restoreObjectCondition(registry.actor);

  return "actor healed";
}

/**
 * @param toggle - Console toggle.
 * @returns Whether the toggle is on.
 */
export function isDebugToggleEnabled(toggle: IDebugConsoleToggle): boolean {
  return get_console().get_bool(toggle.command);
}

/**
 * Turn a console toggle on or off.
 *
 * @param toggle - Console toggle.
 * @param isEnabled - Whether to turn it on.
 * @returns Result message.
 */
export function setDebugToggle(toggle: IDebugConsoleToggle, isEnabled: boolean): TLabel {
  const value: TLabel = toggle.type === EDebugToggleType.ON_OFF ? (isEnabled ? "on" : "off") : isEnabled ? "1" : "0";

  executeConsoleCommand(toggle.command, value);

  return `${toggle.command} ${value}`;
}

/**
 * @param hours - Game hours to skip.
 * @returns Result message.
 */
export function forwardDebugTime(hours: TDuration): TLabel {
  forwardGameTime(hours);

  return string.format(
    "time forwarded by %d h, now %02d:%02d",
    hours,
    level.get_time_hours(),
    level.get_time_minutes()
  );
}

/**
 * @returns Result message.
 */
export function changeDebugWeather(): TLabel {
  getManager(WeatherManager).changeWeatherState();

  return `weather now ${level.get_weather()}`;
}

/**
 * Start a surge, or stop the one in progress.
 *
 * @returns Result message.
 */
export function toggleDebugSurge(): TLabel {
  const surgeManager: SurgeManager = getManager(SurgeManager);

  if (surgeConfig.IS_STARTED) {
    surgeManager.requestSurgeStop();

    return "surge stopped";
  }

  surgeManager.requestSurgeStart();

  return surgeConfig.IS_STARTED ? "surge started" : "no surge covers on this level";
}

/**
 * Write where the actor stands to the log.
 *
 * @returns Result message.
 */
export function logDebugActorLocation(): TLabel {
  const location: TLabel = inspectActorLocation();

  logger.info("Actor location: %s", location);

  return `logged ${location}`;
}
