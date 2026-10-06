import { LuaArray, Nillable, TCount, TLabel, TName } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { EGameHook } from "@/engine/core/hooks/hooks_types";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  addDebugField,
  describeDebugGameHook,
  formatDebugGameDuration,
  getDebugObjectLevelName,
} from "@/engine/core/managers/debug/utils/debug_inspect";
import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { ESimulationTerrainRole } from "@/engine/core/managers/simulation/types";
import {
  getSimulationSquads,
  getSimulationTerrainAssignedSquadsCount,
  getSimulationTerrains,
} from "@/engine/core/managers/simulation/utils";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import { getSmartTerrainRespawnBlocker } from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import { squadConfig } from "@/engine/core/objects/squad/SquadConfig";
import { getTableKeys } from "@/engine/core/utils/table";

// Properties terrains are grouped by, as their role is mostly the default one.
const TERRAIN_PROPERTIES: Array<ESimulationTerrainRole> = [
  ESimulationTerrainRole.BASE,
  ESimulationTerrainRole.RESOURCE,
  ESimulationTerrainRole.LAIR,
  ESimulationTerrainRole.TERRITORY,
  ESimulationTerrainRole.SURGE,
];

/**
 * Squads of one faction on a level.
 */
interface IDebugFactionCounts {
  squads: TCount;
  members: TCount;
}

/**
 * Terrains of a level with one property, with their population against their capacity.
 */
interface IDebugPropertyCounts {
  terrains: TCount;
  squads: TCount;
  capacity: TCount;
}

/**
 * Show the squads of a level by faction.
 *
 * @param fields - Fields to add to.
 * @param levelName - Level name.
 */
function inspectLevelSquads(fields: LuaArray<IDebugField>, levelName: TName): void {
  const byFaction: LuaTable<TName, IDebugFactionCounts> = new LuaTable();

  for (const [, squad] of getSimulationSquads()) {
    if (getDebugObjectLevelName(squad) === levelName) {
      const it: IDebugFactionCounts = byFaction.get(squad.faction) ?? { squads: 0, members: 0 };

      it.squads += 1;
      it.members += squad.npc_count();
      byFaction.set(squad.faction, it);
    }
  }

  const factions: LuaArray<TName> = getTableKeys(byFaction);

  table.sort(factions, (first, second) => first < second);

  for (const [, faction] of factions) {
    const it: IDebugFactionCounts = byFaction.get(faction);

    addDebugField(fields, faction, string.format("%d squads, %d members", it.squads, it.members));
  }
}

/**
 * Show the terrains of a level by property, and its respawn points.
 *
 * @param fields - Fields to add to.
 * @param levelName - Level name.
 */
function inspectLevelTerrains(fields: LuaArray<IDebugField>, levelName: TName): void {
  const byProperty: LuaTable<TName, IDebugPropertyCounts> = new LuaTable();
  let respawnPoints: TCount = 0;
  let respawnPointsReady: TCount = 0;

  for (const [, terrain] of getSimulationTerrains()) {
    if (getDebugObjectLevelName(terrain) === levelName) {
      const squads: TCount = getSimulationTerrainAssignedSquadsCount(terrain.id);

      for (const property of TERRAIN_PROPERTIES) {
        if ((terrain.simulationProperties.get(property) ?? 0) > 0) {
          const it: IDebugPropertyCounts = byProperty.get(property) ?? { terrains: 0, squads: 0, capacity: 0 };

          it.terrains += 1;
          it.squads += squads;
          it.capacity += terrain.maxStayingSquadsCount;
          byProperty.set(property, it);
        }
      }

      if (terrain.isRespawnPoint) {
        respawnPoints += 1;
        respawnPointsReady += $isNil(getSmartTerrainRespawnBlocker(terrain)) ? 1 : 0;
      }
    }
  }

  for (const property of TERRAIN_PROPERTIES) {
    const it: IDebugPropertyCounts = byProperty.get(property);

    if ($isNotNil(it)) {
      addDebugField(
        fields,
        `${property} terrains`,
        string.format("%d, %d/%d squads", it.terrains, it.squads, it.capacity)
      );
    }
  }

  addDebugField(fields, "respawn points", string.format("%d, %d not blocked", respawnPoints, respawnPointsReady));
}

/**
 * @param value - Value the core sets, `null` for rules without one.
 * @param hook - Hook extensions change it with.
 * @returns The value with the extensions changing it, `null` for a rule no extension changes.
 */
function describeChangedTunable(value: Nillable<TLabel>, hook: EGameHook): Nillable<TLabel> {
  const owners: Nillable<TLabel> = describeDebugGameHook(hook);

  if ($isNil(owners)) {
    return value;
  }

  return $isNil(value) ? `changed by ${owners}` : `${value}, changed by ${owners}`;
}

/**
 * Show the simulation's tunables, read only, with the extensions changing them.
 *
 * @param fields - Fields to add to.
 */
function inspectSimulationTunables(fields: LuaArray<IDebugField>): void {
  addDebugField(fields, "base priority", tostring(simulationConfig.TARGET_PRIORITY_BASE));
  addDebugField(fields, "target choices", tostring(simulationConfig.TARGET_CHOICES));
  addDebugField(
    fields,
    "outrank rescan",
    string.format("%.1fs", simulationConfig.SQUAD_TARGET_OUTRANK_RECHECK_INTERVAL / 1000)
  );
  addDebugField(
    fields,
    "stay on target",
    `${formatDebugGameDuration(squadConfig.STAY_POINT_IDLE_MIN)} to ${formatDebugGameDuration(squadConfig.STAY_POINT_IDLE_MAX)}`
  );
  addDebugField(
    fields,
    "respawn idle",
    describeChangedTunable(
      formatDebugGameDuration(smartTerrainConfig.RESPAWN_IDLE),
      EGameHook.SMART_TERRAIN_RESPAWN_IDLE
    )
  );
  addDebugField(fields, "respawn limits", describeChangedTunable(null, EGameHook.SMART_TERRAIN_RESPAWN_LIMIT));
  addDebugField(fields, "target rules", describeChangedTunable(null, EGameHook.SIMULATION_TARGET_VALIDITY));
  addDebugField(fields, "respawn radius", string.format("%d m", smartTerrainConfig.RESPAWN_RADIUS_RESTRICTION));
}

/**
 * Describe a level of the simulation: its squads by faction, terrains by property, respawn points and the tunables.
 *
 * @param levelName - Level name.
 * @returns Labelled values describing the level.
 */
export function inspectDebugSimulationLevel(levelName: TName): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, "level", levelName);
  inspectLevelSquads(fields, levelName);
  inspectLevelTerrains(fields, levelName);
  inspectSimulationTunables(fields);

  return fields;
}
