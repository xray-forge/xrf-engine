import { LuaArray, Nillable, TCount, TLabel, TNumberId } from "xray16/lib";
import { $isNil, $isNotNil } from "xray16/macros";

import { getStoryIdByObjectId, registry } from "@/engine/core/database";
import { describeDebugObject } from "@/engine/core/managers/debug/utils/debug_inspect";
import { TSimulationObject } from "@/engine/core/managers/simulation/types";
import { getSimulationTerrainDescriptorById, releaseSimulationSquad } from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { respawnSmartTerrainSquad } from "@/engine/core/objects/smart_terrain/spawn/smart_terrain_spawn";
import type { Squad } from "@/engine/core/objects/squad";
import { isSmartTerrain } from "@/engine/core/utils/class_ids";
import { areObjectsOnSameLevel } from "@/engine/core/utils/position";

/**
 * Send a squad under simulation control to a target, as when it picks one itself. The simulation keeps the target
 * while it stays valid for the squad.
 *
 * @param squad - Simulation squad.
 * @param targetId - Id of a terrain, a squad or the actor.
 * @returns Result message.
 */
export function sendDebugSquadToTarget(squad: Squad, targetId: TNumberId): TLabel {
  const target: Nillable<TSimulationObject> = registry.simulationObjects.get(targetId);

  if ($isNotNil(squad.getScriptedSimulationTarget())) {
    return `${squad.name()} follows its scripted targets`;
  } else if (targetId === squad.id) {
    return "a squad cannot target itself";
  } else if ($isNil(target)) {
    return `${describeDebugObject(targetId)} is not a simulation target now`;
  } else if (!areObjectsOnSameLevel(target, squad)) {
    return `${target.name()} is on another level`;
  } else if (!target.isValidSimulationTarget(squad)) {
    return isSmartTerrain(target)
      ? `${target.name()} does not take ${squad.name()}: ${(target as SmartTerrain).getSimulationTargetRejection(squad)}`
      : `${target.name()} is not a target ${squad.name()} may take`;
  }

  squad.currentAction?.finalize();
  squad.currentAction = null;
  squad.assignedTargetId = targetId;
  squad.selectNewAction(true);

  return `sent ${squad.name()} to ${target.name()}`;
}

/**
 * Respawn a squad at a respawn point now, past its throttle and blockers but within its section limits.
 *
 * @param terrain - Smart terrain that respawns squads.
 * @returns Result message.
 */
export function respawnDebugTerrainSquad(terrain: SmartTerrain): TLabel {
  if (!terrain.isRespawnPoint) {
    return `${terrain.name()} does not respawn squads`;
  }

  const squad: Nillable<Squad> = respawnSmartTerrainSquad(terrain);

  return $isNil(squad)
    ? `every respawn section of ${terrain.name()} is at its limit`
    : `respawned ${squad.name()} at ${terrain.name()}`;
}

/**
 * Release the squads of a terrain with their members, keeping story squads.
 *
 * @param terrain - Simulation smart terrain.
 * @returns Result message.
 */
export function clearDebugTerrainSquads(terrain: SmartTerrain): TLabel {
  const squads: LuaArray<Squad> = new LuaTable();
  let kept: TCount = 0;

  // Collected first, as each release leaves the terrain's table.
  for (const [, squad] of getSimulationTerrainDescriptorById(terrain.id)?.assignedSquads ?? new LuaTable()) {
    if ($isNil(getStoryIdByObjectId(squad.id))) {
      table.insert(squads, squad);
    } else {
      kept += 1;
    }
  }

  for (const [, squad] of squads) {
    releaseSimulationSquad(squad);
  }

  return string.format("released %d squads of %s, kept %d story squads", squads.length(), terrain.name(), kept);
}
