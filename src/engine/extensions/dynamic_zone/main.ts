import { TName } from "xray16/lib";
import { $dirname } from "xray16/macros";

import { IExtensionsDescriptor, openExtensionIni } from "@/engine/core/extensions";
import { EGameHook, EGameHookPhase, registerGameHook } from "@/engine/core/hooks";
import { LuaLogger } from "@/engine/core/utils/logging";
import { IDynamicZoneConfig, readDynamicZoneConfig } from "@/engine/extensions/dynamic_zone/dynamic_zone_config";
import {
  createDynamicZoneHunting,
  getDynamicZoneHuntingRejection,
} from "@/engine/extensions/dynamic_zone/dynamic_zone_hunting";
import {
  getDynamicZoneRespawnIdle,
  getDynamicZoneRespawnLimit,
} from "@/engine/extensions/dynamic_zone/dynamic_zone_respawn";

const logger: LuaLogger = new LuaLogger($dirname);

export const name: TName = "Dynamic zone";
export const enabled: boolean = false;

/**
 * Make the zone calmer around the player: respawn points wait longer and respawn fewer squads, and squads at or near
 * bases are not hunted.
 *
 * @param isNewGame - Whether a new game starts.
 * @param extension - Descriptor of the extension, locating its `main.ltx`.
 */
export function register(isNewGame: boolean, extension: IExtensionsDescriptor): void {
  const config: IDynamicZoneConfig = readDynamicZoneConfig(openExtensionIni(extension));

  logger.info("Dynamic zone activated, respawn wait: %s", config.respawnIdle);

  registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_IDLE, getDynamicZoneRespawnIdle, {
    owner: name,
    phase: EGameHookPhase.SET,
    context: config,
  });
  registerGameHook(EGameHook.SMART_TERRAIN_RESPAWN_LIMIT, getDynamicZoneRespawnLimit, {
    owner: name,
    context: config,
  });
  registerGameHook(EGameHook.SIMULATION_TARGET_VALIDITY, getDynamicZoneHuntingRejection, {
    owner: name,
    context: createDynamicZoneHunting(config),
  });
}
