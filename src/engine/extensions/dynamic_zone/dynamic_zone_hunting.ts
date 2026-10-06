import { LuaArray, Nillable, TDistance, TLabel, TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { ESimulationTerrainRole, TSimulationObject } from "@/engine/core/managers/simulation/types";
import { getSimulationTerrainDescriptorById, getSimulationTerrains } from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import { isSquad } from "@/engine/core/utils/class_ids";
import { areObjectsOnSameLevel } from "@/engine/core/utils/position";
import type { IDynamicZoneConfig } from "@/engine/extensions/dynamic_zone/dynamic_zone_config";

/**
 * Why the guard refuses a hunt.
 */
export const DYNAMIC_ZONE_BASE_PROTECTION: TLabel = "protected by its base";

/**
 * Context of the hunting guard.
 */
export interface IDynamicZoneHunting {
  // Square of the distance from a base terrain within which squads are not hunted.
  baseProtectionRadiusSqr: TDistance;
  // Terrains with the base role, collected on first use, as terrains register after extensions.
  baseTerrains: Nillable<LuaArray<SmartTerrain>>;
}

/**
 * @param config - Settings of the extension.
 * @returns Context of the hunting guard.
 */
export function createDynamicZoneHunting(config: IDynamicZoneConfig): IDynamicZoneHunting {
  return { baseProtectionRadiusSqr: config.baseProtectionRadius * config.baseProtectionRadius, baseTerrains: null };
}

/**
 * @param terrain - Smart terrain.
 * @returns Whether the terrain has the base role.
 */
function isBaseTerrain(terrain: SmartTerrain): boolean {
  return (terrain.simulationProperties.get(ESimulationTerrainRole.BASE) ?? 0) > 0;
}

/**
 * @param hunting - Context of the hunting guard.
 * @returns Terrains with the base role, collected once.
 */
function getBaseTerrains(hunting: IDynamicZoneHunting): LuaArray<SmartTerrain> {
  if ($isNil(hunting.baseTerrains)) {
    const terrains: LuaArray<SmartTerrain> = new LuaTable();

    for (const [, terrain] of getSimulationTerrains()) {
      if (isBaseTerrain(terrain)) {
        table.insert(terrains, terrain);
      }
    }

    hunting.baseTerrains = terrains;
  }

  return hunting.baseTerrains;
}

/**
 * Hook guard: squads may not hunt a squad that belongs to a base terrain or stands near one.
 *
 * @param target - Simulation target a squad weighs.
 * @param squad - Squad weighing it.
 * @returns Why the hunt is refused, `null` for any other target or a squad away from bases.
 */
export function getDynamicZoneHuntingRejection(
  this: IDynamicZoneHunting,
  target: TSimulationObject,
  squad: Squad
): Nillable<TLabel> {
  if (!isSquad(target)) {
    return null;
  }

  const prey: Squad = target as Squad;
  const terrainId: Nillable<TNumberId> = prey.assignedTerrainId;
  const terrain: Nillable<SmartTerrain> = $isNil(terrainId)
    ? null
    : getSimulationTerrainDescriptorById(terrainId)?.terrain;

  if ($isNotNil(terrain) && isBaseTerrain(terrain)) {
    return DYNAMIC_ZONE_BASE_PROTECTION;
  }

  const bases: LuaArray<SmartTerrain> = getBaseTerrains(this);

  for (const index of $range(1, bases.length())) {
    const base: SmartTerrain = bases.get(index);

    if (
      areObjectsOnSameLevel(prey, base) &&
      prey.position.distance_to_sqr(base.position) <= this.baseProtectionRadiusSqr
    ) {
      return DYNAMIC_ZONE_BASE_PROTECTION;
    }
  }

  return null;
}
