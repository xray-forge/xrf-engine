import { level } from "xray16";
import { ServerObject } from "xray16/alias";
import { createVector, LuaArray, Nillable, TIndex, TLabel, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { EDebugWorldView, IDebugSavedPosition, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { getDebugObjectLevelName } from "@/engine/core/managers/debug/utils/debug_inspect";
import { sortDebugEntriesByLevel } from "@/engine/core/managers/debug/utils/debug_search";
import { treasureConfig, TreasureManager } from "@/engine/core/managers/treasures";
import { isSmartTerrain, isSquad } from "@/engine/core/utils/class_ids";
import { getServerObjects } from "@/engine/core/utils/registry";

/**
 * @param serverObject - Object of the row.
 * @param name - What the row calls the object, its level added after it.
 * @returns Row for the object, placed where it stands.
 */
function createObjectEntry(serverObject: ServerObject, name: TLabel): IDebugWorldEntry {
  const levelName: TName = getDebugObjectLevelName(serverObject);
  const label: TLabel = `${name} (${levelName})`;

  return {
    id: serverObject.id,
    savedIndex: null,
    level: levelName,
    label,
    search: string.lower(label),
    position: serverObject.position,
    levelVertexId: serverObject.m_level_vertex_id,
    gameVertexId: serverObject.m_game_vertex_id,
  };
}

/**
 * @param saved - Saved position.
 * @param index - Its position among the saved ones.
 * @returns Row for the saved position.
 */
function createSavedPositionEntry(saved: IDebugSavedPosition, index: TIndex): IDebugWorldEntry {
  const label: TLabel = `${saved.name} (${saved.level})`;

  return {
    id: null,
    savedIndex: index,
    level: saved.level,
    label,
    search: string.lower(label),
    position: createVector(saved.x, saved.y, saved.z),
    levelVertexId: saved.levelVertexId,
    gameVertexId: saved.gameVertexId,
  };
}

/**
 * @param entries - Rows to add to.
 * @param entry - Row to add last.
 */
function addEntry(entries: LuaArray<IDebugWorldEntry>, entry: IDebugWorldEntry): void {
  entries.set(entries.length() + 1, entry);
}

/**
 * Build the rows of a world tab list: the loaded level's first, then by label. Saved positions keep the order they
 * were saved in.
 *
 * @param view - List to build.
 * @param savedPositions - Positions saved in the world tab.
 * @returns Rows of the list.
 */
export function buildDebugWorldEntries(
  view: EDebugWorldView,
  savedPositions: LuaArray<IDebugSavedPosition>
): LuaArray<IDebugWorldEntry> {
  const entries: LuaArray<IDebugWorldEntry> = new LuaTable();

  switch (view) {
    case EDebugWorldView.SMART_TERRAINS:
    case EDebugWorldView.SQUADS:
    case EDebugWorldView.OBJECTS: {
      const objects: LuaArray<ServerObject> = getServerObjects((it: ServerObject) =>
        view === EDebugWorldView.SMART_TERRAINS
          ? isSmartTerrain(it)
          : view === EDebugWorldView.SQUADS
            ? isSquad(it)
            : true
      );

      for (const index of $range(1, objects.length())) {
        const serverObject: ServerObject = objects.get(index);

        addEntry(entries, createObjectEntry(serverObject, serverObject.name()));
      }

      break;
    }

    case EDebugWorldView.STORY_OBJECTS:
      for (const [storyId, id] of registry.storyLink.idBySid) {
        const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

        if (serverObject) {
          addEntry(entries, createObjectEntry(serverObject, storyId));
        }
      }

      break;

    case EDebugWorldView.TREASURES:
      for (const [name, id] of getManager(TreasureManager).treasuresRestrictorByName) {
        const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

        if (serverObject) {
          const isGiven: boolean = treasureConfig.TREASURES.get(name)?.given === true;

          addEntry(entries, createObjectEntry(serverObject, isGiven ? `${name} (given)` : name));
        }
      }

      break;

    case EDebugWorldView.POSITIONS:
      for (const index of $range(1, savedPositions.length())) {
        addEntry(entries, createSavedPositionEntry(savedPositions.get(index), index));
      }

      return entries;
  }

  return sortDebugEntriesByLevel(entries, level.name());
}

/**
 * @param entry - Row of a world tab list.
 * @returns Name of the treasure the row stands for, `null` for any other row.
 */
export function getDebugWorldTreasureName(entry: IDebugWorldEntry): Nillable<TName> {
  if ($isNil(entry.id)) {
    return null;
  }

  for (const [name, id] of getManager(TreasureManager).treasuresRestrictorByName) {
    if (id === entry.id) {
      return name;
    }
  }

  return null;
}
