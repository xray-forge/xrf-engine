import { ini_file } from "xray16";
import type { IniFile } from "xray16/alias";
import type { LuaArray, TName, TNumberId } from "xray16/lib";

import { ESimulationTerrainRole, ISmartTerrainDescriptor } from "@/engine/core/managers/simulation/types";
import { initializeLevelSimulationGroupIds } from "@/engine/core/managers/simulation/utils/simulation_ini";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";
import { getTableValuesAsSet } from "@/engine/core/utils/table";

export const SIMULATION_LTX: IniFile = new ini_file("managers\\simulation\\simulation.ltx");
export const GAME_MAPS_SINGLE_LTX: IniFile = new ini_file("game\\game_maps_single.ltx");
export const SIMULATION_OBJECTS_PROPERTIES_LTX: IniFile = new ini_file(
  "managers\\simulation\\simulation_objects_props.ltx"
);

export const simulationConfig = {
  ALIFE_DISTANCE_NEAR: 150,
  ALIFE_DAY_START_HOUR: 6,
  ALIFE_DAY_END_HOUR: 19,
  ALIFE_LATE_NIGHT_HOUR: 21,
  // Priority every valid target starts from, before the squad's behaviour and the distance weigh it.
  TARGET_PRIORITY_BASE: 3,
  // Highest priority targets a squad picks its next one from at random.
  TARGET_CHOICES: 5,
  // Interval between "squad target outranks assigned terrain" full-registry rescans per squad,
  // staggered by squad id. The rescan is the dominant scan trigger; 0 restores per-tick vanilla behavior.
  SQUAD_TARGET_OUTRANK_RECHECK_INTERVAL: 5_000,
  // Global smart-terrain dirty-job reselection budget. Time-scaled to make work independent of FPS.
  SMART_TERRAIN_DIRTY_JOBS_PER_SECOND: 960,
  SMART_TERRAIN_DIRTY_JOBS_PER_FRAME: 16,
  IS_SIMULATION_INITIALIZED: false,
  TERRAINS: new LuaTable<TName, SmartTerrain>(),
  TERRAIN_DESCRIPTORS: new LuaTable<TNumberId, ISmartTerrainDescriptor>(),
  SQUADS: new LuaTable<TNumberId, Squad>(),
  // Squads assigned to smart terrains before initialization of terrains.
  TEMPORARY_ASSIGNED_SQUADS: new LuaTable<TNumberId, LuaArray<Squad>>(),
  /**
   * Unique identifiers to group simulation groups by level.
   */
  GROUP_ID_BY_LEVEL_NAME: initializeLevelSimulationGroupIds(GAME_MAPS_SINGLE_LTX),
  /**
   * Set of valid roles used for simulation terrains.
   * Limiting options and validating configuration of game data.
   */
  VALID_SMART_TERRAINS_SIMULATION_ROLES: getTableValuesAsSet(ESimulationTerrainRole),
};
