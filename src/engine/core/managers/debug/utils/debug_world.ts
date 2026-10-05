import { ServerObject } from "xray16/alias";
import { createVector, LuaArray, MAX_U16, Nillable, TIndex, TLabel, TName } from "xray16/lib";
import { $isNil } from "xray16/macros";

import { getManager, registry } from "@/engine/core/database";
import { EDebugWorldView, IDebugSavedPosition, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { treasureConfig, TreasureManager } from "@/engine/core/managers/treasures";
import { isSmartTerrain, isSquad } from "@/engine/core/utils/class_ids";
import { getGameLevelName, getGameVertexLevelId } from "@/engine/core/utils/position";
import { getServerObjects } from "@/engine/core/utils/registry";

/**
 * @param serverObject - Server object.
 * @returns Name of the level the object is on, `unknown` when it has no game vertex.
 */
function getObjectLevelName(serverObject: ServerObject): TName {
  return serverObject.m_game_vertex_id < MAX_U16
    ? getGameLevelName(getGameVertexLevelId(serverObject.m_game_vertex_id))
    : "unknown";
}

/**
 * @param serverObject - Object of the row.
 * @param label - Row label.
 * @returns Row for the object, placed where it stands.
 */
function createObjectEntry(serverObject: ServerObject, label: TLabel): IDebugWorldEntry {
  return {
    id: serverObject.id,
    savedIndex: null,
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
 * Build the rows of a world tab list, sorted by label.
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

        addEntry(
          entries,
          createObjectEntry(serverObject, `${serverObject.name()} (${getObjectLevelName(serverObject)})`)
        );
      }

      break;
    }

    case EDebugWorldView.STORY_OBJECTS:
      for (const [storyId, id] of registry.storyLink.idBySid) {
        const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

        if (serverObject) {
          addEntry(entries, createObjectEntry(serverObject, `${storyId} (${getObjectLevelName(serverObject)})`));
        }
      }

      break;

    case EDebugWorldView.TREASURES:
      for (const [name, id] of getManager(TreasureManager).treasuresRestrictorByName) {
        const serverObject: Nillable<ServerObject> = registry.simulator.object(id);

        if (serverObject) {
          const isGiven: boolean = treasureConfig.TREASURES.get(name)?.given === true;

          addEntry(
            entries,
            createObjectEntry(serverObject, `${name}${isGiven ? " (given)" : ""} (${getObjectLevelName(serverObject)})`)
          );
        }
      }

      break;

    case EDebugWorldView.POSITIONS:
      for (const index of $range(1, savedPositions.length())) {
        addEntry(entries, createSavedPositionEntry(savedPositions.get(index), index));
      }

      return entries;
  }

  table.sort(entries, (first, second) => first.label < second.label);

  return entries;
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
