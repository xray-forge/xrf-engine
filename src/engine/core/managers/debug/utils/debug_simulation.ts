import { level } from "xray16";
import { LuaArray, Nillable, TCount, TLabel, TName, TNumberId } from "xray16/lib";

import {
  EDebugSimulationView,
  IDebugSimulationEntry,
  IDebugSimulationRecord,
} from "@/engine/core/managers/debug/debug_types";
import { describeDebugRates, getDebugObjectLevelName } from "@/engine/core/managers/debug/utils/debug_inspect";
import { sortDebugEntriesByLevel } from "@/engine/core/managers/debug/utils/debug_search";
import {
  getSimulationSquads,
  getSimulationTerrainAssignedSquadsCount,
  getSimulationTerrainDescriptorById,
  getSimulationTerrains,
} from "@/engine/core/managers/simulation/utils";
import type { SmartTerrain } from "@/engine/core/objects/smart_terrain";
import type { Squad } from "@/engine/core/objects/squad";

/**
 * Squads and terrains of one level, counted for the overview.
 */
interface IDebugSimulationLevelCounts {
  squads: TCount;
  terrains: TCount;
}

/**
 * @param squad - Simulation squad.
 * @returns Row for the squad.
 */
function createSquadEntry(squad: Squad): IDebugSimulationEntry {
  const levelName: TName = getDebugObjectLevelName(squad);
  const label: TLabel = `${squad.name()} (${squad.faction}, ${levelName})`;

  return { id: squad.id, level: levelName, serial: null, label, search: string.lower(label) };
}

/**
 * @param terrain - Simulation smart terrain.
 * @returns Row for the terrain, with its population against its capacity, searchable by its properties.
 */
function createTerrainEntry(terrain: SmartTerrain): IDebugSimulationEntry {
  const levelName: TName = getDebugObjectLevelName(terrain);
  const label: TLabel = string.format(
    "%s %d/%d (%s)",
    terrain.name(),
    getSimulationTerrainAssignedSquadsCount(terrain.id),
    terrain.maxStayingSquadsCount,
    levelName
  );

  return {
    id: terrain.id,
    level: levelName,
    serial: null,
    label,
    search: string.lower(`${label} ${describeDebugRates(terrain.simulationProperties)}`),
  };
}

/**
 * @param counts - Counts by level name.
 * @param levelName - Level name.
 * @returns Counts of the level, added when missing.
 */
function getLevelCounts(
  counts: LuaTable<TName, IDebugSimulationLevelCounts>,
  levelName: TName
): IDebugSimulationLevelCounts {
  if (!counts.has(levelName)) {
    counts.set(levelName, { squads: 0, terrains: 0 });
  }

  return counts.get(levelName);
}

/**
 * @returns A row per level of the simulation, with its squads and terrains counted.
 */
function createLevelEntries(): LuaArray<IDebugSimulationEntry> {
  const entries: LuaArray<IDebugSimulationEntry> = new LuaTable();
  const counts: LuaTable<TName, IDebugSimulationLevelCounts> = new LuaTable();

  for (const [, squad] of getSimulationSquads()) {
    getLevelCounts(counts, getDebugObjectLevelName(squad)).squads += 1;
  }

  for (const [, terrain] of getSimulationTerrains()) {
    getLevelCounts(counts, getDebugObjectLevelName(terrain)).terrains += 1;
  }

  for (const [levelName, it] of counts) {
    const label: TLabel = string.format("%s: %d squads, %d terrains", levelName, it.squads, it.terrains);

    table.insert(entries, { id: null, level: levelName, serial: null, label, search: string.lower(label) });
  }

  return entries;
}

/**
 * @param records - Recorded events, newest first.
 * @returns A row per event, in the same order.
 */
function createRecordEntries(records: LuaArray<IDebugSimulationRecord>): LuaArray<IDebugSimulationEntry> {
  const entries: LuaArray<IDebugSimulationEntry> = new LuaTable();

  for (const [, record] of records) {
    const label: TLabel = `${record.time}  ${record.name} ${record.text}`;

    table.insert(entries, {
      id: record.id,
      level: record.level,
      serial: record.serial,
      label,
      search: string.lower(`${label} ${record.level}`),
    });
  }

  return entries;
}

/**
 * Build the rows of a simulation tab list: the loaded level's first, then by label, and events newest first.
 *
 * @param view - List to build.
 * @param records - Recorded events, newest first.
 * @returns Rows of the list.
 */
export function buildDebugSimulationEntries(
  view: EDebugSimulationView,
  records: LuaArray<IDebugSimulationRecord>
): LuaArray<IDebugSimulationEntry> {
  let entries: LuaArray<IDebugSimulationEntry> = new LuaTable();

  switch (view) {
    case EDebugSimulationView.SQUADS:
      for (const [, squad] of getSimulationSquads()) {
        table.insert(entries, createSquadEntry(squad));
      }

      break;

    case EDebugSimulationView.TERRAINS:
      for (const [, terrain] of getSimulationTerrains()) {
        table.insert(entries, createTerrainEntry(terrain));
      }

      break;

    case EDebugSimulationView.OVERVIEW:
      entries = createLevelEntries();

      break;

    case EDebugSimulationView.EVENTS:
      return createRecordEntries(records);
  }

  return sortDebugEntriesByLevel(entries, level.name());
}

/**
 * @param id - Simulation squad id.
 * @returns The squad, `null` when the id is not one.
 */
export function getDebugSimulationSquad(id: TNumberId): Nillable<Squad> {
  return getSimulationSquads().get(id);
}

/**
 * @param id - Simulation smart terrain id.
 * @returns The terrain, `null` when the id is not one.
 */
export function getDebugSimulationTerrain(id: TNumberId): Nillable<SmartTerrain> {
  return getSimulationTerrainDescriptorById(id)?.terrain;
}
