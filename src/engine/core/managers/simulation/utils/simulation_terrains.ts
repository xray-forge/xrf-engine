import { abort, LuaArray } from "xray16/lib";
import { $filename } from "xray16/macros";

import { simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { assignSimulationSquadToTerrain } from "@/engine/core/managers/simulation/utils/simulation_squads";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain/SmartTerrain";
import { type Squad } from "@/engine/core/objects/squad/Squad";
import { LuaLogger } from "@/engine/core/utils/logging";

const simulationLogger: LuaLogger = new LuaLogger($filename, { file: "simulation" });

/**
 * Register smart terrain in simulation.
 *
 * @param terrain - Target smart terrain object to register in alife simulation.
 */
export function registerSimulationTerrain(terrain: SmartTerrain): void {
  simulationLogger.info("Register smart terrain: %s", terrain.name());

  if (simulationConfig.TERRAIN_DESCRIPTORS.has(terrain.id)) {
    abort("Smart terrain '%s' is already registered in simulation board.", terrain.name());
  }

  simulationConfig.TERRAINS.set(terrain.name(), terrain);
  simulationConfig.TERRAIN_DESCRIPTORS.set(terrain.id, {
    terrain: terrain,
    assignedSquads: new LuaTable(),
  });
}

/**
 * Unregister smart terrain from simulation.
 *
 * @param terrain - Target smart terrain to unregister.
 */
export function unregisterSimulationTerrain(terrain: SmartTerrain): void {
  simulationLogger.info("Unregister smart terrain: %s", terrain.name());

  if (!simulationConfig.TERRAIN_DESCRIPTORS.has(terrain.id)) {
    abort("Trying to unregister not registered smart terrain '%s'.", terrain.name());
  }

  simulationConfig.TERRAINS.delete(terrain.name());
  simulationConfig.TERRAIN_DESCRIPTORS.delete(terrain.id);
}

/**
 * Assign squads that were registered before smart terrain.
 * Fixes race condition when some objects are initialized before smart terrains.
 *
 * @param terrain - Target smart terrain to initialize delayed squads for.
 */
export function initializeSimulationTerrain(terrain: SmartTerrain): void {
  // Resolve assigned squads state.
  if (simulationConfig.TEMPORARY_ASSIGNED_SQUADS.has(terrain.id)) {
    const assignedSquads: LuaArray<Squad> = simulationConfig.TEMPORARY_ASSIGNED_SQUADS.get(terrain.id);

    simulationConfig.TEMPORARY_ASSIGNED_SQUADS.delete(terrain.id);

    for (const [, squad] of assignedSquads) {
      assignSimulationSquadToTerrain(squad, terrain.id);
    }
  }
}
