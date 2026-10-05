import { level } from "xray16";
import { GameObject, Vector } from "xray16/alias";
import { LuaArray, TCount, TIndex, TLabel, TName } from "xray16/lib";

import { getManager, registry } from "@/engine/core/database";
import { IDebugSavedPosition, IDebugWorldEntry } from "@/engine/core/managers/debug/debug_types";
import { treasureConfig, TreasureManager } from "@/engine/core/managers/treasures";
import { teleportActorToVertex } from "@/engine/core/utils/position";

/**
 * Teleport the actor to a world tab row, jumping level when it is on another one.
 *
 * @param entry - Row to go to.
 * @returns Result message.
 */
export function teleportActorToDebugWorldEntry(entry: IDebugWorldEntry): TLabel {
  return teleportActorToVertex(entry.position, entry.levelVertexId, entry.gameVertexId)
    ? `jumping level to ${entry.label}`
    : `teleported to ${entry.label}`;
}

/**
 * Save where the actor stands.
 *
 * @param savedPositions - Positions saved so far.
 * @param name - Name of the position, a numbered one of the level when empty.
 * @returns The position saved, added last to the saved positions.
 */
export function saveDebugPosition(savedPositions: LuaArray<IDebugSavedPosition>, name: TName): IDebugSavedPosition {
  const actor: GameObject = registry.actor;
  const position: Vector = actor.position();
  const saved: IDebugSavedPosition = {
    name: name === "" ? `${level.name()} ${savedPositions.length() + 1}` : name,
    level: level.name(),
    x: position.x,
    y: position.y,
    z: position.z,
    levelVertexId: actor.level_vertex_id(),
    gameVertexId: actor.game_vertex_id(),
  };

  savedPositions.set(savedPositions.length() + 1, saved);

  return saved;
}

/**
 * Forget a saved position.
 *
 * @param savedPositions - Positions saved so far.
 * @param index - Position of the one to forget.
 * @returns Name of the position forgotten.
 */
export function deleteDebugPosition(savedPositions: LuaArray<IDebugSavedPosition>, index: TIndex): TName {
  const name: TName = savedPositions.get(index).name;

  table.remove(savedPositions, index);

  return name;
}

/**
 * @returns How many treasures the actor has the coordinates of.
 */
function countGivenTreasures(): TCount {
  let count: TCount = 0;

  for (const [, descriptor] of treasureConfig.TREASURES) {
    if (descriptor.given) {
      count += 1;
    }
  }

  return count;
}

/**
 * @param name - Treasure to give the coordinates of.
 * @returns Result message.
 */
export function giveDebugTreasure(name: TName): TLabel {
  if (treasureConfig.TREASURES.get(name)?.given) {
    return `${name} is already given`;
  }

  getManager(TreasureManager).giveActorTreasureCoordinates(name);

  return `gave the coordinates of ${name}`;
}

/**
 * @returns Result message.
 */
export function giveRandomDebugTreasure(): TLabel {
  const before: TCount = countGivenTreasures();

  getManager(TreasureManager).giveActorRandomTreasureCoordinates();

  return countGivenTreasures() > before ? "gave a random treasure" : "every treasure is given";
}

/**
 * @returns Result message.
 */
export function giveAllDebugTreasures(): TLabel {
  const before: TCount = countGivenTreasures();

  getManager(TreasureManager).giveActorAllTreasureCoordinates();

  return `gave ${countGivenTreasures() - before} treasures`;
}
