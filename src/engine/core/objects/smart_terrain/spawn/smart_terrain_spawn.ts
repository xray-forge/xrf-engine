import { game } from "xray16";
import { Time } from "xray16/alias";
import { abort, LuaArray, Nillable, TCount, TRUE, TSection } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { parseConditionsList, parseStringsList, pickSectionFromCondList, readIniString } from "@/engine/core/ini";
import { EGameEvent, EventsManager } from "@/engine/core/managers/events";
import {
  createSimulationSquad,
  getSimulationTerrainAssignedSquadsCount,
} from "@/engine/core/managers/simulation/utils";
import { ESmartTerrainRespawnBlocker } from "@/engine/core/objects/smart_terrain/smart_terrain_types";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { Squad } from "@/engine/core/objects/squad";

/**
 * Apply respawn configuration for provided smart terrain.
 * Based on provided section tries to read list of squad sections to get exact targets and count to spawn.
 *
 * @param terrain - Target smart terrain to set configuration for.
 * @param section - Section in smart terrain ini configuration file to read spawn information from.
 */
export function applySmartTerrainRespawnSectionsConfig(terrain: SmartTerrain, section: TSection): void {
  terrain.isRespawnPoint = true;
  terrain.spawnSquadsConfiguration = new LuaTable();
  terrain.spawnedSquadsList = new LuaTable();

  if (!terrain.ini.section_exist(section)) {
    abort("Could not find respawn configuration section '%s' for '%s'.", section, terrain.name());
  }

  const parametersCount: TCount = terrain.ini.line_count(section);

  if (parametersCount === 0) {
    abort("Wrong smart terrain respawn configuration section '%s' - empty for '%s'.", section, terrain.name());
  }

  for (const it of $range(0, parametersCount - 1)) {
    const [, sectionName] = terrain.ini.r_line(section, it, "", "");

    // Validate respawn section line.
    if (!terrain.ini.section_exist(sectionName)) {
      abort(
        "Wrong smart terrain respawn configuration section '%s' line '%s' - there is no such section.",
        section,
        sectionName
      );
    }

    const squadsCount: Nillable<string> = readIniString(terrain.ini, sectionName, "spawn_num", false);
    const squadsToSpawn: Nillable<string> = readIniString(terrain.ini, sectionName, "spawn_squads", false);

    // Validate each line to be defined.
    if ($isNil(squadsToSpawn)) {
      abort(
        "Wrong smart terrain respawn configuration section '%s' line 'spawn_squads' in '%s' is not defined.",
        section,
        sectionName
      );
    } else if ($isNil(squadsCount)) {
      abort(
        "Wrong smart terrain respawn configuration section '%s' line 'spawn_num' in '%s' is not defined.",
        section,
        sectionName
      );
    }

    terrain.spawnedSquadsList.set(sectionName, { num: 0 });
    terrain.spawnSquadsConfiguration.set(sectionName, {
      num: parseConditionsList(squadsCount),
      squads: parseStringsList(squadsToSpawn),
    });
  }
}

/**
 * Respawn random squad section from smart terrain spawn config.
 * Finds random one available to spawn and assigns it to the terrain.
 *
 * @param terrain - Target smart terrain to spawn squad in.
 * @returns Spawned squad or null if cannot spawn any.
 */
export function respawnSmartTerrainSquad(terrain: SmartTerrain): Nillable<Squad> {
  // logger.format("Respawn squad in smart: %s", this.name());

  const availableSections: LuaArray<TSection> = new LuaTable();

  // Pick section that can be used for spawn and have available spots.
  for (const [section] of terrain.spawnSquadsConfiguration) {
    if (getSmartTerrainRespawnLimit(terrain, section) > terrain.spawnedSquadsList.get(section).num) {
      table.insert(availableSections, section);
    }
  }

  // No available spawn spots.
  if (availableSections.length() === 0) {
    return null;
  }

  const spawnSection: TSection = table.random(availableSections)[1];
  const squadSection: TSection = table.random(terrain.spawnSquadsConfiguration.get(spawnSection).squads)[1];

  const squad: Squad = createSimulationSquad(terrain, squadSection);

  squad.respawnPointId = terrain.id;
  squad.respawnPointSection = spawnSection;

  terrain.spawnedSquadsList.get(spawnSection).num += 1;

  EventsManager.emitEvent(EGameEvent.SMART_TERRAIN_SQUAD_RESPAWNED, terrain, squad);

  return squad;
}

/**
 * @param terrain - Target smart terrain to check spawn availability for.
 * @param now - Current game time.
 * @returns Whether smart terrain squad spawn operation can be performed.
 */
export function canRespawnSmartTerrainSquad(terrain: SmartTerrain, now: Time = game.get_game_time()): boolean {
  // Throttle respawn attempts period.
  // Memoize `false` state for `idle` period of time.
  if (terrain.lastRespawnUpdatedAt && now.diffSec(terrain.lastRespawnUpdatedAt) <= smartTerrainConfig.RESPAWN_IDLE) {
    return false;
  } else {
    terrain.lastRespawnUpdatedAt = now;
  }

  return $isNil(getSmartTerrainRespawnBlocker(terrain));
}

/**
 * @param terrain - Smart terrain to check.
 * @returns Why the terrain cannot respawn a squad now, `null` when it can, the throttle period aside.
 */
export function getSmartTerrainRespawnBlocker(terrain: SmartTerrain): Nillable<ESmartTerrainRespawnBlocker> {
  if (pickSectionFromCondList(registry.actor, terrain, terrain.isSimulationAvailableConditionList) !== TRUE) {
    return ESmartTerrainRespawnBlocker.UNAVAILABLE;
  } else if (getSimulationTerrainAssignedSquadsCount(terrain.id) >= terrain.maxStayingSquadsCount) {
    return ESmartTerrainRespawnBlocker.FULL;
  } else if (
    registry.actorServer.position.distance_to_sqr(terrain.position) <= smartTerrainConfig.RESPAWN_RADIUS_RESTRICTION_SQR
  ) {
    return ESmartTerrainRespawnBlocker.ACTOR_NEARBY;
  }

  return null;
}

/**
 * @param terrain - Smart terrain with respawn configuration.
 * @param section - Respawn section of the terrain.
 * @returns How many squads the section may have spawned and alive now.
 */
export function getSmartTerrainRespawnLimit(terrain: SmartTerrain, section: TSection): TCount {
  return tonumber(
    pickSectionFromCondList(registry.actor, null, terrain.spawnSquadsConfiguration.get(section).num)
  ) as TCount;
}
