import { game_graph } from "xray16";
import { assert, LuaArray, Nillable, TCount, TName, TSection } from "xray16/lib";
import { $filename } from "xray16/macros";

import { registry } from "@/engine/core/database";
import { parseStringsList } from "@/engine/core/ini";
import { SIMULATION_LTX, simulationConfig } from "@/engine/core/managers/simulation/SimulationConfig";
import { getSimulationTerrains } from "@/engine/core/managers/simulation/utils/simulation_data";
import { createSimulationSquad } from "@/engine/core/managers/simulation/utils/simulation_squads";
import { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import { LuaLogger } from "@/engine/core/utils/logging";

const simulationLogger: LuaLogger = new LuaLogger($filename, { file: "simulation" });

/**
 * Initialize game squads on game start, spawn all pre-defined squads.
 * Easy way to init squads is to use `start_position_%level_name%` section in simulation ltx file.
 * Squads are defined as sections for each level and enter assigned smart terrains.
 */
export function initializeDefaultSimulationSquads(): void {
  if (simulationConfig.IS_SIMULATION_INITIALIZED) {
    return;
  } else {
    simulationConfig.IS_SIMULATION_INITIALIZED = true;
  }

  simulationLogger.info("Spawn default simulation squads");

  for (const serverLevel of game_graph().levels()) {
    const levelSectionName: TSection = `start_position_${registry.simulator.level_name(serverLevel.id)}`;

    // No definitions for the level, the next levels may still have them.
    if (!SIMULATION_LTX.section_exist(levelSectionName)) {
      continue;
    }

    const levelSquadsCount: TCount = SIMULATION_LTX.line_count(levelSectionName);
    const terrains: LuaTable<TName, SmartTerrain> = getSimulationTerrains();

    for (const it of $range(0, levelSquadsCount - 1)) {
      const [, field, value] = SIMULATION_LTX.r_line(levelSectionName, it, "", "");
      const terrainsNames: LuaArray<TName> = parseStringsList(value);

      for (const [, name] of terrainsNames) {
        const terrain: Nillable<SmartTerrain> = terrains.get(name);

        assert(terrain, "Wrong smart name '%s' in start position spawning.", name);

        createSimulationSquad(terrain, field);
      }
    }
  }

  simulationLogger.info("Spawned default simulation squads");
}

/**
 * Reset registry data for simulation storage.
 */
export function destroySimulationData(): void {
  simulationConfig.IS_SIMULATION_INITIALIZED = false;
  simulationConfig.TERRAINS = new LuaTable();
  simulationConfig.TERRAIN_DESCRIPTORS = new LuaTable();
  simulationConfig.SQUADS = new LuaTable();
  simulationConfig.TEMPORARY_ASSIGNED_SQUADS = new LuaTable();
}
