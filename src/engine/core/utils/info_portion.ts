import { Nillable, TCount, TName } from "xray16/lib";
import { $filename, $isNil, $isNotNil } from "xray16/macros";

import { TInfoPortion } from "@/engine/constants/info_portions/info_portions";
import { registry } from "@/engine/core/database/registry";
import { ELuaLoggerMode, LuaLogger } from "@/engine/core/utils/logging";

const logger: LuaLogger = new LuaLogger($filename, { file: "info_portions", mode: ELuaLoggerMode.DUAL });

/**
 * Replace the actor info portions mirror when the whole state becomes unknown.
 * Called on actor lifecycle changes (register / unregister) - granular mutations are applied
 * with `updateInfoPortionCache` instead, engine callbacks make every mutation observable.
 */
export function invalidateInfoPortionsCache(): void {
  registry.cache.infoPortions = new LuaMap();
}

/**
 * Update state of a single info portion in the mirror cache.
 * Called from lua-side give / disable utils and from actor binder engine callbacks
 * (`inventory_info` grants, `inventory_info_removed` disables).
 *
 * @param name - Info portion name to update.
 * @param isActive - Whether the info portion is known to be active.
 */
export function updateInfoPortionCache(name: TName, isActive: boolean): void {
  registry.cache.infoPortions.set(name, isActive);
}

/**
 * Give info portion to actor.
 *
 * @param name - Info portion to give to actor.
 */
export function giveInfoPortion(name: TName): void {
  logger.info("Give info portion: %s", name);

  registry.actor.give_info_portion(name);
  updateInfoPortionCache(name, true);
}

/**
 * Disable actor info portion.
 *
 * @param name - Info portion to disable.
 */
export function disableInfoPortion(name: TName): void {
  logger.info("Disable info portion: %s", name);

  if (hasInfoPortion(name)) {
    registry.actor.disable_info_portion(name);
    updateInfoPortionCache(name, false);
  }
}

/**
 * Whether actor has info portion set.
 * Fallbacks to false if actor is not registered.
 *
 * Checks hit the mirror cache first - condlists re-check the same handful of infos many times
 * per frame and each miss crosses into an engine O(n) vector scan, so steady-state checks are
 * plain table reads.
 *
 * @returns Whether actor has info portion set already.
 */
export function hasInfoPortion(name: TName): name is TInfoPortion {
  if ($isNil(registry.actor)) {
    return false;
  }

  const existing: Nillable<boolean> = registry.cache.infoPortions.get(name);

  if ($isNotNil(existing)) {
    return existing;
  }

  const isActive: boolean = registry.actor.has_info(name);

  registry.cache.infoPortions.set(name, isActive);

  return isActive;
}

/**
 * Whether actor has all alife info from the list.
 *
 * @param names - Array of infos to check.
 * @returns Whether actor has info portions active.
 */
export function hasInfoPortions(names: Array<TName>): boolean {
  return hasFewInfoPortions(names, table.size(names));
}

/**
 * Whether actor has at least one alife info from the list.
 *
 * @param names - Array of infos to check.
 * @returns Whether actor has at least one info portion from list.
 */
export function hasAtLeastOneInfoPortion(names: Array<TName>): boolean {
  return hasFewInfoPortions(names, 1);
}

/**
 * Whether actor has alife infos from the list.
 *
 * @param names - Array of infos to check.
 * @param count - Count of infos required to satisfy conditions.
 * @returns Whether actor has few of required info portions.
 */
export function hasFewInfoPortions(names: Array<TName>, count: TCount): boolean {
  let activeInfos: TCount = 0;

  for (let it = 0; it < names.length; it++) {
    if (hasInfoPortion(names[it])) {
      activeInfos += 1;

      if (activeInfos >= count) {
        return true;
      }
    }
  }

  return false;
}
