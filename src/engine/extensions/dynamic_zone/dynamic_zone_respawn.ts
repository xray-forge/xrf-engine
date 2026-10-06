import { LuaArray, Nillable, TCount, TDuration, TRate, TSection } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { SYSTEM_INI } from "@/engine/core/database";
import { readIniString } from "@/engine/core/ini";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { IDynamicZoneConfig } from "@/engine/extensions/dynamic_zone/dynamic_zone_config";

/**
 * Hook handler: the respawn wait the extension sets, a terrain's own where its config has one.
 *
 * @param idle - Wait the core decided.
 * @param terrain - Smart terrain that respawns squads.
 * @returns Game seconds the terrain waits between respawn attempts.
 */
export function getDynamicZoneRespawnIdle(this: IDynamicZoneConfig, idle: TDuration, terrain: SmartTerrain): TDuration {
  return this.respawnIdleByTerrain.get(terrain.name()) ?? this.respawnIdle;
}

/**
 * Hook handler: the respawn limit scaled by the factor of the section's kind, monsters or stalkers.
 *
 * @param limit - Limit so far.
 * @param terrain - Smart terrain that respawns squads.
 * @param section - Respawn section of the terrain.
 * @param isRespawnAttempt - Whether the terrain is about to respawn by the limit.
 * @returns How many squads the section may have alive.
 */
export function getDynamicZoneRespawnLimit(
  this: IDynamicZoneConfig,
  limit: TCount,
  terrain: SmartTerrain,
  section: TSection,
  isRespawnAttempt: boolean
): TCount {
  const factor: TRate = isMonsterRespawnSection(terrain.spawnSquadsConfiguration.get(section).squads)
    ? this.monsterRespawnFactor
    : this.stalkerRespawnFactor;

  return scaleDynamicZoneRespawnLimit(limit, factor, isRespawnAttempt);
}

/**
 * Scale a respawn limit, rounding half up. A share of one squad is a chance rolled when the terrain tries to respawn,
 * shown as the squad it may get.
 *
 * @param limit - Limit to scale.
 * @param factor - Scale factor.
 * @param isRespawnAttempt - Whether the terrain is about to respawn by the limit.
 * @returns The scaled limit.
 */
export function scaleDynamicZoneRespawnLimit(limit: TCount, factor: TRate, isRespawnAttempt: boolean): TCount {
  const scaled: number = limit * factor;

  if (scaled <= 0 || scaled >= 1) {
    return math.floor(scaled + 0.5);
  }

  if (!isRespawnAttempt) {
    return 1;
  }

  return math.random() < scaled ? 1 : 0;
}

/**
 * @param squads - Squad sections a respawn section picks from.
 * @returns Whether the section respawns monsters, judged by the faction of its first squad.
 */
function isMonsterRespawnSection(squads: LuaArray<TSection>): boolean {
  const squad: Nillable<TSection> = squads.get(1);
  const faction: Nillable<string> = $isNil(squad) ? null : readIniString(SYSTEM_INI, squad, "faction", false);

  return $isNil(faction) ? false : faction.startsWith("monster");
}
