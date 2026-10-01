import { ServerObject } from "xray16/alias";
import { isInTimeInterval } from "xray16/lib";

import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { surgeConfig } from "@/engine/core/managers/surge/SurgeConfig";
import type { Squad } from "@/engine/core/objects/squad";
import { getServerDistanceBetween } from "@/engine/core/utils/position";

/**
 * @returns Always true.
 */
export function simulationPreconditionAlways(): boolean {
  return true;
}

/**
 * @returns Whether surge is active at the moment.
 */
export function simulationPreconditionSurge(): boolean {
  return surgeConfig.IS_STARTED;
}

/**
 * @returns Whether surge is not active at the moment.
 */
export function simulationPreconditionNotSurge(): boolean {
  return !surgeConfig.IS_STARTED;
}

/**
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether currently day.
 */
export function simulationPreconditionDay(squad: Squad, target: ServerObject): boolean {
  return isInTimeInterval(simulationConfig.ALIFE_DAY_START_HOUR, simulationConfig.ALIFE_DAY_END_HOUR);
}

/**
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether currently night.
 */
export function simulationPreconditionNight(squad: Squad, target: ServerObject): boolean {
  return isInTimeInterval(simulationConfig.ALIFE_DAY_END_HOUR, simulationConfig.ALIFE_DAY_START_HOUR);
}

/**
 * Late-night window (from 21:00 to day start), distinct from the generic night that starts at day end (19:00).
 * Used for predatory-night vegetarian hunting.
 *
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether currently late night.
 */
export function simulationPreconditionLateNight(squad: Squad, target: ServerObject): boolean {
  return isInTimeInterval(simulationConfig.ALIFE_LATE_NIGHT_HOUR, simulationConfig.ALIFE_DAY_START_HOUR);
}

/**
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether target is near squad (based on object vertexes).
 */
export function simulationPreconditionNear(squad: Squad, target: ServerObject): boolean {
  return getServerDistanceBetween(squad, target) <= simulationConfig.ALIFE_DISTANCE_NEAR;
}

/**
 * Duty and Freedom fight targets near them from 8 to 19, outside of surges.
 *
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether squad and squad target are near (based on object vertexes), currently fighting hours.
 */
export function simulationPreconditionNearDayFight(squad: Squad, target: ServerObject): boolean {
  return isInTimeInterval(8, 19) && !surgeConfig.IS_STARTED && simulationPreconditionNear(squad, target);
}

/**
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether squad and squad target are near (based on object vertexes), currently day.
 */
export function simulationPreconditionNearAndDay(squad: Squad, target: ServerObject): boolean {
  return (
    isInTimeInterval(simulationConfig.ALIFE_DAY_START_HOUR, simulationConfig.ALIFE_DAY_END_HOUR) &&
    getServerDistanceBetween(squad, target) <= simulationConfig.ALIFE_DISTANCE_NEAR
  );
}

/**
 * @param squad - Target squad to check.
 * @param target - Squad activity target.
 * @returns Whether squad and squad target are near (based on object vertexes), currently night.
 */
export function simulationPreconditionNearAndNight(squad: Squad, target: ServerObject): boolean {
  return (
    isInTimeInterval(simulationConfig.ALIFE_DAY_END_HOUR, simulationConfig.ALIFE_DAY_START_HOUR) &&
    getServerDistanceBetween(squad, target) <= simulationConfig.ALIFE_DISTANCE_NEAR
  );
}
