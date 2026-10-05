import { game } from "xray16";
import { Time } from "xray16/alias";
import { LuaArray, Nillable, TCount, TLabel } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { IDebugField } from "@/engine/core/managers/debug/debug_types";
import {
  addDebugField,
  describeDebugObject,
  describeDebugRates,
  formatDebugGameDuration,
  getDebugObjectLevelName,
} from "@/engine/core/managers/debug/utils/debug_inspect";
import {
  getSimulationTerrainAssignedSquadsCount,
  getSimulationTerrainDescriptorById,
} from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { ESmartTerrainStatus } from "@/engine/core/objects/smart_terrain/smart_terrain_types";
import { smartTerrainConfig } from "@/engine/core/objects/smart_terrain/SmartTerrainConfig";
import {
  getSmartTerrainRespawnBlocker,
  getSmartTerrainRespawnLimit,
} from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";

/**
 * @param terrain - Simulation smart terrain.
 * @returns The terrain's alarm state, `null` for a terrain without control.
 */
function describeTerrainAlarm(terrain: SmartTerrain): Nillable<TLabel> {
  if ($isNil(terrain.terrainControl)) {
    return null;
  }

  switch (terrain.terrainControl.status) {
    case ESmartTerrainStatus.NORMAL:
      return "normal";
    case ESmartTerrainStatus.DANGER:
      return "danger";
    case ESmartTerrainStatus.ALARM:
      return "alarm";
  }
}

/**
 * Describe a respawn point: its sections with their counts, and when and whether it respawns next.
 *
 * @param fields - Fields to add to.
 * @param terrain - Smart terrain that respawns squads.
 */
function inspectTerrainRespawn(fields: LuaArray<IDebugField>, terrain: SmartTerrain): void {
  let hasRoom: boolean = false;

  for (const [section] of terrain.spawnSquadsConfiguration) {
    const spawned: TCount = terrain.spawnedSquadsList.get(section).num;
    const limit: TCount = getSmartTerrainRespawnLimit(terrain, section);

    hasRoom = hasRoom || limit > spawned;
    addDebugField(fields, "respawns", string.format("%s: %d/%d", section, spawned, limit));
  }

  const lastCheck: Nillable<Time> = terrain.lastRespawnUpdatedAt;

  addDebugField(
    fields,
    "next respawn check",
    $isNil(lastCheck)
      ? "on the next update"
      : formatDebugGameDuration(smartTerrainConfig.RESPAWN_IDLE - game.get_game_time().diffSec(lastCheck))
  );
  addDebugField(
    fields,
    "respawn",
    getSmartTerrainRespawnBlocker(terrain) ?? (hasRoom ? "ready" : "every section is at its limit")
  );
}

/**
 * Describe a smart terrain for the simulation tab: its role, population, jobs and respawn.
 *
 * @param terrain - Simulation smart terrain.
 * @returns Labelled values describing the terrain.
 */
export function inspectDebugTerrain(terrain: SmartTerrain): LuaArray<IDebugField> {
  const fields: LuaArray<IDebugField> = new LuaTable();

  addDebugField(fields, "smart terrain", describeDebugObject(terrain.id));
  addDebugField(fields, "level", getDebugObjectLevelName(terrain));
  addDebugField(
    fields,
    "role",
    terrain.isRespawnOnlySmart ? `${terrain.simulationRole}, respawn only` : terrain.simulationRole
  );
  addDebugField(fields, "properties", describeDebugRates(terrain.simulationProperties));
  addDebugField(fields, "as a target", registry.simulationObjects.has(terrain.id) ? "available" : "unavailable");
  addDebugField(fields, "alarm", describeTerrainAlarm(terrain));
  addDebugField(
    fields,
    "population",
    string.format("%d/%d squads", getSimulationTerrainAssignedSquadsCount(terrain.id), terrain.maxStayingSquadsCount)
  );

  for (const [, squad] of getSimulationTerrainDescriptorById(terrain.id)?.assignedSquads ?? new LuaTable()) {
    addDebugField(
      fields,
      "squad",
      $isNil(squad.getScriptedSimulationTarget()) ? squad.name() : `${squad.name()}, scripted`
    );
  }

  addDebugField(
    fields,
    "objects",
    string.format("%d staying, %d arriving", terrain.stayingObjectsCount, table.size(terrain.arrivingObjects))
  );

  for (const [id, state] of terrain.objectJobDescriptors) {
    addDebugField(
      fields,
      state.isBegun ? "job" : "job, not begun",
      `${state.job?.section ?? "none"}: ${describeDebugObject(id)}`
    );
  }

  if (terrain.isRespawnPoint) {
    inspectTerrainRespawn(fields, terrain);
  }

  return fields;
}
